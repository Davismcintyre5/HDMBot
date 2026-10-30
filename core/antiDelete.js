const env = require('../config/env');
const logger = require('../utils/logger');
const jid = require('../utils/jid');
const Message = require('../models/Message');
const cloudinary = require('./cloudinary');
const settings = require('./settings');

const recentDeletes = new Map();
const DEDUP_WINDOW_MS = 30_000;
const DEDUP_MAX = 500;
const MEDIA_TYPES = new Set(['image', 'video', 'audio', 'document', 'sticker']);

function wasRecentlyHandled(key) {
  const now = Date.now();

  for (const [id, ts] of recentDeletes) {
    if (now - ts > DEDUP_WINDOW_MS) recentDeletes.delete(id);
    else break;
  }

  if (recentDeletes.has(key)) return true;

  recentDeletes.set(key, now);
  if (recentDeletes.size > DEDUP_MAX) {
    const oldest = recentDeletes.keys().next().value;
    recentDeletes.delete(oldest);
  }
  return false;
}

function buildTargets(sock, excludeChatJid) {
  const nums = new Set();
  for (const raw of [env.OWNER_NUMBER, env.BOT_OWNER_NUMBER]) {
    if (raw && /^\d{10,15}$/.test(raw)) nums.add(raw);
  }
  const selfNum = jid.fromJid(sock.user?.id || '');
  if (selfNum) nums.add(selfNum);

  const targets = [];
  for (const n of nums) {
    const target = `${n}@s.whatsapp.net`;
    if (target !== excludeChatJid) targets.push(target);
  }
  return targets;
}

function senderDisplay(doc) {
  return jid.fromJid(doc.senderJid) || doc.senderJid;
}

function chatDisplay(doc) {
  if (jid.isGroupJid(doc.chatJid)) {
    const num = jid.fromJid(doc.chatJid);
    return `Group ${num || doc.chatJid}`;
  }
  const num = jid.fromJid(doc.chatJid);
  return num || doc.chatJid;
}

function hasUsableMedia(doc) {
  if (!doc || !doc.media) return false;
  if (doc.media.cloudinaryUrl) return true;
  if (!MEDIA_TYPES.has(doc.type)) return false;
  if (!doc.media.mimetype && !doc.media.fileName && !doc.media.sizeBytes &&
      !doc.media.cloudinaryResourceType) {
    return false;
  }
  return true;
}

async function forwardMedia(buffer, doc, targets, sock) {
  const type = doc.media.cloudinaryResourceType || 'image';
  const caption =
    `🔍 *DELETED ${String(doc.type).toUpperCase()}*\n\n` +
    `💬 *Chat:* ${chatDisplay(doc)}\n` +
    `📤 *From:* @${senderDisplay(doc)}\n` +
    `📝 *Caption:* ${doc.text || '(none)'}\n\n` +
    `_Forwarded by HDM BOT_`;

  const mentions = [doc.senderJid];

  const payloads = {
    image: { image: buffer, caption, mentions },
    video: { video: buffer, caption, mentions },
    raw: {
      document: buffer,
      fileName: doc.media.fileName || 'file',
      mimetype: doc.media.mimetype || 'application/octet-stream',
      caption,
      mentions
    }
  };

  if (doc.type === 'sticker') {
    await Promise.all(
      targets.map((t) => sock.sendMessage(t, { sticker: buffer }).catch(() => {}))
    );
    return;
  }
  if (doc.type === 'audio') {
    const mimetype = doc.media.mimetype || 'audio/mp4';
    await Promise.all(
      targets.map((t) =>
        sock.sendMessage(t, { audio: buffer, mimetype, mentions }).catch(() => {})
      )
    );
    return;
  }

  const base = payloads[type] || payloads.raw;
  await Promise.all(targets.map((t) => sock.sendMessage(t, base).catch(() => {})));
}

async function forwardText(text, doc, targets, sock) {
  const body =
    `🔍 *DELETED MESSAGE*\n\n` +
    `💬 *Chat:* ${chatDisplay(doc)}\n` +
    `📤 *From:* @${senderDisplay(doc)}\n` +
    `📝 *Message:* ${text}\n\n` +
    `_Forwarded by HDM BOT_`;

  await Promise.all(
    targets.map((t) =>
      sock.sendMessage(t, { text: body, mentions: [doc.senderJid] }).catch(() => {})
    )
  );
}

async function handle(sessionId, sock, revokeInfo) {
  try {
    const enabled = await settings.getOrDefault(sessionId, 'anti_delete');
    if (!enabled) return;

    const { chatJid, msgId } = revokeInfo;

    if (wasRecentlyHandled(`${sessionId}::${msgId}`)) {
      logger.debug({ sessionId, msgId }, 'anti-delete: duplicate revoke, skipping');
      return;
    }

    const doc = await Message.findOne({ sessionId, msgId }).lean();
    if (!doc) {
      logger.debug({ sessionId, msgId }, 'anti-delete miss: message not in cache');
      return;
    }

    const targets = buildTargets(sock, chatJid);
    if (targets.length === 0) {
      logger.warn({ sessionId, msgId }, 'anti-delete: no valid forward targets');
      return;
    }

    let recovered = false;
    const usableMedia = hasUsableMedia(doc);

    if (usableMedia && doc.media && doc.media.cloudinaryUrl) {
      try {
        const buffer = await cloudinary.fetchBuffer(doc.media.cloudinaryUrl);
        await forwardMedia(buffer, doc, targets, sock);
        recovered = true;
      } catch (err) {
        logger.warn({ err, msgId }, 'cloudinary fetch failed');
      }
    }

    if (!recovered && usableMedia) {
      try {
        const buffer = await sock.downloadMediaMessage({
          key: doc.rawKey,
          message: doc.rawMessage || {}
        });
        if (buffer) {
          await forwardMedia(buffer, doc, targets, sock);
          recovered = true;
        }
      } catch (err) {
        logger.warn({ err, msgId }, 'live download fallback failed');
      }
    }

    if (!recovered && doc.text) {
      try {
        await forwardText(doc.text, doc, targets, sock);
        recovered = true;
      } catch (err) {
        logger.warn({ err, msgId }, 'text forward failed');
      }
    }

    if (!recovered) {
      const typeLabel = doc.type || 'unknown';
      const fallback =
        `🔍 *DELETED MESSAGE*\n\n` +
        `💬 *Chat:* ${chatDisplay(doc)}\n` +
        `📤 *From:* @${senderDisplay(doc)}\n` +
        `📝 *Content:* [${typeLabel} — not recoverable]\n` +
        `🕒 *Sent:* ${new Date(doc.timestamp).toLocaleString()}\n\n` +
        `_Forwarded by HDM BOT_`;

      await Promise.all(
        targets.map((t) =>
          sock.sendMessage(t, { text: fallback, mentions: [doc.senderJid] }).catch(() => {})
        )
      );

      logger.debug(
        {
          sessionId,
          msgId,
          type: doc.type,
          hasMedia: !!doc.media,
          mediaKeys: doc.media ? Object.keys(doc.media) : null,
          hasText: !!doc.text
        },
        'anti-delete: no content recovered'
      );
    }
  } catch (err) {
    logger.error({ err, sessionId }, 'anti-delete handle failed');
  }
}

module.exports = { handle, buildTargets, hasUsableMedia };
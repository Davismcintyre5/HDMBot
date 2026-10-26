const env = require('../config/env');
const logger = require('../utils/logger');
const jid = require('../utils/jid');
const Message = require('../models/Message');
const cloudinary = require('./cloudinary');
const settings = require('./settings');

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
  await Promise.all(
    targets.map((t) => sock.sendMessage(t, base).catch(() => {}))
  );
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

    if (doc.media && doc.media.cloudinaryUrl) {
      try {
        const buffer = await cloudinary.fetchBuffer(doc.media.cloudinaryUrl);
        await forwardMedia(buffer, doc, targets, sock);
        recovered = true;
      } catch (err) {
        logger.warn({ err, msgId }, 'cloudinary fetch failed');
      }
    } else if (doc.media) {
      try {
        const buffer = await sock.downloadMediaMessage({ key: doc.rawKey, message: {} });
        if (buffer) {
          await forwardMedia(buffer, doc, targets, sock);
          recovered = true;
        }
      } catch (err) {
        logger.warn({ err, msgId }, 'live download fallback failed');
      }
    } else if (doc.text) {
      await forwardText(doc.text, doc, targets, sock);
      recovered = true;
    }

    if (!recovered) {
      const fallback =
        `🔍 *DELETED MESSAGE*\n\n` +
        `💬 *Chat:* ${chatDisplay(doc)}\n` +
        `📤 *From:* @${senderDisplay(doc)}\n` +
        `📝 *Content:* [${doc.type} — could not recover]\n\n` +
        `_Forwarded by HDM BOT_`;

      await Promise.all(
        targets.map((t) =>
          sock.sendMessage(t, { text: fallback, mentions: [doc.senderJid] }).catch(() => {})
        )
      );
      logger.debug({ sessionId, msgId }, 'anti-delete: no content recovered');
    }
  } catch (err) {
    logger.error({ err, sessionId }, 'anti-delete handle failed');
  }
}

module.exports = { handle, buildTargets };
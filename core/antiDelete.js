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

async function forwardMedia(buffer, doc, targets, sock) {
  const type = doc.media.cloudinaryResourceType || 'image';
  const caption = doc.text || '';
  const payloads = {
    image: { image: buffer, caption },
    video: { video: buffer, caption },
    raw: { document: buffer, fileName: doc.media.fileName || 'file', mimetype: doc.media.mimetype || 'application/octet-stream' }
  };
  const base = payloads[type] || { document: buffer, fileName: 'file', mimetype: 'application/octet-stream' };

  if (doc.type === 'sticker') {
    await Promise.all(targets.map((t) => sock.sendMessage(t, { sticker: buffer }).catch(() => {})));
    return;
  }
  if (doc.type === 'audio') {
    const mimetype = doc.media.mimetype || 'audio/mp4';
    await Promise.all(targets.map((t) => sock.sendMessage(t, { audio: buffer, mimetype }).catch(() => {})));
    return;
  }
  await Promise.all(targets.map((t) => sock.sendMessage(t, base).catch(() => {})));
}

async function forwardText(text, doc, targets, sock) {
  const body = `🔍 *DELETED MESSAGE*\n\n💬 Chat: ${doc.chatJid}\n📤 From: @${senderDisplay(doc)}\n📝 ${text}\n\n_Forwarded by HDM BOT_`;
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

    const notice = `🛡️ *ANTI-DELETE*\n📤 From: @${senderDisplay(doc)}\n${doc.text ? `📝 ${doc.text}` : `_${doc.type} deleted_`}`;
    await sock
      .sendMessage(chatJid, { text: notice, mentions: [doc.senderJid] })
      .catch(() => {});

    if (!recovered) {
      logger.debug({ sessionId, msgId }, 'anti-delete: no content recovered');
    }
  } catch (err) {
    logger.error({ err, sessionId }, 'anti-delete handle failed');
  }
}

module.exports = { handle, buildTargets };
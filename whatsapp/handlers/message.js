const logger = require('../../utils/logger');
const mediaType = require('../../utils/mediaType');
const jid = require('../../utils/jid');
const state = require('../state');
const messageLogger = require('./messageLogger');
const commandRouter = require('../../core/commandRouter');
const ruleEngine = require('../../core/ruleEngine');
const antiDelete = require('../../core/antiDelete');
const settings = require('../../core/settings');
const cloudinary = require('../../core/cloudinary');
const env = require('../../config/env');

const WRAPPERS = [
  'ephemeralMessage',
  'viewOnceMessage',
  'viewOnceMessageV2',
  'viewOnceMessageV2Extension',
  'documentWithCaptionMessage',
  'editedMessage',
  'deviceSentMessage'
];

function unwrap(msg) {
  let current = msg.message;
  const wrappers = [];
  let isViewOnce = false;
  let depth = 0;

  while (current && depth < 5) {
    let found = false;
    for (const key of WRAPPERS) {
      if (current[key] && current[key].message) {
        wrappers.push(key);
        if (key.startsWith('viewOnce')) isViewOnce = true;
        current = current[key].message;
        found = true;
        break;
      }
    }
    if (!found) break;
    depth += 1;
  }

  if (!current) return { msg: null, wrappers, isViewOnce };
  return { msg: { ...msg, message: current }, wrappers, isViewOnce };
}

function isRevoke(msg) {
  return !!(msg.message && msg.message.protocolMessage && msg.message.protocolMessage.type === 0);
}

async function uploadMedia(sessionId, msgId, flattened, classification) {
  try {
    if (!env.CLOUDINARY_ENABLED) return;
    const resourceType = mediaType.cloudinaryType(classification.type);
    if (!resourceType) return;

    const buffer = await downloadBuffer(flattened);
    if (!buffer) return;
    if (buffer.length > env.MEDIA_MAX_UPLOAD_BYTES) {
      logger.warn({ sessionId, msgId, size: buffer.length }, 'media too large, skip upload');
      return;
    }

    const uploaded = await cloudinary.upload(buffer, {
      sessionId,
      msgId,
      resourceType
    });
    if (uploaded) {
      await messageLogger.updateMedia(sessionId, msgId, uploaded);
    }
  } catch (err) {
    logger.warn({ err, sessionId, msgId }, 'media upload failed');
  }
}

async function downloadBuffer(flattened) {
  const { downloadMediaMessage } = require('@whiskeysockets/baileys');
  const attempts = env.MEDIA_DOWNLOAD_RETRIES + 1;
  for (let i = 0; i < attempts; i++) {
    try {
      const buffer = await downloadMediaMessage(flattened, 'buffer', {}, {
        logger: require('pino')({ level: 'silent' }),
        reuploadRequest: null
      });
      return buffer;
    } catch (err) {
      if (i === attempts - 1) throw err;
      await new Promise((r) => setTimeout(r, env.MEDIA_DOWNLOAD_RETRY_DELAY_MS));
    }
  }
  return null;
}

function extractExtras(flattened, wrappers, isViewOnce) {
  const m = flattened.message || {};
  let text = null;
  let mimetype = null;
  let fileName = null;
  let sizeBytes = null;

  if (m.conversation) text = m.conversation;
  else if (m.extendedTextMessage) text = m.extendedTextMessage.text || null;
  else if (m.imageMessage) {
    text = m.imageMessage.caption || null;
    mimetype = m.imageMessage.mimetype;
    sizeBytes = m.imageMessage.fileLength ? Number(m.imageMessage.fileLength) : null;
  } else if (m.videoMessage) {
    text = m.videoMessage.caption || null;
    mimetype = m.videoMessage.mimetype;
    sizeBytes = m.videoMessage.fileLength ? Number(m.videoMessage.fileLength) : null;
  } else if (m.documentMessage) {
    text = m.documentMessage.caption || null;
    mimetype = m.documentMessage.mimetype;
    fileName = m.documentMessage.fileName;
    sizeBytes = m.documentMessage.fileLength ? Number(m.documentMessage.fileLength) : null;
  } else if (m.audioMessage) {
    mimetype = m.audioMessage.mimetype;
    sizeBytes = m.audioMessage.fileLength ? Number(m.audioMessage.fileLength) : null;
  } else if (m.stickerMessage) {
    mimetype = m.stickerMessage.mimetype;
  }

  const senderJid = flattened.key.participant || flattened.key.remoteJid;
  const tsRaw = flattened.messageTimestamp;
  const timestamp = tsRaw
    ? new Date((typeof tsRaw === 'object' ? tsRaw.toNumber() : Number(tsRaw)) * 1000)
    : new Date();

  return { text, mimetype, fileName, sizeBytes, senderJid, timestamp, wrappers, isViewOnce };
}

async function handle(sessionId, sock, messages) {
  for (const msg of messages) {
    try {
      if (!msg.message) continue;
      const key = Object.keys(msg.message)[0];
      if (key === 'senderKeyDistributionMessage') continue;

      if (isRevoke(msg)) {
        const revoke = msg.message.protocolMessage;
        await antiDelete.handle(sessionId, sock, {
          chatJid: msg.key.remoteJid,
          msgId: revoke.key.id
        });
        continue;
      }

      const { msg: flattened, wrappers, isViewOnce } = unwrap(msg);
      if (!flattened) continue;

      const msgId = flattened.key.id;
      if (state.hasDedup(sessionId, msgId)) continue;

      const classification = mediaType.classify(flattened, { isViewOnce });
      const extras = extractExtras(flattened, wrappers, isViewOnce);

      const { doc, deduped } = await messageLogger.log(sessionId, flattened, classification, extras);
      if (deduped) {
        state.addDedup(sessionId, msgId);
        continue;
      }

      state.addDedup(sessionId, msgId);
      state.cacheMessage(sessionId, flattened.key.remoteJid, {
        msgId,
        msg: flattened,
        senderJid: extras.senderJid,
        timestamp: Date.now()
      });

      if (mediaType.requiresDownload(classification.type) && doc) {
        uploadMedia(sessionId, msgId, flattened, classification).catch(() => {});
      }

      const stop = await ruleEngine.evaluate(sessionId, sock, flattened, extras.text);
      if (stop && stop.stopped) continue;

      await commandRouter.dispatch(sessionId, sock, flattened);
    } catch (err) {
      logger.error({ err, sessionId }, 'message.handle failed');
    }
  }
}

async function handleUpdate(sessionId, sock, updates) {
  for (const update of updates) {
    try {
      const stub = update.update?.messageStubType;
      if (stub !== 1) continue;
      const chatJid = update.key.remoteJid;
      const msgId = update.key.id;
      await antiDelete.handle(sessionId, sock, { chatJid, msgId });
    } catch (err) {
      logger.warn({ err, sessionId }, 'handleUpdate failed');
    }
  }
}

async function handleGroupUpdate(sessionId, sock, update) {
  try {
    const { id: groupJid, participants, action } = update;
    if (action === 'add') {
      const template = await settings.getOrDefault(sessionId, `welcome.${groupJid}`);
      if (!template) return;
      const meta = await state.getGroupMeta(sock, groupJid);
      const groupName = (meta && meta.subject) || '';
      const groupDesc = (meta && meta.desc) || '';
      for (const participant of participants) {
        const text = String(template)
          .replace(/@user/g, jid.mentionOf(participant))
          .replace(/{groupName}/g, groupName)
          .replace(/{groupDesc}/g, groupDesc);
        await sock.sendMessage(groupJid, { text, mentions: [participant] }).catch(() => {});
      }
    } else if (action === 'remove') {
      const template = await settings.getOrDefault(sessionId, `goodbye.${groupJid}`);
      if (!template) return;
      for (const participant of participants) {
        const text = String(template).replace(/@user/g, jid.mentionOf(participant));
        await sock.sendMessage(groupJid, { text }).catch(() => {});
      }
    }
  } catch (err) {
    logger.warn({ err, sessionId }, 'handleGroupUpdate failed');
  }
}

module.exports = { handle, handleUpdate, handleGroupUpdate, unwrap };
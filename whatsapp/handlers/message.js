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

const STATUS_JID = 'status@broadcast';

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
  return !!(
    msg.message &&
    msg.message.protocolMessage &&
    msg.message.protocolMessage.type === 0
  );
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

  if (m.conversation) {
    text = m.conversation;
  } else if (m.extendedTextMessage) {
    text = m.extendedTextMessage.text || null;
  } else if (m.imageMessage) {
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
  } else if (m.buttonsResponseMessage) {
    text = m.buttonsResponseMessage.selectedButtonId || m.buttonsResponseMessage.selectedDisplayText || null;
  } else if (m.templateButtonReplyMessage) {
    text = m.templateButtonReplyMessage.selectedId || m.templateButtonReplyMessage.selectedDisplayText || null;
  } else if (m.listResponseMessage) {
    text = m.listResponseMessage.singleSelectReply?.selectedRowId || m.listResponseMessage.title || null;
  } else if (m.reactionMessage) {
    text = `[reaction: ${m.reactionMessage.text || ''}]`;
  } else if (m.pollCreationMessage) {
    text = `[poll: ${m.pollCreationMessage.name || ''}]`;
  } else if (m.pollCreationMessageV3) {
    text = `[poll: ${m.pollCreationMessageV3.name || ''}]`;
  } else if (m.pollUpdateMessage) {
    text = '[poll vote]';
  } else if (m.locationMessage) {
    text = `[location: ${m.locationMessage.degreesLatitude}, ${m.locationMessage.degreesLongitude}]`;
  } else if (m.liveLocationMessage) {
    text = '[live location]';
  } else if (m.contactMessage) {
    text = `[contact: ${m.contactMessage.displayName || ''}]`;
  } else if (m.contactsArrayMessage) {
    text = `[contacts: ${m.contactsArrayMessage.contacts?.length || 0}]`;
  } else if (m.protocolMessage) {
    text = '[protocol message]';
  } else if (m.editedMessage) {
    const inner = m.editedMessage.message || {};
    text = inner.conversation || inner.extendedTextMessage?.text || '[edited message]';
  } else if (m.ptvMessage) {
    text = '[video note]';
  } else if (m.eventMessage) {
    text = `[event: ${m.eventMessage.name || ''}]`;
  }

  const senderJid = flattened.key.participant || flattened.key.remoteJid;
  const tsRaw = flattened.messageTimestamp;
  const timestamp = tsRaw
    ? new Date((typeof tsRaw === 'object' ? tsRaw.toNumber() : Number(tsRaw)) * 1000)
    : new Date();

  return { text, mimetype, fileName, sizeBytes, senderJid, timestamp, wrappers, isViewOnce };
}

async function handleStatus(sessionId, sock, msg) {
  if (msg.key.fromMe) return;

  try {
    const participant = msg.key.participant || msg.participant;
    if (!participant) return;

    const participantNum = jid.fromJid(participant);
    const sessionNum = jid.fromJid(sock.user?.id || '');
    if (!participantNum || participantNum === sessionNum) return;

    const autoview = await settings.getOrDefault(sessionId, 'autoview_status');
    const autoreact = await settings.getOrDefault(sessionId, 'autoreact_status');
    const reaction = await settings.getOrDefault(sessionId, 'status_reaction');

    if (autoview) {
      try {
        await sock.readMessages([msg.key]);
        logger.debug({ sessionId, from: participantNum }, 'status viewed');
      } catch (err) {
        logger.warn({ err, sessionId, from: participantNum }, 'status view failed');
      }
    }

    if (autoreact && reaction) {
      try {
        await sock.sendMessage(
          STATUS_JID,
          { react: { text: reaction, key: msg.key } },
          { statusJidList: [participant] }
        );
        logger.debug({ sessionId, from: participantNum, reaction }, 'status reacted');
      } catch (err) {
        logger.warn({ err, sessionId, from: participantNum }, 'status react failed');
      }
    }
  } catch (err) {
    logger.error({ err, sessionId }, 'handleStatus failed');
  }
}

function buildViewOnceTargets(sock, excludeChatJid) {
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

async function autoForwardViewOnce(sessionId, sock, flattened, isViewOnce) {
  if (!isViewOnce) return false;

  try {
    if (flattened.key.fromMe) return false;

    const content = flattened.message;
    const type = Object.keys(content || {})[0];

    if (!['imageMessage', 'videoMessage', 'audioMessage'].includes(type)) {
      return false;
    }

    const senderJid = flattened.key.participant || flattened.key.remoteJid;
    const senderNum = jid.fromJid(senderJid);
    const chatJid = flattened.key.remoteJid;
    const isGroup = jid.isGroupJid(chatJid);

    const targets = buildViewOnceTargets(sock, chatJid);
    if (targets.length === 0) return false;

    const { downloadMediaMessage } = require('@whiskeysockets/baileys');
    const pino = require('pino');

    let buffer;
    try {
      buffer = await downloadMediaMessage(flattened, 'buffer', {}, {
        logger: pino({ level: 'silent' }),
        reuploadRequest: sock.updateMediaMessage
      });
    } catch (err) {
      logger.warn({ err, sessionId, senderNum }, 'view-once auto-forward: download failed');
      return false;
    }

    if (!buffer) return false;

    const caption =
      `👁️ *VIEW-ONCE*\n\n` +
      `📤 From: @${senderNum || 'unknown'}\n` +
      `💬 Chat: ${isGroup ? chatJid : senderNum || chatJid}\n` +
      `🕒 ${new Date().toLocaleString()}`;

    const mentions = senderJid ? [senderJid] : [];

    for (const target of targets) {
      try {
        if (type === 'imageMessage') {
          await sock.sendMessage(target, { image: buffer, caption, mentions });
        } else if (type === 'videoMessage') {
          await sock.sendMessage(target, { video: buffer, caption, mentions });
        } else {
          await sock.sendMessage(target, { audio: buffer, mimetype: 'audio/mp4', ptt: true });
        }
      } catch (err) {
        logger.warn({ err, target, sessionId }, 'view-once forward: send failed');
      }
    }

    logger.debug({ sessionId, senderNum, type, targets }, 'view-once auto-forwarded');
    return true;
  } catch (err) {
    logger.warn({ err, sessionId }, 'autoForwardViewOnce failed');
    return false;
  }
}

async function handle(sessionId, sock, messages) {
  for (const msg of messages) {
    try {
      if (!msg.key || !msg.key.remoteJid) continue;

      if (msg.key.remoteJid === STATUS_JID) {
        await handleStatus(sessionId, sock, msg);
        continue;
      }

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

      if (isViewOnce) {
        autoForwardViewOnce(sessionId, sock, flattened, isViewOnce).catch(() => {});
      }

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
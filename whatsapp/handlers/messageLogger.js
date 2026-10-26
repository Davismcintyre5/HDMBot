const logger = require('../../utils/logger');
const socket = require('../../config/socket');
const Message = require('../../models/Message');

async function log(sessionId, flattened, classification, extras) {
  const { type, isViewOnce } = classification;
  const rawKey = {
    remoteJid: flattened.key.remoteJid,
    fromMe: !!flattened.key.fromMe,
    id: flattened.key.id,
    participant: flattened.key.participant || null
  };

  const doc = {
    sessionId,
    msgId: flattened.key.id,
    chatJid: flattened.key.remoteJid,
    senderJid: extras.senderJid,
    fromMe: !!flattened.key.fromMe,
    timestamp: extras.timestamp || new Date(),
    type,
    text: extras.text || null,
    media: {
      cloudinaryUrl: null,
      cloudinaryPublicId: null,
      cloudinaryResourceType: null,
      mimetype: extras.mimetype || null,
      fileName: extras.fileName || null,
      sizeBytes: extras.sizeBytes || null
    },
    wrappers: extras.wrappers || [],
    rawKey
  };

  try {
    const created = await Message.create(doc);

    socket.emitNewMessage({
      sessionId,
      msgId: doc.msgId,
      chatJid: doc.chatJid,
      senderJid: doc.senderJid,
      type: doc.type,
      text: doc.text,
      timestamp: doc.timestamp
    });

    return { doc: created, deduped: false };
  } catch (err) {
    if (err.code === 11000) {
      return { doc: null, deduped: true };
    }
    logger.error({ err, sessionId, msgId: doc.msgId }, 'messageLogger.log failed');
    return { doc: null, deduped: false, error: err };
  }
}

async function updateMedia(sessionId, msgId, media) {
  try {
    await Message.updateOne(
      { sessionId, msgId },
      {
        $set: {
          'media.cloudinaryUrl': media.url || null,
          'media.cloudinaryPublicId': media.publicId || null,
          'media.cloudinaryResourceType': media.resourceType || null
        }
      }
    );
  } catch (err) {
    logger.warn({ err, sessionId, msgId }, 'messageLogger.updateMedia failed');
  }
}

module.exports = { log, updateMedia };
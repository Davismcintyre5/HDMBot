const MSG_TYPE = Object.freeze({
  TEXT: 'text',
  IMAGE: 'image',
  VIDEO: 'video',
  STICKER: 'sticker',
  AUDIO: 'audio',
  DOCUMENT: 'document',
  CONTACT: 'contact',
  LOCATION: 'location',
  VIEW_ONCE: 'viewOnce'
});

const CLOUDINARY_RESOURCE_TYPE = Object.freeze({
  [MSG_TYPE.IMAGE]: 'image',
  [MSG_TYPE.STICKER]: 'image',
  [MSG_TYPE.VIDEO]: 'video',
  [MSG_TYPE.AUDIO]: 'video',
  [MSG_TYPE.DOCUMENT]: 'raw'
});

const DOWNLOAD_TYPES = new Set([
  MSG_TYPE.IMAGE,
  MSG_TYPE.VIDEO,
  MSG_TYPE.STICKER,
  MSG_TYPE.AUDIO,
  MSG_TYPE.DOCUMENT,
  MSG_TYPE.VIEW_ONCE
]);

function classify(msg, opts = {}) {
  const isViewOnce = !!opts.isViewOnce;
  if (isViewOnce) return { type: MSG_TYPE.VIEW_ONCE, isViewOnce: true };

  if (!msg || !msg.message) return { type: MSG_TYPE.TEXT, isViewOnce: false };

  const key = Object.keys(msg.message)[0];
  switch (key) {
    case 'conversation':
    case 'extendedTextMessage':
      return { type: MSG_TYPE.TEXT, isViewOnce: false };
    case 'imageMessage':
      return { type: MSG_TYPE.IMAGE, isViewOnce: false };
    case 'videoMessage':
      return { type: MSG_TYPE.VIDEO, isViewOnce: false };
    case 'stickerMessage':
      return { type: MSG_TYPE.STICKER, isViewOnce: false };
    case 'audioMessage':
      return { type: MSG_TYPE.AUDIO, isViewOnce: false };
    case 'documentMessage':
    case 'documentWithCaptionMessage':
      return { type: MSG_TYPE.DOCUMENT, isViewOnce: false };
    case 'contactMessage':
    case 'contactsArrayMessage':
      return { type: MSG_TYPE.CONTACT, isViewOnce: false };
    case 'locationMessage':
      return { type: MSG_TYPE.LOCATION, isViewOnce: false };
    default:
      return { type: MSG_TYPE.TEXT, isViewOnce: false };
  }
}

function cloudinaryType(msgType) {
  return CLOUDINARY_RESOURCE_TYPE[msgType] || null;
}

function requiresDownload(msgType) {
  return DOWNLOAD_TYPES.has(msgType);
}

module.exports = {
  MSG_TYPE,
  CLOUDINARY_RESOURCE_TYPE,
  classify,
  cloudinaryType,
  requiresDownload
};
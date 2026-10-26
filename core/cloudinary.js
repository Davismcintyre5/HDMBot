const axios = require('axios');
const env = require('../config/env');
const logger = require('../utils/logger');
const ApiError = require('../utils/apiError');
const { cloudinary, enabled } = require('../config/cloudinary');
const Message = require('../models/Message');

function upload(buffer, { sessionId, msgId, resourceType }) {
  if (!enabled) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `${env.CLOUDINARY_FOLDER}/${sessionId}`,
        public_id: msgId,
        resource_type: resourceType || 'auto',
        overwrite: true
      },
      (err, result) => {
        if (err) return reject(ApiError.external('Cloudinary', err.message));
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          resourceType: result.resource_type
        });
      }
    );
    stream.end(buffer);
  });
}

async function fetchBuffer(url) {
  const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
  return Buffer.from(res.data);
}

async function destroy(publicId, resourceType) {
  if (!enabled || !publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType || 'image' });
  } catch (err) {
    logger.warn({ err, publicId }, 'cloudinary destroy failed');
  }
}

async function cleanupExpired() {
  if (!enabled) return { destroyed: 0, failed: 0, skipped: 0 };
  const cutoff = new Date(Date.now() - env.ANTICACHE_TTL_HOURS * 3600 * 1000);
  const docs = await Message.find({
    timestamp: { $lt: cutoff },
    'media.cloudinaryPublicId': { $ne: null }
  }).limit(500).lean();

  let destroyed = 0;
  let failed = 0;
  for (const doc of docs) {
    try {
      await cloudinary.uploader.destroy(doc.media.cloudinaryPublicId, {
        resource_type: doc.media.cloudinaryResourceType || 'image'
      });
      await Message.updateOne(
        { _id: doc._id },
        { $set: { 'media.cloudinaryPublicId': null, 'media.cloudinaryUrl': null } }
      );
      destroyed += 1;
    } catch (err) {
      failed += 1;
      logger.warn({ err, msgId: doc.msgId }, 'cloudinary cleanup destroy failed');
    }
  }
  return { destroyed, failed, skipped: docs.length - destroyed - failed };
}

module.exports = { upload, fetchBuffer, destroy, cleanupExpired, isEnabled: () => enabled };
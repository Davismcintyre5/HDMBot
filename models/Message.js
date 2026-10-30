const mongoose = require('mongoose');
const env = require('../config/env');

const MediaSchema = new mongoose.Schema(
  {
    cloudinaryUrl: { type: String, default: null },
    cloudinaryPublicId: { type: String, default: null },
    cloudinaryResourceType: {
      type: String,
      enum: ['image', 'video', 'raw', null],
      default: null
    },
    mimetype: { type: String, default: null },
    fileName: { type: String, default: null },
    sizeBytes: { type: Number, default: null }
  },
  { _id: false }
);

const MessageSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, index: true },
    msgId: { type: String, required: true },
    chatJid: { type: String, required: true },
    senderJid: { type: String, required: true },
    fromMe: { type: Boolean, default: false },
    timestamp: { type: Date, required: true, default: Date.now },
    type: {
      type: String,
      enum: ['text', 'image', 'video', 'sticker', 'audio', 'document', 'contact', 'location', 'viewOnce'],
      required: true
    },
    text: { type: String, default: null },
    media: {
      type: MediaSchema,
      default: undefined
    },
    wrappers: { type: [String], default: [] },
    rawKey: {
      remoteJid: { type: String, required: true },
      fromMe: { type: Boolean, required: true },
      id: { type: String, required: true },
      participant: { type: String, default: null }
    }
  },
  { timestamps: true }
);

MessageSchema.index({ sessionId: 1, msgId: 1 }, { unique: true });
MessageSchema.index({ sessionId: 1, chatJid: 1, timestamp: -1 });
MessageSchema.index({ timestamp: 1 }, { expireAfterSeconds: env.MESSAGE_TTL_HOURS * 3600 });

module.exports = mongoose.models.Message || mongoose.model('Message', MessageSchema);
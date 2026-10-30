const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, trim: true, lowercase: true },
    status: {
      type: String,
      enum: ['active', 'inactive', 'logged_out'],
      default: 'inactive'
    },
    meta: {
      phoneNumber: { type: String, default: '' },
      platform: { type: String, default: 'WhatsApp' },
      botName: { type: String, default: '' },
      lastConnected: { type: Date, default: null },
      lastDisconnected: { type: Date, default: null },
      lastDisconnectReason: { type: String, default: null },
      nextAttemptAt: { type: Date, default: null }
    }
  },
  { timestamps: true }
);

SessionSchema.index({ sessionId: 1 }, { unique: true });
SessionSchema.index({ status: 1 });

SessionSchema.statics.findActive = function findActive() {
  return this.find({ status: 'active' });
};

module.exports = mongoose.models.Session || mongoose.model('Session', SessionSchema);
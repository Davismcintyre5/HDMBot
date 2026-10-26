const mongoose = require('mongoose');

const ContactSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, index: true },
    jid: { type: String, required: true },
    kind: { type: String, enum: ['user', 'group', 'status'], required: true },
    number: { type: String, default: null },
    displayName: { type: String, default: null },
    waName: { type: String, default: null },
    tags: { type: [String], default: [] },
    notes: { type: String, default: null },
    blacklisted: { type: Boolean, default: false },
    whitelisted: { type: Boolean, default: false },
    muted: { type: Boolean, default: false },
    interactedCount: { type: Number, default: 0 },
    lastInteractedAt: { type: Date, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null }
  },
  { timestamps: true }
);

ContactSchema.index({ sessionId: 1, jid: 1 }, { unique: true });
ContactSchema.index({ sessionId: 1, blacklisted: 1 });
ContactSchema.index({ sessionId: 1, tags: 1 });
ContactSchema.index({ sessionId: 1, number: 1 }, { sparse: true });

module.exports = mongoose.models.Contact || mongoose.model('Contact', ContactSchema);
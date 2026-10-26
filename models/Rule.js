const mongoose = require('mongoose');

const RuleSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    enabled: { type: Boolean, default: true },
    priority: { type: Number, default: 100 },
    scope: {
      type: {
        type: String,
        enum: ['global', 'chat', 'group', 'dm'],
        default: 'global',
        required: true
      },
      chatJid: { type: String, default: null },
      senderJids: { type: [String], default: [] },
      senderNotJids: { type: [String], default: [] }
    },
    trigger: {
      type: {
        type: String,
        enum: ['keyword', 'regex', 'exact', 'startswith', 'contains', 'always'],
        required: true
      },
      pattern: { type: String, default: null },
      caseSensitive: { type: Boolean, default: false },
      matchTarget: { type: String, enum: ['text', 'caption', 'any'], default: 'text' }
    },
    action: {
      type: {
        type: String,
        enum: ['reply', 'react', 'forward', 'delete', 'warn', 'mute', 'kick'],
        required: true
      },
      payload: { type: mongoose.Schema.Types.Mixed, default: {} },
      stopProcessing: { type: Boolean, default: true }
    },
    cooldownMs: { type: Number, default: 0 },
    matchCount: { type: Number, default: 0 },
    lastFiredAt: { type: Date, default: null },
    createdBy: { type: String, default: null }
  },
  { timestamps: true }
);

RuleSchema.index({ sessionId: 1, enabled: 1, priority: 1 });
RuleSchema.index({ sessionId: 1, 'scope.chatJid': 1 });

module.exports = mongoose.models.Rule || mongoose.model('Rule', RuleSchema);
const mongoose = require('mongoose');

const CommandSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, lowercase: true, trim: true },
    category: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    sessionScoped: { type: Boolean, default: false },
    disabledSessions: { type: [String], default: [] },
    aliasesOverride: { type: [String], default: [] },
    ownerOnly: { type: Boolean, default: false },
    cooldownMsOverride: { type: Number, default: null },
    usageCount: { type: Number, default: 0 },
    lastUsedAt: { type: Date, default: null },
    usageBySession: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

CommandSchema.index({ name: 1 }, { unique: true });
CommandSchema.index({ enabled: 1, category: 1 });

module.exports = mongoose.models.Command || mongoose.model('Command', CommandSchema);
const mongoose = require('mongoose');

const SettingSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true },
    key: { type: String, required: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    updatedBy: { type: String, default: null }
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

SettingSchema.index({ sessionId: 1, key: 1 }, { unique: true });

module.exports = mongoose.models.Setting || mongoose.model('Setting', SettingSchema);
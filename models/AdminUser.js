const mongoose = require('mongoose');

const AdminUserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true, lowercase: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['owner', 'admin', 'moderator', 'viewer'],
      default: 'viewer',
      required: true
    },
    permissions: { type: [String], default: [] },
    active: { type: Boolean, default: true },
    lastLogin: { type: Date, default: null },
    lastLoginIp: { type: String, default: null },
    createdBy: { type: String, default: null }
  },
  { timestamps: true }
);

AdminUserSchema.index({ username: 1 }, { unique: true });
AdminUserSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.models.AdminUser || mongoose.model('AdminUser', AdminUserSchema);
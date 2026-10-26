const mongoose = require('mongoose');
const env = require('../config/env');

const EventLogSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now, required: true },
  sessionId: { type: String, default: null },
  class: { type: String, required: true },
  severity: { type: String, enum: ['info', 'warn', 'error'], required: true },
  message: { type: String, required: true },
  meta: { type: mongoose.Schema.Types.Mixed, default: null }
});

EventLogSchema.index({ timestamp: -1 });
EventLogSchema.index({ class: 1, timestamp: -1 });
EventLogSchema.index({ sessionId: 1, timestamp: -1 });

if (env.EVENTLOG_ENABLED) {
  EventLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: env.EVENTLOG_TTL_DAYS * 86400 });
}

module.exports = mongoose.models.EventLog || mongoose.model('EventLog', EventLogSchema);
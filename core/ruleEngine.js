const logger = require('../utils/logger');
const jid = require('../utils/jid');
const Contact = require('../models/Contact');
const Rule = require('../models/Rule');
const settings = require('./settings');

const ruleCache = new Map();
const compiledRegex = new Map();
const blacklistCache = new Map();

async function getRules(sessionId) {
  if (ruleCache.has(sessionId)) return ruleCache.get(sessionId);
  const rules = await Rule.find({ sessionId, enabled: true }).sort({ priority: 1, createdAt: 1 }).lean();
  ruleCache.set(sessionId, rules);
  return rules;
}

function invalidate(sessionId) {
  if (sessionId) ruleCache.delete(sessionId);
  else ruleCache.clear();
}

async function isBlacklisted(sessionId, senderJid) {
  const ck = `${sessionId}::${senderJid}`;
  const cached = blacklistCache.get(ck);
  if (cached && Date.now() - cached.at < 60000) return cached.value;

  const num = jid.fromJid(senderJid);
  if (!num) return false;

  const contact = await Contact.findOne({ sessionId, number: num }).lean();
  const value = !!(contact && contact.blacklisted);
  blacklistCache.set(ck, { value, at: Date.now() });
  return value;
}

function regexFor(pattern, flags) {
  const key = `${flags}::${pattern}`;
  if (compiledRegex.has(key)) return compiledRegex.get(key);
  const re = new RegExp(pattern, flags);
  compiledRegex.set(key, re);
  return re;
}

function matchesTrigger(trigger, text) {
  if (!text && trigger.type !== 'always') return false;
  const target = text || '';
  switch (trigger.type) {
    case 'always':
      return true;
    case 'keyword':
    case 'contains':
      return trigger.caseSensitive
        ? target.includes(trigger.pattern)
        : target.toLowerCase().includes(String(trigger.pattern).toLowerCase());
    case 'exact':
      return trigger.caseSensitive
        ? target === trigger.pattern
        : target.toLowerCase() === String(trigger.pattern).toLowerCase();
    case 'startswith':
      return trigger.caseSensitive
        ? target.startsWith(trigger.pattern)
        : target.toLowerCase().startsWith(String(trigger.pattern).toLowerCase());
    case 'regex':
      try {
        return regexFor(trigger.pattern, trigger.caseSensitive ? '' : 'i').test(target);
      } catch {
        return false;
      }
    default:
      return false;
  }
}

function scopeMatches(rule, msg) {
  const scope = rule.scope || {};
  const chatJid = msg.key.remoteJid;
  const senderJid = msg.key.participant || msg.key.remoteJid;
  const senderNum = jid.fromJid(senderJid);

  if (scope.type === 'chat' && scope.chatJid && scope.chatJid !== chatJid) return false;
  if (scope.type === 'group' && !jid.isGroupJid(chatJid)) return false;
  if (scope.type === 'dm' && jid.isGroupJid(chatJid)) return false;

  if (Array.isArray(scope.senderJids) && scope.senderJids.length > 0) {
    const ok = scope.senderJids.some((s) => jid.fromJid(s) === senderNum);
    if (!ok) return false;
  }

  if (Array.isArray(scope.senderNotJids) && scope.senderNotJids.length > 0) {
    const blocked = scope.senderNotJids.some((s) => jid.fromJid(s) === senderNum);
    if (blocked) return false;
  }

  return true;
}

async function executeAction(rule, sock, msg) {
  const chatJid = msg.key.remoteJid;
  const payload = rule.action.payload || {};

  switch (rule.action.type) {
    case 'reply':
      if (payload.mediaUrl) {
        await sock.sendMessage(chatJid, { image: { url: payload.mediaUrl }, caption: payload.caption || '' });
      } else if (payload.text) {
        await sock.sendMessage(chatJid, { text: payload.text });
      }
      break;
    case 'react':
      if (payload.emoji) {
        await sock.sendMessage(chatJid, { react: { text: payload.emoji, key: msg.key } });
      }
      break;
    case 'forward':
      if (payload.targetJid) {
        await sock.sendMessage(payload.targetJid, { text: 'Forwarded test' }).catch(() => {});
      }
      break;
    case 'delete':
      await sock.sendMessage(chatJid, { delete: msg.key });
      break;
    case 'warn':
      if (payload.text) {
        await sock.sendMessage(chatJid, { text: payload.text }, { quoted: msg });
      }
      break;
    case 'mute':
      await sock.groupSettingUpdate(chatJid, 'announcement').catch(() => {});
      break;
    case 'kick':
      await sock.groupParticipantsUpdate(chatJid, [msg.key.participant || msg.key.remoteJid], 'remove').catch(() => {});
      break;
    default:
      break;
  }
}

async function dryRun(rule, { text, senderJid }) {
  const fakeMsg = {
    key: { remoteJid: 'test@s.whatsapp.net', participant: senderJid || null },
    message: { conversation: text }
  };
  const okScope = scopeMatches(rule, fakeMsg);
  const okTrigger = matchesTrigger(rule.trigger, text);
  return {
    wouldMatch: okScope && okTrigger,
    scopeMatch: okScope,
    triggerMatch: okTrigger,
    action: rule.action
  };
}

async function executeRule(rule, sock, msg) {
  return executeAction(rule, sock, msg);
}

async function evaluate(sessionId, sock, msg, text) {
  try {
    const rules = await getRules(sessionId);
    if (!rules.length) return { stopped: false };

    const respectBlacklist = await settings.getOrDefault(sessionId, 'anti_delete');
    const senderJid = msg.key.participant || msg.key.remoteJid;

    if (respectBlacklist && (await isBlacklisted(sessionId, senderJid))) {
      return { stopped: false };
    }

    const chatJid = msg.key.remoteJid;
    for (const rule of rules) {
      if (!scopeMatches(rule, msg)) continue;

      const triggerText =
        rule.trigger.matchTarget === 'caption'
          ? msg.message?.imageMessage?.caption || msg.message?.videoMessage?.caption || ''
          : text;
      if (!matchesTrigger(rule.trigger, triggerText)) continue;

      if (rule.cooldownMs > 0) {
        const ck = `rule::${rule._id}::${chatJid}`;
        const last = blacklistCache.get(ck);
        if (last && Date.now() - last.at < rule.cooldownMs) continue;
        blacklistCache.set(ck, { at: Date.now() });
      }

      try {
        await executeAction(rule, sock, msg);
      } catch (err) {
        logger.warn({ err, rule: String(rule._id) }, 'rule action failed');
      }

      Rule.updateOne(
        { _id: rule._id },
        { $inc: { matchCount: 1 }, $set: { lastFiredAt: new Date() } }
      ).catch(() => {});

      if (rule.action.stopProcessing) return { stopped: true };
    }
    return { stopped: false };
  } catch (err) {
    logger.error({ err, sessionId }, 'ruleEngine.evaluate failed');
    return { stopped: false };
  }
}

module.exports = { evaluate, dryRun, executeRule, invalidate };
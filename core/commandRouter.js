const env = require('../config/env');
const logger = require('../utils/logger');
const jid = require('../utils/jid');
const commandRegistry = require('./commandRegistry');
const settings = require('./settings');
const state = require('../whatsapp/state');

const TEXT_KEYS = [
  ['conversation', (m) => m.conversation],
  ['extendedTextMessage', (m) => m.extendedTextMessage?.text],
  ['buttonsResponseMessage', (m) => m.buttonsResponseMessage?.selectedButtonId],
  ['templateButtonReplyMessage', (m) => m.templateButtonReplyMessage?.selectedId],
  ['listResponseMessage', (m) => m.listResponseMessage?.singleSelectReply?.selectedRowId],
  ['imageMessage', (m) => m.imageMessage?.caption],
  ['videoMessage', (m) => m.videoMessage?.caption],
  ['documentMessage', (m) => m.documentMessage?.caption],
  ['documentWithCaptionMessage', (m) => m.documentWithCaptionMessage?.message?.documentMessage?.caption]
];

const lidCache = new Map();
const LID_CACHE_TTL = 10 * 60 * 1000;

function extractText(msg) {
  if (!msg || !msg.message) return null;
  for (const [key, getter] of TEXT_KEYS) {
    if (msg.message[key] !== undefined) {
      const v = getter(msg.message);
      if (typeof v === 'string' && v.length > 0) return v;
    }
  }
  if (msg.message.interactiveResponseMessage) {
    try {
      const raw = msg.message.interactiveResponseMessage.nativeFlowResponseMessage?.paramsJson;
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed.id || null;
    } catch {
      return null;
    }
  }
  return null;
}

async function resolveLid(sock, lidJid) {
  if (!lidJid || !lidJid.endsWith('@lid')) return null;

  const cached = lidCache.get(lidJid);
  if (cached && Date.now() - cached.at < LID_CACHE_TTL) {
    return cached.value;
  }

  try {
    const results = await sock.onWhatsApp(lidJid);
    const phone = results?.[0]?.jid ? jid.fromJid(results[0].jid) : null;
    if (phone) {
      lidCache.set(lidJid, { value: phone, at: Date.now() });
    }
    return phone;
  } catch (err) {
    logger.debug({ err, lidJid }, 'lid resolve failed');
    return null;
  }
}

async function resolveSenderNumber(sock, msg, senderJid) {
  if (msg?.key?.senderPn) {
    const num = jid.fromJid(msg.key.senderPn);
    if (num) return num;
  }

  if (senderJid && senderJid.endsWith('@s.whatsapp.net')) {
    const num = jid.fromJid(senderJid);
    if (num) return num;
  }

  if (senderJid && senderJid.endsWith('@lid')) {
    const num = await resolveLid(sock, senderJid);
    if (num) return num;
  }

  return jid.fromJid(senderJid);
}

async function resolvePermissions(sessionId, sock, chatJid, senderJid, msg) {
  const isGroup = jid.isGroupJid(chatJid);
  const senderNum = await resolveSenderNumber(sock, msg, senderJid);

  const ownerNum = env.OWNER_NUMBER;
  const botOwnerNum = env.BOT_OWNER_NUMBER || '';
  const ownerLid = env.OWNER_LID;
  const ownerLidJid = ownerLid ? `${ownerLid}@lid` : null;

  const isOwnerByNum = !!senderNum && (senderNum === ownerNum || senderNum === botOwnerNum);
  const isOwnerByLid = !!ownerLidJid && senderJid === ownerLidJid;
  const isOwner = isOwnerByNum || isOwnerByLid;

  let isAdmin = false;
  let isBotAdmin = false;

  if (isGroup) {
    const meta = await state.getGroupMeta(sock, chatJid);
    if (meta && Array.isArray(meta.participants)) {
      const admins = meta.participants.filter((p) => p.admin).map((p) => p.id);
      const candidates = [senderJid, msg?.key?.senderPn].filter(Boolean);
      isAdmin = admins.some((a) =>
        candidates.some((c) => jid.sameUser(a, c) || jid.fromJid(a) === senderNum)
      );
      const botNum = jid.fromJid(sock.user?.id || '');
      isBotAdmin = admins.some((a) => jid.fromJid(a) === botNum);
    }
  }

  return { isGroup, isOwner, isAdmin, isBotAdmin, senderNum, senderJid };
}

async function parseCommand(text, sessionId) {
  if (!text) return null;
  const prefix = await settings.getPrefix(sessionId);
  if (!prefix || !text.startsWith(prefix)) return null;
  const body = text.slice(prefix.length).trim();
  if (!body) return null;
  const parts = body.split(/\s+/);
  const rawName = parts[0].toLowerCase();
  const args = parts.slice(1);
  const canonical = await commandRegistry.getAlias(rawName);
  if (!canonical) return null;
  return { name: canonical, args, prefixUsed: prefix };
}

function buildContext(sessionId, sock, msg, command, parsed, permissions) {
  const chatJid = msg.key.remoteJid;
  const senderJid = msg.key.participant || msg.key.remoteJid;

  const reply = (text, opts = {}) => {
    return sock.sendMessage(chatJid, { text: String(text), ...opts }, { quoted: msg });
  };

  const react = (emoji) => {
    return sock
      .sendMessage(chatJid, { react: { text: emoji, key: msg.key } })
      .catch(() => {});
  };

  return {
    sessionId,
    sock,
    msg,
    chatJid,
    senderJid: permissions.senderJid,
    senderNum: permissions.senderNum,
    isGroup: permissions.isGroup,
    isAdmin: permissions.isAdmin,
    isBotAdmin: permissions.isBotAdmin,
    isOwner: permissions.isOwner,
    prefix: parsed.prefixUsed,
    args: parsed.args,
    text: parsed.args.join(' '),
    settings,
    command,
    reply,
    react
  };
}

async function dispatch(sessionId, sock, msg) {
  try {
    const text = extractText(msg);
    const parsed = await parseCommand(text, sessionId);
    if (!parsed) return;

    const command = await commandRegistry.get(parsed.name);
    if (!command) return;
    if (!command.enabled) return;
    if (command.sessionScoped && command.disabledSessions.includes(sessionId)) return;

    const chatJid = msg.key.remoteJid;
    const senderJid = msg.key.participant || msg.key.remoteJid;
    const permissions = await resolvePermissions(sessionId, sock, chatJid, senderJid, msg);

    if (!permissions.isOwner) {
      const mode = await settings.getOrDefault(sessionId, 'mode');
      if (mode === 'private') {
        logger.debug(
          { sessionId, senderJid, command: command.name },
          'private mode: command ignored'
        );
        return;
      }
    }

    if (command.ownerOnly && !permissions.isOwner) {
      await sock.sendMessage(chatJid, { text: '🔒 Owner only' }, { quoted: msg });
      return;
    }
    if (command.groupOnly && !permissions.isGroup) {
      await sock.sendMessage(chatJid, { text: '⚠️ Group only' }, { quoted: msg });
      return;
    }
    if (command.adminOnly && !permissions.isAdmin && !permissions.isOwner) {
      await sock.sendMessage(chatJid, { text: '🔒 Admins only' }, { quoted: msg });
      return;
    }
    if (command.botAdminNeeded && !permissions.isBotAdmin) {
      await sock.sendMessage(chatJid, { text: '⚠️ Bot needs admin' }, { quoted: msg });
      return;
    }

    if (command.cooldownMs > 0) {
      const last = state.getCooldown(sessionId, command.name, senderJid);
      const elapsed = Date.now() - (last || 0);
      if (last && elapsed < command.cooldownMs) {
        const wait = Math.ceil((command.cooldownMs - elapsed) / 1000);
        await sock.sendMessage(chatJid, { text: `⏳ Slow down (${wait}s)` }, { quoted: msg });
        return;
      }
      state.setCooldown(sessionId, command.name, senderJid);
    }

    const ctx = buildContext(sessionId, sock, msg, command, parsed, permissions);

    try {
      await command.run(ctx);
      commandRegistry.recordUsage(command.name, sessionId);
    } catch (err) {
      logger.error({ err, command: command.name, sessionId }, 'command failed');
      try {
        await sock.sendMessage(chatJid, { text: '❌ Command failed' }, { quoted: msg });
      } catch {}
    }
  } catch (err) {
    logger.error({ err, sessionId }, 'dispatch error');
  }
}

module.exports = { dispatch, extractText, parseCommand };
const env = require('../../config/env');

const groupCache = new Map();
const dedup = new Map();
const cooldowns = new Map();
const messageCache = new Map();
const qrExports = new Map();

async function getGroupMeta(sock, groupJid) {
  const cached = groupCache.get(groupJid);
  if (cached && Date.now() - cached.at < env.GROUP_CACHE_TTL_MS) return cached.value;
  try {
    const meta = await sock.groupMetadata(groupJid);
    groupCache.set(groupJid, { value: meta, at: Date.now() });
    return meta;
  } catch {
    return cached ? cached.value : null;
  }
}

function setGroupMeta(groupJid, value) {
  groupCache.set(groupJid, { value, at: Date.now() });
}

function hasDedup(sessionId, msgId) {
  const set = dedup.get(sessionId);
  return set ? set.has(msgId) : false;
}

function addDedup(sessionId, msgId) {
  let set = dedup.get(sessionId);
  if (!set) {
    set = new Set();
    dedup.set(sessionId, set);
  }
  set.add(msgId);
  const max = env.DEDUP_LRU_SIZE;
  while (set.size > max) {
    const first = set.values().next().value;
    set.delete(first);
  }
}

function getCooldown(sessionId, command, senderJid) {
  const key = `${sessionId}::${command}::${senderJid}`;
  return cooldowns.get(key) || null;
}

function setCooldown(sessionId, command, senderJid) {
  const key = `${sessionId}::${command}::${senderJid}`;
  cooldowns.set(key, Date.now());
}

function cacheMessage(sessionId, chatJid, entry) {
  const key = `${sessionId}::${chatJid}`;
  let list = messageCache.get(key);
  if (!list) {
    list = [];
    messageCache.set(key, list);
  }
  list.push(entry);
  while (list.length > 100) list.shift();
}

function findMessage(sessionId, chatJid, msgId) {
  const key = `${sessionId}::${chatJid}`;
  const list = messageCache.get(key);
  if (!list) return null;
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i].msgId === msgId) return list[i];
  }
  return null;
}

function clearChat(sessionId, chatJid) {
  messageCache.delete(`${sessionId}::${chatJid}`);
}

function setQRExport(sessionId, qr) {
  qrExports.set(sessionId, { sessionId, qr, expiresAt: Date.now() + 60000 });
}

function getQRExport() {
  const now = Date.now();
  for (const [id, entry] of qrExports) {
    if (now >= entry.expiresAt) qrExports.delete(id);
  }
  for (const [, entry] of qrExports) return entry;
  return null;
}

function clearSession(sessionId) {
  dedup.delete(sessionId);
  messageCache.forEach((_, key) => {
    if (key.startsWith(`${sessionId}::`)) messageCache.delete(key);
  });
  cooldowns.forEach((_, key) => {
    if (key.startsWith(`${sessionId}::`)) cooldowns.delete(key);
  });
  qrExports.delete(sessionId);
}

module.exports = {
  getGroupMeta,
  setGroupMeta,
  hasDedup,
  addDedup,
  getCooldown,
  setCooldown,
  cacheMessage,
  findMessage,
  clearChat,
  setQRExport,
  getQRExport,
  clearSession
};
const env = require('../../config/env');
const jid = require('../../utils/jid');
const state = require('../state');

async function resolve(sessionId, sock, msg, chatJid) {
  const senderJid = msg.key.participant || msg.key.remoteJid;
  const senderNum = jid.fromJid(senderJid);
  const isGroup = jid.isGroupJid(chatJid);

  const ownerNum = env.OWNER_NUMBER;
  const botOwnerNum = env.BOT_OWNER_NUMBER || '';
  const isOwner = !!senderNum && (senderNum === ownerNum || senderNum === botOwnerNum);

  let isAdmin = false;
  let isBotAdmin = false;

  if (isGroup) {
    const meta = await state.getGroupMeta(sock, chatJid);
    if (meta && Array.isArray(meta.participants)) {
      const admins = meta.participants.filter((p) => p.admin).map((p) => p.id);
      isAdmin = admins.some((a) => jid.sameUser(a, senderJid));
      const botNum = jid.fromJid(sock.user?.id || '');
      isBotAdmin = admins.some((a) => jid.fromJid(a) === botNum);
    }
  }

  return { isGroup, isOwner, isAdmin, isBotAdmin, senderNum, senderJid };
}

function isOwner(senderJid) {
  const num = jid.fromJid(senderJid);
  if (!num) return false;
  return num === env.OWNER_NUMBER || num === (env.BOT_OWNER_NUMBER || '');
}

module.exports = { resolve, isOwner };
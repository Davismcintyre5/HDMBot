const USER_SUFFIX = '@s.whatsapp.net';
const GROUP_SUFFIX = '@g.us';
const STATUS_JID = 'status@broadcast';

function normalizeNumber(raw) {
  if (raw === undefined || raw === null) {
    throw new Error('Invalid phone number: empty');
  }
  const s = String(raw).trim();
  const digits = s.replace(/[^\d]/g, '');
  if (!/^\d{10,15}$/.test(digits)) {
    throw new Error(`Invalid phone number: "${raw}"`);
  }
  return digits;
}

function toJid(number) {
  const digits = normalizeNumber(number);
  return `${digits}${USER_SUFFIX}`;
}

function fromJid(jid) {
  if (!jid || typeof jid !== 'string') return null;
  const atIdx = jid.indexOf('@');
  const localPart = atIdx >= 0 ? jid.slice(0, atIdx) : jid;
  const deviceStripped = localPart.split(':')[0].split('.')[0];
  const digits = deviceStripped.replace(/[^\d]/g, '');
  return digits || null;
}

function isUserJid(jid) {
  return typeof jid === 'string' && jid.endsWith(USER_SUFFIX);
}

function isGroupJid(jid) {
  return typeof jid === 'string' && jid.endsWith(GROUP_SUFFIX);
}

function isStatusJid(jid) {
  return jid === STATUS_JID;
}

function mentionOf(jid) {
  const num = fromJid(jid);
  return num ? `@${num}` : '';
}

function sameUser(a, b) {
  const na = fromJid(a);
  const nb = fromJid(b);
  return !!na && !!nb && na === nb;
}

module.exports = {
  normalizeNumber,
  toJid,
  fromJid,
  isUserJid,
  isGroupJid,
  isStatusJid,
  mentionOf,
  sameUser,
  USER_SUFFIX,
  GROUP_SUFFIX,
  STATUS_JID
};
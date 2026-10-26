if (global.__hdmNoiseSuppressed) {
  module.exports = {};
  return;
}
global.__hdmNoiseSuppressed = true;

const OBJECT_PATTERNS = [
  'SessionEntry',
  '_chains',
  'registrationId',
  'indexInfo',
  'currentRatchet',
  'ephemeralKeyPair',
  'lastRemoteEphemeralKey',
  'rootKey',
  'baseKey',
  'remoteIdentityKey',
  'pendingPreKey',
  'chainType',
  'messageKeys',
  'chainKey',
  'signedKeyId',
  'preKeyId',
  'previousCounter',
  'closed:'
];

const LOG_STRINGS = [
  'Closing session',
  'Removing old closed',
  'Decrypted message with closed',
  'Closing open session',
  'prekey bundle',
  'Backed up to MongoDB'
];

const ERROR_STRINGS = [
  'Bad MAC',
  'decrypt',
  'Session error',
  'Failed to decrypt'
];

process.removeAllListeners('warning');
process.on('warning', (warning) => {
  if (warning.name === 'DeprecationWarning' && warning.message.includes('punycode')) {
    return;
  }
  console.warn(warning.name, warning.message);
});

const originalLog = console.log;
console.log = function (...args) {
  for (const arg of args) {
    if (typeof arg === 'object' && arg !== null) {
      let str;
      try {
        str = JSON.stringify(arg).substring(0, 150);
      } catch {
        str = '';
      }
      if (OBJECT_PATTERNS.some((p) => str.includes(p))) return;
    }
    if (typeof arg === 'string') {
      if (LOG_STRINGS.some((p) => arg.includes(p))) return;
    }
  }
  originalLog.apply(console, args);
};

const originalError = console.error;
console.error = function (...args) {
  const msg = args
    .map((a) => {
      if (typeof a === 'object' && a !== null) {
        try {
          return JSON.stringify(a).substring(0, 100);
        } catch {
          return '';
        }
      }
      return String(a);
    })
    .join(' ');
  if (ERROR_STRINGS.some((p) => msg.includes(p))) return;
  originalError.apply(console, args);
};

originalLog('🔇 Baileys noise suppressed');

module.exports = {};
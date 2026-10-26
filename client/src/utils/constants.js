export const API_URL = '/api'
export const DEFAULT_SESSION = 'hdm-bot-session'

export const SESSION_STATUS = {
  INACTIVE: 'inactive',
  CONNECTING: 'connecting',
  QR_PENDING: 'qr_pending',
  OPEN: 'open',
  RECONNECTING: 'reconnecting',
  DEAD: 'dead',
  LOGGED_OUT: 'logged_out'
}

export const STATUS_COLORS = {
  open: 'green',
  connecting: 'yellow',
  qr_pending: 'yellow',
  reconnecting: 'yellow',
  inactive: 'gray',
  dead: 'red',
  logged_out: 'red'
}

export const STATUS_LABELS = {
  open: 'Connected',
  connecting: 'Connecting',
  qr_pending: 'QR Pending',
  reconnecting: 'Reconnecting',
  inactive: 'Inactive',
  dead: 'Dead',
  logged_out: 'Logged Out'
}

export const TRIGGER_TYPES = [
  { value: 'keyword', label: 'Keyword' },
  { value: 'contains', label: 'Contains' },
  { value: 'exact', label: 'Exact Match' },
  { value: 'startswith', label: 'Starts With' },
  { value: 'regex', label: 'Regex' },
  { value: 'always', label: 'Always (catch-all)' }
]

export const ACTION_TYPES = [
  { value: 'reply', label: 'Reply' },
  { value: 'react', label: 'React' },
  { value: 'forward', label: 'Forward' },
  { value: 'delete', label: 'Delete' },
  { value: 'warn', label: 'Warn' },
  { value: 'mute', label: 'Mute' },
  { value: 'kick', label: 'Kick' }
]

export const SCOPE_TYPES = [
  { value: 'global', label: 'Global (All Chats)' },
  { value: 'chat', label: 'Specific Chat' },
  { value: 'group', label: 'Group Only' },
  { value: 'dm', label: 'Private Only' }
]

export const MATCH_TARGETS = [
  { value: 'text', label: 'Text Only' },
  { value: 'caption', label: 'Media Caption' },
  { value: 'any', label: 'Text or Caption' }
]

export const CONTACT_KINDS = [
  { value: 'user', label: 'User' },
  { value: 'group', label: 'Group' }
]

export const COMMAND_CATEGORIES = [
  'general',
  'admin',
  'group',
  'media',
  'ai',
  'utility',
  'fun',
  'bug',
  'settings'
]

export const ROLES = ['owner', 'admin', 'moderator', 'viewer']

export const SETTING_KEYS = {
  PREFIX: 'prefix',
  ANTI_DELETE: 'anti_delete',
  BROADCAST_DELAY_MS: 'broadcast_delay_ms',
  DISABLED_COMMANDS: 'disabled_commands'
}
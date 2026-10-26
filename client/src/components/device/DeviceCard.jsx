import { Smartphone, Shield } from 'lucide-react'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import { formatDate } from '../../utils/helpers'
import { STATUS_COLORS, STATUS_LABELS } from '../../utils/constants'

export default function DeviceCard({
  session,
  isDefault,
  onConnect,
  onDisconnect,
  onQR,
  onDelete,
  onSync
}) {
  const connected = session.status === 'open'
  const pending =
    session.status === 'connecting' ||
    session.status === 'qr_pending' ||
    session.status === 'reconnecting'

  const label = STATUS_LABELS[session.status] || session.status
  const color = STATUS_COLORS[session.status] || 'gray'

  return (
    <div
      className={`bg-white dark:bg-gray-900 rounded-xl border p-5 transition-all hover:border-gray-300 dark:hover:border-gray-600 ${
        connected
          ? 'border-green-500/30 shadow-lg shadow-green-500/5'
          : pending
          ? 'border-yellow-500/30'
          : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl ${
              connected
                ? 'bg-green-500/20'
                : pending
                ? 'bg-yellow-500/20'
                : 'bg-gray-100 dark:bg-gray-700'
            }`}
          >
            <Smartphone
              size={22}
              className={
                connected
                  ? 'text-green-500'
                  : pending
                  ? 'text-yellow-500'
                  : 'text-gray-400'
              }
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-gray-900 dark:text-white font-semibold">
                {session.sessionId}
              </h3>
              {isDefault && (
                <Badge color="purple">
                  <Shield size={10} className="inline mr-1" />
                  Default
                </Badge>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              {session.sessionId}
            </p>
          </div>
        </div>
        <Badge color={color}>{label}</Badge>
      </div>

      <div className="space-y-2 mb-4 text-sm">
        {session.phoneNumber && (
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Phone</span>
            <span className="text-gray-900 dark:text-white">
              +{session.phoneNumber}
            </span>
          </div>
        )}
        {session.lastConnected && (
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Last Connected</span>
            <span className="text-gray-700 dark:text-gray-300 text-xs">
              {formatDate(session.lastConnected)}
            </span>
          </div>
        )}
        {typeof session.backupAgeSec === 'number' && (
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Backup</span>
            <span className="text-gray-700 dark:text-gray-300 text-xs">
              {session.backupAgeSec}s ago
            </span>
          </div>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {!connected && !pending ? (
          <Button
            size="sm"
            onClick={() => onConnect(session.sessionId)}
            className="flex-1"
          >
            🔌 Connect
          </Button>
        ) : pending ? (
          <Button size="sm" variant="secondary" disabled className="flex-1">
            ⏳ Connecting...
          </Button>
        ) : (
          <Button
            size="sm"
            variant="danger"
            onClick={() => onDisconnect(session.sessionId)}
            className="flex-1"
          >
            ⏏ Disconnect
          </Button>
        )}

        {connected && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onSync(session.sessionId)}
            title="Force backup now"
          >
            💾
          </Button>
        )}

        {pending && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onQR(session.sessionId)}
          >
            📱 QR
          </Button>
        )}

        {!isDefault && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(session)}
            className="text-red-500 hover:text-red-400"
          >
            🗑️
          </Button>
        )}
      </div>
    </div>
  )
}
import { Smartphone } from 'lucide-react'
import Badge from '../ui/Badge'
import { STATUS_COLORS, STATUS_LABELS } from '../../utils/constants'

export default function SessionMap({ sessions = [] }) {
  const connected = sessions.filter((s) => s.connected).length

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
        Sessions ({connected}/{sessions.length})
      </h3>
      {sessions.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-4">No sessions</p>
      ) : (
        <div className="space-y-2">
          {sessions.slice(0, 5).map((s) => (
            <div
              key={s.sessionId}
              className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
            >
              <div className="flex items-center gap-2">
                <Smartphone
                  size={16}
                  className={s.connected ? 'text-green-500' : 'text-gray-400'}
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {s.sessionId}
                </span>
              </div>
              <Badge color={STATUS_COLORS[s.status] || 'gray'}>
                {STATUS_LABELS[s.status] || s.status}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
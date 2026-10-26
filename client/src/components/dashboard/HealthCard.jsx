import { useEffect, useState } from 'react'
import { Activity, Clock, Cpu, Database, Server, Radio } from 'lucide-react'
import { formatUptime } from '../../utils/helpers'

export default function HealthCard({ health }) {
  const [uptime, setUptime] = useState('--')

  useEffect(() => {
    if (health?.uptime) setUptime(formatUptime(health.uptime))
    const timer = setInterval(() => {
      if (health?.uptime) setUptime(formatUptime(health.uptime + 30))
    }, 30000)
    return () => clearInterval(timer)
  }, [health])

  const sessions = Array.isArray(health?.sessions) ? health.sessions : []
  const connected =
    typeof health?.sessionsConnected === 'number'
      ? health.sessionsConnected
      : sessions.filter((s) => s && s.connected).length
  const total =
    typeof health?.sessionsTotal === 'number'
      ? health.sessionsTotal
      : sessions.length

  const mongo = health?.mongo || '—'
  const redis = health?.redis || '—'
  const cloudinary = health?.cloudinary || '—'

  const healthy = health?.status === 'ok' || mongo === 'up'

  const rows = [
    { icon: Clock, color: 'text-blue-400', label: 'Uptime', value: uptime },
    { icon: Server, color: 'text-green-400', label: 'Sessions', value: `${connected}/${total}` },
    { icon: Database, color: 'text-yellow-400', label: 'Mongo', value: mongo },
    { icon: Cpu, color: 'text-purple-400', label: 'Redis', value: redis },
    { icon: Radio, color: 'text-cyan-400', label: 'Cloudinary', value: cloudinary }
  ]

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Activity size={18} className="text-green-500" />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          System Health
        </h3>
      </div>

      <div className="space-y-3">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
          >
            <div className="flex items-center gap-2">
              <row.icon size={14} className={row.color} />
              <span className="text-xs text-gray-500">{row.label}</span>
            </div>
            <span className="text-xs font-mono font-medium text-gray-700 dark:text-gray-300">
              {row.value}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              healthy ? 'bg-green-500 animate-pulse' : 'bg-red-500'
            }`}
          />
          <span
            className={`text-xs font-medium ${
              healthy ? 'text-green-500' : 'text-red-500'
            }`}
          >
            {healthy ? 'System Healthy' : 'System Degraded'}
          </span>
        </div>
      </div>
    </div>
  )
}
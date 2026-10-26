import { useEffect, useState } from 'react'
import {
  MessageSquare,
  Terminal,
  Smartphone,
  Users,
  Shield,
  Zap,
  TrendingUp,
  Clock,
  Bot,
  Radio,
  FileText,
  Cpu,
  Database,
  Wifi,
  Activity
} from 'lucide-react'
import {
  getStats,
  getSessionsSummary,
  getActivity,
  getRecentMessages
} from '../api/dashboard'
import { getHealth } from '../api/health'
import { listCommands } from '../api/commands'
import { listRules } from '../api/rules'
import { listContacts } from '../api/contacts'
import { listSessions } from '../api/sessions'
import StatCard from '../components/dashboard/StatCard'
import QuickActions from '../components/dashboard/QuickActions'
import ActivityChart from '../components/dashboard/ActivityChart'
import SessionMap from '../components/dashboard/SessionMap'
import HealthCard from '../components/dashboard/HealthCard'
import Spinner from '../components/ui/Spinner'
import Badge from '../components/ui/Badge'
import { formatTime } from '../utils/helpers'
import { STATUS_COLORS, STATUS_LABELS, DEFAULT_SESSION } from '../utils/constants'

export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [sessions, setSessions] = useState([])
  const [activity, setActivity] = useState([])
  const [health, setHealth] = useState(null)
  const [commands, setCommands] = useState([])
  const [rules, setRules] = useState([])
  const [contacts, setContacts] = useState([])
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    const load = async () => {
      const sessionId = DEFAULT_SESSION
      const [
        statsRes,
        sessionsRes,
        activityRes,
        healthRes,
        commandsRes,
        rulesRes,
        contactsRes,
        recentRes
      ] = await Promise.all([
        getStats(sessionId).catch(() => ({ data: { data: {} } })),
        getSessionsSummary().catch(() => ({ data: { data: [] } })),
        getActivity(7).catch(() => ({ data: { data: { series: [] } } })),
        getHealth().catch(() => ({ data: { data: null } })),
        listCommands({ sessionId }).catch(() => ({ data: { data: [] } })),
        listRules({ sessionId }).catch(() => ({ data: { data: { items: [] } } })),
        listContacts({ sessionId }).catch(() => ({ data: { data: { items: [] } } })),
        getRecentMessages({ hours: 1, limit: 8 }).catch(() => ({ data: { data: { items: [] } } }))
      ])

      if (!alive) return

      const unwrap = (r) => r?.data?.data || r?.data || null

      setStats(unwrap(statsRes) || {})
      setSessions(unwrap(sessionsRes) || [])
      setActivity(unwrap(activityRes)?.series || [])
      setHealth(unwrap(healthRes))
      setCommands(Array.isArray(unwrap(commandsRes)) ? unwrap(commandsRes) : [])
      setRules(unwrap(rulesRes)?.items || [])
      setContacts(unwrap(contactsRes)?.items || [])
      setRecent(unwrap(recentRes)?.items || [])
      setLoading(false)
    }

    load()
    const timer = setInterval(load, 30000)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    )
  }

  const enabledCommands = commands.filter((c) => c.enabled !== false)
  const disabledCommands = commands.length - enabledCommands.length
  const enabledRules = rules.filter((r) => r.enabled !== false)
  const blacklisted = contacts.filter((c) => c.blacklisted).length
  const connectedSessions = sessions.filter((s) => s.connected)
  const totalRules = rules.length
  const totalContacts = contacts.length
  const recentMsgs = recent.length

  const topCommands = [...commands]
    .filter((c) => c.usageCount > 0)
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Overview of your WhatsApp bot · auto-refresh 30s
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge color={health?.status === 'ok' ? 'green' : 'red'}>
            {health?.status === 'ok' ? '🟢 System online' : '🔴 System down'}
          </Badge>
          <Badge color={connectedSessions.length > 0 ? 'green' : 'gray'}>
            {connectedSessions.length}/{sessions.length} sessions
          </Badge>
        </div>
      </div>

      {/* Primary stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          title="Messages (24h)"
          value={stats?.messages24h || 0}
          icon={MessageSquare}
          color="primary"
        />
        <StatCard
          title="Commands"
          value={enabledCommands.length}
          icon={Terminal}
          color="accent"
        />
        <StatCard
          title="Rules"
          value={enabledRules.length}
          icon={Shield}
          color="green"
        />
        <StatCard
          title="Contacts"
          value={totalContacts}
          icon={Users}
          color="purple"
        />
        <StatCard
          title="Sessions"
          value={connectedSessions.length}
          icon={Smartphone}
          color="green"
        />
        <StatCard
          title="Usage"
          value={stats?.totalCommandUsage || 0}
          icon={Zap}
          color="yellow"
        />
      </div>

      {/* Activity + Quick Actions + Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ActivityChart series={activity} />
        </div>
        <div className="space-y-4">
          <QuickActions />
          <HealthCard health={health} />
        </div>
      </div>

      {/* Top commands + Sessions + Recent messages */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top commands */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-green-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Top Commands
            </h3>
          </div>
          {topCommands.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">
              No commands used yet
            </p>
          ) : (
            <div className="space-y-2">
              {topCommands.map((cmd, i) => (
                <div
                  key={cmd.name}
                  className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-400">
                      {i + 1}
                    </span>
                    <span className="text-sm text-gray-700 dark:text-gray-300 font-mono">
                      {cmd.name}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-gray-900 dark:text-white">
                    {cmd.usageCount}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sessions */}
        <SessionMap sessions={sessions} />

        {/* Recent messages */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare size={18} className="text-blue-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Recent Messages
            </h3>
          </div>
          {recent.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">
              No messages in the last hour
            </p>
          ) : (
            <div className="space-y-2">
              {recent.slice(0, 5).map((msg) => (
                <div
                  key={msg._id || msg.msgId}
                  className="py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0"
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-mono text-gray-500 dark:text-gray-400 truncate max-w-[60%]">
                      {msg.senderJid?.split('@')[0] || 'unknown'}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-700 dark:text-gray-300 truncate">
                    {msg.text || `[${msg.type}]`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* System info + Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System info */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Cpu size={18} className="text-purple-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              System Info
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-400">
                Mongo
              </p>
              <p className="text-xs font-medium text-gray-900 dark:text-white mt-0.5">
                {health?.mongo === 'up' ? '✅ Connected' : '❌ Down'}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-400">
                Redis
              </p>
              <p className="text-xs font-medium text-gray-900 dark:text-white mt-0.5">
                {health?.redis === 'enabled' ? '✅ Enabled' : '⬜ Disabled'}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-400">
                Cloudinary
              </p>
              <p className="text-xs font-medium text-gray-900 dark:text-white mt-0.5">
                {health?.cloudinary === 'configured' ? '✅ Configured' : '⬜ Disabled'}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-400">
                Uptime
              </p>
              <p className="text-xs font-medium text-gray-900 dark:text-white mt-0.5">
                {formatUptime(health?.uptime)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-400">
                Disabled Commands
              </p>
              <p className="text-xs font-medium text-gray-900 dark:text-white mt-0.5">
                {disabledCommands}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-400">
                Blacklisted
              </p>
              <p className="text-xs font-medium text-gray-900 dark:text-white mt-0.5">
                {blacklisted}
              </p>
            </div>
          </div>
        </div>

        {/* Bot Summary */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Bot size={18} className="text-indigo-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Bot Summary
            </h3>
          </div>
          <div className="space-y-2">
            <SummaryRow
              label="Total commands"
              value={commands.length}
              hint={`${enabledCommands.length} enabled`}
            />
            <SummaryRow
              label="Total rules"
              value={totalRules}
              hint={`${enabledRules.length} active`}
            />
            <SummaryRow
              label="Total contacts"
              value={totalContacts}
              hint={`${blacklisted} blacklisted`}
            />
            <SummaryRow
              label="Active sessions"
              value={connectedSessions.length}
              hint={`${sessions.length} total`}
            />
            <SummaryRow
              label="Messages (1h)"
              value={recentMsgs}
              hint="from recent buffer"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function SummaryRow({ label, value, hint }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div>
        <p className="text-xs text-gray-700 dark:text-gray-300">{label}</p>
        {hint && (
          <p className="text-[10px] text-gray-400 mt-0.5">{hint}</p>
        )}
      </div>
      <span className="text-sm font-semibold text-gray-900 dark:text-white">
        {value}
      </span>
    </div>
  )
}

function formatUptime(seconds) {
  if (!seconds || seconds <= 0) return '—'
  const s = Math.floor(seconds)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const parts = []
  if (d > 0) parts.push(`${d}d`)
  if (h > 0) parts.push(`${h}h`)
  if (m > 0) parts.push(`${m}m`)
  if (parts.length === 0) parts.push(`${s}s`)
  return parts.join(' ')
}
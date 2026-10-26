import { useEffect, useState, useCallback } from 'react'
import {
  Server,
  Database,
  Wifi,
  WifiOff,
  Cloud,
  Smartphone,
  Users,
  Shield,
  Terminal,
  MessageSquare,
  Settings as SettingsIcon,
  RefreshCw,
  Activity,
  Clock,
  Cpu,
  HardDrive,
  ListChecks
} from 'lucide-react'
import { getDetailedHealth } from '../api/health'
import { useToast } from '../hooks/useToast'
import { formatDate, formatUptime } from '../utils/helpers'

const OK_STATES = ['up', 'enabled', 'connected', 'healthy']
const REFRESH_MS = 30000

function StatusDot({ status }) {
  const ok = OK_STATES.includes(status)
  const warn = status === 'disabled' || status === 'degraded' || status === 'idle'
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${
        ok ? 'bg-green-500' : warn ? 'bg-gray-400' : 'bg-red-500'
      }`}
    />
  )
}

function Badge({ color = 'gray', children }) {
  const colors = {
    green: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
    red: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    yellow: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    gray: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20'
  }
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${colors[color]}`}
    >
      {children}
    </span>
  )
}

function Stat({ label, value, hint }) {
  return (
    <div>
      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        {label}
      </p>
      <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5 truncate">
        {value ?? '—'}
      </p>
      {hint && (
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">
          {hint}
        </p>
      )}
    </div>
  )
}

function Detail({ label, value, mono }) {
  if (value === undefined || value === null || value === '') return null
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-gray-500 dark:text-gray-400 text-xs shrink-0">{label}</dt>
      <dd
        className={`text-gray-900 dark:text-gray-100 text-xs text-right truncate ${
          mono ? 'font-mono' : ''
        }`}
        title={String(value)}
      >
        {value}
      </dd>
    </div>
  )
}

function ServiceCard({ icon: Icon, title, status, children }) {
  const ok = OK_STATES.includes(status)
  const warn = status === 'disabled' || status === 'degraded' || status === 'idle'
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <StatusDot status={status} />
          <Badge color={ok ? 'green' : warn ? 'gray' : 'red'}>
            {status || 'unknown'}
          </Badge>
        </div>
      </div>
      <dl className="space-y-2 text-sm">{children}</dl>
    </div>
  )
}

export default function HealthPage() {
  const { toast } = useToast()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true)
      try {
        const res = await getDetailedHealth()
        const payload = res?.data?.data || res?.data || null
        setData(payload)
        setLastUpdated(new Date())
      } catch (err) {
        if (!silent) {
          toast.error(err.response?.data?.error || err.message || 'Failed to load health')
        }
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [toast]
  )

  useEffect(() => {
    load()
    const t = setInterval(() => load(true), REFRESH_MS)
    return () => clearInterval(t)
  }, [load])

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 border-2 border-gray-300 dark:border-gray-700 border-t-primary-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!data) return null

  const s = data.server || {}
  const cpu = s.cpu || {}
  const mem = s.memory || {}
  const dbx = data.database || {}
  const redis = data.redis || {}
  const cloud = data.cloudinary || {}
  const wa = data.whatsapp || {}
  const counts = data.data || {}
  const cfg = data.config || {}
  const overall = data.overall || { up: 0, total: 0 }

  const isHealthy = data.status === 'healthy'

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              System Health
            </h1>
            <Badge color={isHealthy ? 'green' : 'yellow'}>
              {data.status || 'unknown'}
            </Badge>
            <Badge color="blue">
              {overall.up}/{overall.total} services
            </Badge>
          </div>
          {lastUpdated && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Updated {lastUpdated.toLocaleTimeString()} · auto-refresh 30s
            </p>
          )}
        </div>
        <button
          onClick={() => load()}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Server card — expanded */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {s.url || 'API server'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <StatusDot status={s.status} />
            <Badge color="green">{s.status}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Version" value={s.version} />
          <Stat label="Node" value={s.node} />
          <Stat label="Environment" value={s.env} />
          <Stat label="Hostname" value={s.hostname} />

          <Stat
            label="Platform"
            value={s.platformFull || s.platform}
            hint={s.arch ? `arch: ${s.arch}` : undefined}
          />
          <Stat
            label="Uptime"
            value={s.uptimeHuman}
            hint={s.uptimeSeconds ? `${s.uptimeSeconds.toLocaleString()}s` : undefined}
          />
          <Stat
            label="Started"
            value={s.startedAt ? formatDate(s.startedAt) : '—'}
          />
          <Stat label="PID" value={s.pid} />

          <Stat
            label="CPU"
            value={`${cpu.cores ?? 0} cores`}
            hint={cpu.model || undefined}
          />
          <Stat
            label="Load (1m / 5m / 15m)"
            value={
              cpu.loadAvg
                ? cpu.loadAvg.map((v) => v.toFixed(2)).join(' / ')
                : '—'
            }
          />
          <Stat
            label="Memory (RSS)"
            value={`${mem.rssMb ?? 0} MB`}
            hint={`heap ${mem.heapUsedMb ?? 0}/${mem.heapTotalMb ?? 0} MB`}
          />
          <Stat
            label="System memory"
            value={`${mem.freeSystemMb ?? 0} / ${mem.totalSystemMb ?? 0} MB`}
            hint={
              mem.totalSystemMb
                ? `${Math.round(
                    ((mem.totalSystemMb - mem.freeSystemMb) / mem.totalSystemMb) * 100
                  )}% used`
                : undefined
            }
          />
        </div>
      </div>

      {/* Services grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ServiceCard icon={Database} title="Database" status={dbx.status}>
          <Detail label="Type" value={dbx.type} />
          <Detail label="Name" value={dbx.database} />
          <Detail label="Host" value={dbx.host} mono />
          <Detail label="Collections" value={dbx.collections} />
          <Detail
            label="Documents"
            value={(dbx.documents ?? 0).toLocaleString()}
          />
          {dbx.pingMs != null && <Detail label="Ping" value={`${dbx.pingMs} ms`} />}
        </ServiceCard>

        <ServiceCard icon={Wifi} title="Redis" status={redis.status}>
          <Detail label="Enabled" value={redis.enabled ? 'Yes' : 'No'} />
          <Detail label="Host" value={redis.host} mono />
          {redis.memoryUsed && <Detail label="Memory" value={redis.memoryUsed} />}
          {redis.message && <Detail label="Message" value={redis.message} />}
        </ServiceCard>

        <ServiceCard icon={Cloud} title="Cloudinary" status={cloud.status}>
          <Detail label="Cloud" value={cloud.cloud} />
          <Detail label="Folder" value={cloud.folder} mono />
          <Detail
            label="Enabled"
            value={cloud.status === 'up' ? 'Yes' : 'No'}
          />
        </ServiceCard>

        <ServiceCard
          icon={wa.connected > 0 ? Wifi : WifiOff}
          title="WhatsApp"
          status={wa.status}
        >
          <Detail label="Connected" value={`${wa.connected} / ${wa.total}`} />
          {Array.isArray(wa.sessions) && wa.sessions.length > 0 && (
            <div className="border-t border-gray-100 dark:border-gray-800 pt-2 mt-2 space-y-1">
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">
                Sessions
              </p>
              {wa.sessions.map((sess) => (
                <div
                  key={sess.sessionId}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="font-mono text-gray-600 dark:text-gray-400">
                    {sess.sessionId}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <StatusDot status={sess.connected ? 'up' : sess.status} />
                    <Badge
                      color={
                        sess.connected
                          ? 'green'
                          : sess.status === 'reconnecting' || sess.status === 'qr_pending'
                          ? 'yellow'
                          : 'gray'
                      }
                    >
                      {sess.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ServiceCard>

        <ServiceCard icon={MessageSquare} title="Data" status="up">
          <Detail
            label="Messages (24h)"
            value={(counts.messages24h ?? 0).toLocaleString()}
          />
          <Detail label="Rules" value={counts.rules} />
          <Detail label="Contacts" value={counts.contacts} />
          <Detail label="Commands" value={counts.commands} />
          <Detail label="Settings" value={counts.settings} />
          <Detail label="Admins" value={counts.admins} />
          <Detail label="Sessions" value={counts.sessions} />
        </ServiceCard>

        <ServiceCard icon={Activity} title="Events" status={data.events ? 'up' : 'idle'}>
          {data.events ? (
            <>
              <Detail label="Last" value={data.events.class} />
              <Detail label="When" value={formatDate(data.events.timestamp)} />
              <Detail label="Message" value={data.events.message} />
            </>
          ) : (
            <p className="text-xs text-gray-400">No events logged yet</p>
          )}
        </ServiceCard>

        <ServiceCard icon={SettingsIcon} title="Config" status="up">
          <Detail label="Bot" value={cfg.botName} />
          <Detail label="Owner" value={cfg.ownerName} />
          <Detail label="Owner #" value={cfg.ownerNumber} mono />
          <Detail label="Prefix" value={cfg.defaultPrefix} mono />
          <Detail label="Timezone" value={cfg.timezone} />
          <Detail label="Replicas" value={cfg.replicaCount} />
          <Detail label="Anticache TTL" value={`${cfg.anticacheTtlHours}h`} />
          <Detail label="Message TTL" value={`${cfg.messageTtlHours}h`} />
        </ServiceCard>
      </div>

      {/* CORS origins */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          CORS Origins
        </h3>
        {Array.isArray(data.cors) && data.cors.length ? (
          <ul className="space-y-1">
            {data.cors.map((origin) => (
              <li
                key={origin}
                className="text-xs font-mono text-gray-600 dark:text-gray-400 flex items-center gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                {origin}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-gray-400">No origins configured</p>
        )}
      </div>

      {data.timestamp && (
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
          Server timestamp: {formatDate(data.timestamp)}
        </p>
      )}
    </div>
  )
}
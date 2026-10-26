import { useEffect, useState } from 'react'
import { MessageSquare, Terminal, Smartphone, Users } from 'lucide-react'
import { getStats, getSessionsSummary, getActivity } from '../api/dashboard'
import { getHealth } from '../api/health'
import StatCard from '../components/dashboard/StatCard'
import QuickActions from '../components/dashboard/QuickActions'
import ActivityChart from '../components/dashboard/ActivityChart'
import SessionMap from '../components/dashboard/SessionMap'
import HealthCard from '../components/dashboard/HealthCard'
import Spinner from '../components/ui/Spinner'

export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [sessions, setSessions] = useState([])
  const [activity, setActivity] = useState([])
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    const load = async () => {
      const [statsRes, sessionsRes, activityRes, healthRes] = await Promise.all([
        getStats().catch(() => ({ data: { data: {} } })),
        getSessionsSummary().catch(() => ({ data: { data: [] } })),
        getActivity(7).catch(() => ({ data: { data: { series: [] } } })),
        getHealth().catch(() => ({ data: { data: null } }))
      ])
      if (!alive) return
      const s = statsRes.data?.data || statsRes.data || {}
      const sess = sessionsRes.data?.data || sessionsRes.data || []
      const act = activityRes.data?.data?.series || activityRes.data?.series || []
      const h = healthRes.data?.data || healthRes.data || null
      setStats(s)
      setSessions(Array.isArray(sess) ? sess : [])
      setActivity(Array.isArray(act) ? act : [])
      setHealth(h)
      setLoading(false)
    }
    load()
    const timer = setInterval(load, 60000)     // ← was 30000, now 60000
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Overview of your WhatsApp bot
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Messages (24h)" value={stats?.messages24h || 0} icon={MessageSquare} color="primary" />
        <StatCard title="Command Usage" value={stats?.totalCommandUsage || 0} icon={Terminal} color="accent" />
        <StatCard title="Active Sessions" value={stats?.activeSessions || 0} icon={Smartphone} color="green" />
        <StatCard title="Contacts" value={stats?.contacts || 0} icon={Users} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ActivityChart series={activity} />
        </div>
        <div className="space-y-4">
          <QuickActions />
          <HealthCard health={health} />
          <SessionMap sessions={sessions} />
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
          Bot Summary
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex flex-col gap-1">
            <span className="text-gray-500 text-xs">Active Sessions</span>
            <span className="text-gray-900 dark:text-white font-semibold text-lg">{stats?.activeSessions || 0}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-gray-500 text-xs">Rules</span>
            <span className="text-gray-900 dark:text-white font-semibold text-lg">{stats?.rules || 0}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-gray-500 text-xs">Contacts</span>
            <span className="text-gray-900 dark:text-white font-semibold text-lg">{stats?.contacts || 0}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-gray-500 text-xs">Messages (24h)</span>
            <span className="text-gray-900 dark:text-white font-semibold text-lg">{stats?.messages24h || 0}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
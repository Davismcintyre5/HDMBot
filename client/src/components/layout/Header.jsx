import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'
import { Menu, LogOut, Moon, Sun, Clock, Calendar, Server, Wifi, WifiOff } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import { getHealth } from '../../api/health'

export default function Header({ onMenuClick }) {
  const { user, logout } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()

  const [time, setTime] = useState(new Date())
  const [health, setHealth] = useState({
    server: false,
    whatsapp: false,
    sessionsConnected: 0,
    sessionsTotal: 0
  })

  useEffect(() => {
    const tick = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(tick)
  }, [])

  useEffect(() => {
    const check = async () => {
      try {
        const { data } = await getHealth()
        const payload = data?.data || data || {}
        const sessions = Array.isArray(payload.sessions) ? payload.sessions : []
        const sessionsConnected =
          typeof payload.sessionsConnected === 'number'
            ? payload.sessionsConnected
            : sessions.filter((s) => s && s.connected).length
        const sessionsTotal =
          typeof payload.sessionsTotal === 'number'
            ? payload.sessionsTotal
            : sessions.length
        const serverOk =
          payload.status === 'ok' ||
          payload.mongo === 'up' ||
          data?.success === true

        setHealth({
          server: !!serverOk,
          whatsapp: sessionsConnected > 0,
          sessionsConnected,
          sessionsTotal
        })
      } catch {
        setHealth((prev) => ({ ...prev, server: false, whatsapp: false }))
      }
    }
    check()
    const timer = setInterval(check, 8000)
    return () => clearInterval(timer)
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const greeting = () => {
    const h = time.getHours()
    if (h >= 5 && h < 12) return 'Good morning'
    if (h >= 12 && h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const fmtTime = (d) =>
    d.toLocaleTimeString('en-KE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    })

  const fmtDate = (d) =>
    d.toLocaleDateString('en-KE', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <div className="h-10 px-4 lg:px-6 flex items-center justify-between bg-gray-50 dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1.5">
            <Calendar size={12} />
            <span>{fmtDate(time)}</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            <Clock size={12} />
            <span className="font-mono">{fmtTime(time)}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div
              className={`w-2 h-2 rounded-full ${
                health.server ? 'bg-green-500 animate-pulse' : 'bg-red-500'
              }`}
            />
            <Server
              size={12}
              className={health.server ? 'text-green-500' : 'text-red-500'}
            />
            <span className={health.server ? 'text-green-500' : 'text-red-500'}>
              {health.server ? 'Online' : 'Offline'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {health.whatsapp ? (
              <Wifi size={12} className="text-green-500" />
            ) : (
              <WifiOff size={12} className="text-red-500" />
            )}
            <span className={health.whatsapp ? 'text-green-500' : 'text-red-500'}>
              WA
            </span>
          </div>
          <div className="hidden md:flex items-center gap-1.5 text-gray-400">
            <span>
              {health.sessionsConnected}/{health.sessionsTotal} devices
            </span>
          </div>
        </div>
      </div>

      <div className="h-14 flex items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 lg:hidden"
          >
            <Menu size={20} />
          </button>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {greeting()},{' '}
            <span className="text-gray-900 dark:text-white font-semibold">
              {user?.email?.split('@')[0] || user?.username || 'User'}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2">
            <Badge color={health.server ? 'green' : 'red'}>
              {health.server ? '🟢 Server' : '🔴 Server'}
            </Badge>
            <Badge color={health.whatsapp ? 'green' : 'red'}>
              {health.whatsapp ? '🟢 WA' : '🔴 WA'}
            </Badge>
          </div>

          <button
            onClick={toggle}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <Button variant="ghost" size="sm" icon={LogOut} onClick={handleLogout}>
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
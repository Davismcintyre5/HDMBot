import { NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import {
  LayoutDashboard,
  Smartphone,
  Zap,
  Settings,
  Radio,
  Users,
  Shield,
  Activity,
  X
} from 'lucide-react'

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/devices', icon: Smartphone, label: 'Devices' },
  { to: '/rules', icon: Shield, label: 'Rules' },
  { to: '/commands', icon: Zap, label: 'Commands' },
  { to: '/broadcast', icon: Radio, label: 'Broadcast' },
  { to: '/contacts', icon: Users, label: 'Contacts' },
  { to: '/health', icon: Activity, label: 'Health' },
  { to: '/settings', icon: Settings, label: 'Settings' }
]

export default function Sidebar({ onClose }) {
  const { user } = useAuth()

  return (
    <div className="h-full bg-gradient-to-b from-blue-950 via-blue-900 to-indigo-950 border-r border-blue-800/50 flex flex-col">
      <div className="h-16 flex items-center justify-between px-4 border-b border-blue-800/50">
        <NavLink to="/" className="flex items-center gap-2.5" onClick={onClose}>
          <div className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <span className="text-xl">🤖</span>
          </div>
          <div>
            <span className="font-bold text-lg text-white">HDM</span>
            <span className="font-bold text-lg text-blue-400">BOT</span>
          </div>
        </NavLink>
        <button
          onClick={onClose}
          className="lg:hidden text-blue-300 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                  : 'text-blue-200/80 hover:text-white hover:bg-blue-800/40'
              }`
            }
          >
            <link.icon size={20} />
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-blue-800/50">
        {user && (
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-blue-800/30">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold ring-2 ring-blue-400/30">
              {user.email?.charAt(0)?.toUpperCase() ||
                user.username?.charAt(0)?.toUpperCase() ||
                '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user.email || user.username}
              </p>
              <p className="text-xs text-blue-300">{user.role}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
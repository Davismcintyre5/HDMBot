import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Smartphone, Radio, Settings } from 'lucide-react'

const mobileLinks = [
  { to: '/', icon: LayoutDashboard, label: 'Home' },
  { to: '/devices', icon: Smartphone, label: 'Devices' },
  { to: '/broadcast', icon: Radio, label: 'Broadcast' },
  { to: '/settings', icon: Settings, label: 'Settings' }
]

export default function MobileNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
      <div className="flex justify-around">
        {mobileLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-2 px-3 text-xs ${
                isActive ? 'text-primary-600' : 'text-gray-500 dark:text-gray-400'
              }`
            }
          >
            <link.icon size={20} />
            <span>{link.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
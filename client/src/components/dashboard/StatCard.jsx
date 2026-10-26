import { TrendingUp, TrendingDown } from 'lucide-react'

export default function StatCard({ title, value, icon: Icon, trend, color = 'primary', className = '' }) {
  const colors = {
    primary: 'from-blue-600 to-blue-800',
    accent: 'from-cyan-600 to-cyan-800',
    green: 'from-green-600 to-green-800',
    red: 'from-red-600 to-red-800',
    yellow: 'from-yellow-600 to-yellow-800',
    purple: 'from-purple-600 to-purple-800',
  }

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 hover:border-gray-300 dark:hover:border-gray-700 transition-colors shadow-sm ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${colors[color]}`}>
          <Icon size={20} className="text-white" />
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-1 text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{title}</p>
    </div>
  )
}
import { TrendingUp, TrendingDown } from 'lucide-react'

export default function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  color = 'primary',
  compact = false,
  className = ''
}) {
  const colors = {
    primary: 'from-blue-600 to-blue-800',
    accent: 'from-cyan-600 to-cyan-800',
    green: 'from-green-600 to-green-800',
    red: 'from-red-600 to-red-800',
    yellow: 'from-yellow-600 to-yellow-800',
    purple: 'from-purple-600 to-purple-800'
  }

  return (
    <div
      className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors shadow-sm ${
        compact ? 'p-3' : 'p-5'
      } ${className}`}
    >
      <div className={`flex items-center justify-between ${compact ? 'mb-2' : 'mb-3'}`}>
        <div
          className={`rounded-xl bg-gradient-to-br ${colors[color]} ${
            compact ? 'p-1.5' : 'p-2.5'
          }`}
        >
          <Icon size={compact ? 16 : 20} className="text-white" />
        </div>
        {trend !== undefined && (
          <span
            className={`flex items-center gap-1 text-xs font-medium ${
              trend >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {trend >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p
        className={`font-bold text-gray-900 dark:text-white ${
          compact ? 'text-lg' : 'text-2xl'
        }`}
      >
        {value}
      </p>
      <p
        className={`text-gray-500 dark:text-gray-400 ${
          compact ? 'text-[11px] mt-0.5' : 'text-sm mt-1'
        }`}
      >
        {title}
      </p>
    </div>
  )
}
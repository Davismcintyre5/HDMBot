export default function Card({ children, className = '', hover = false }) {
  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm ${hover ? 'hover:border-gray-300 dark:hover:border-gray-700 transition-colors' : ''} ${className}`}>
      {children}
    </div>
  )
}
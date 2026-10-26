export default function ActivityChart({ series = [] }) {
  const max = Math.max(...series.map((d) => d.count), 1)

  const label = (dateStr) => {
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString(undefined, { weekday: 'short' })
    } catch {
      return dateStr.slice(5)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
        Message Activity (last {series.length} days)
      </h3>
      {series.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">No activity data</p>
      ) : (
        <div className="flex items-end gap-2 h-32">
          {series.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-md transition-all hover:from-blue-500 hover:to-blue-300"
                style={{
                  height: `${(d.count / max) * 100}%`,
                  minHeight: 4
                }}
                title={`${d.date}: ${d.count}`}
              />
              <span className="text-xs text-gray-500">{label(d.date)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
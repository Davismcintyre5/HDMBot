import { Edit, Trash2 } from 'lucide-react'
import Badge from '../ui/Badge'
import Toggle from '../ui/Toggle'

function triggerLabel(rule) {
  const t = rule.trigger || {}
  if (t.type === 'always') return 'always'
  return `${t.type}: ${t.pattern || ''}`
}

function actionLabel(rule) {
  const a = rule.action || {}
  if (a.type === 'reply') return a.payload?.text || '(empty)'
  if (a.type === 'react') return `react ${a.payload?.emoji || '?'}`
  if (a.type === 'forward') return `→ ${a.payload?.targetJid || '?'}`
  if (a.type === 'warn') return `warn: ${a.payload?.text || ''}`
  return a.type || '—'
}

export default function RuleTable({ rules, onEdit, onDelete, onToggle }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-800">
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Trigger
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Action
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Scope
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Matches
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Status
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
          {rules.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                No rules found
              </td>
            </tr>
          ) : (
            rules.map((rule) => (
              <tr key={rule._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3 text-gray-900 dark:text-white font-medium text-xs">
                  {rule.name}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono text-xs max-w-[180px] truncate">
                  {triggerLabel(rule)}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs max-w-[180px] truncate">
                  {actionLabel(rule)}
                </td>
                <td className="px-4 py-3">
                  <Badge color="blue">{rule.scope?.type || 'global'}</Badge>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">
                  {rule.matchCount || 0}
                </td>
                <td className="px-4 py-3">
                  <Toggle checked={rule.enabled !== false} onChange={() => onToggle(rule)} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 justify-end">
                    <button
                      onClick={() => onEdit(rule)}
                      className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => onDelete(rule)}
                      className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
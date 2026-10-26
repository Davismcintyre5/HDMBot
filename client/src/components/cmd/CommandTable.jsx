import { Eye } from 'lucide-react'
import Badge from '../ui/Badge'
import Toggle from '../ui/Toggle'

export default function CommandTable({ commands, onToggle, onView }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-800">
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Category
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Aliases
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Usage
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Enabled
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
          {commands.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                No commands found
              </td>
            </tr>
          ) : (
            commands.map((cmd) => (
              <tr
                key={cmd.name}
                className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <td className="px-4 py-3 text-gray-900 dark:text-white font-mono text-xs">
                  {cmd.name}
                </td>
                <td className="px-4 py-3">
                  <Badge>{cmd.category || 'general'}</Badge>
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                  {cmd.aliases?.length ? cmd.aliases.join(', ') : '—'}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">
                  {cmd.usageCount || 0}
                </td>
                <td className="px-4 py-3">
                  <Toggle
                    checked={cmd.enabled !== false}
                    onChange={() => onToggle(cmd)}
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 justify-end">
                    <button
                      onClick={() => onView(cmd)}
                      className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600"
                    >
                      <Eye size={16} />
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
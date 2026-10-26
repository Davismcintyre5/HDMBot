import { Send, Smile } from 'lucide-react'
import Button from '../ui/Button'

export default function ChatInput({ value, onChange, onSend, disabled }) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (value.trim()) onSend()
    }
  }

  return (
    <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 flex-shrink-0">
      <div className="flex items-end gap-2">
        <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <Smile size={20} />
        </button>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 max-h-32 text-gray-900 dark:text-white placeholder-gray-400"
        />
        <Button size="sm" icon={Send} onClick={onSend} disabled={disabled || !value.trim()}>
          Send
        </Button>
      </div>
    </div>
  )
}
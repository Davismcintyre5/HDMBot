import { useRef, useEffect } from 'react'
import { Phone, Video, MoreVertical } from 'lucide-react'
import MessageBubble from './MessageBubble'
import Spinner from '../ui/Spinner'
import Badge from '../ui/Badge'
import { getInitials } from '../../utils/helpers'

export default function ChatWindow({ chat, messages, loading, connected }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (!chat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center text-gray-400">
          <div className="text-5xl mb-3">💬</div>
          <p className="text-lg font-medium text-gray-500 dark:text-gray-400">Select a conversation</p>
          <p className="text-sm">Choose a chat from the left or start a new one</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-16 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 bg-white dark:bg-gray-900 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-600 to-indigo-600 flex items-center justify-center text-white font-medium text-sm">
            {getInitials(chat.name || chat.jid?.split('@')[0] || '?')}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {chat.name || chat.jid?.split('@')[0] || 'Unknown'}
            </p>
            <Badge color={connected ? 'green' : 'gray'}>
              {connected ? 'Online' : 'Offline'}
            </Badge>
          </div>
        </div>
        <div className="flex gap-1">
          <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"><Phone size={18} /></button>
          <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"><Video size={18} /></button>
          <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"><MoreVertical size={18} /></button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-950">
        {loading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            No messages yet. Say hello! 👋
          </div>
        ) : (
          messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} isMine={msg.direction === 'out'} />
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
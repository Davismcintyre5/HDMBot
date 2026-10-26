import { Search, MessageSquare } from 'lucide-react'
import { formatTime, getInitials, truncate } from '../../utils/helpers'

export default function ChatList({ chats, selectedChat, onSelect, search, onSearchChange }) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-200 dark:border-gray-800">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Search chats..."
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <MessageSquare size={32} className="mb-2" />
            <p className="text-sm">No conversations</p>
          </div>
        ) : (
          chats.map(chat => (
            <button
              key={chat.jid}
              onClick={() => onSelect(chat)}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left ${
                selectedChat?.jid === chat.jid ? 'bg-gray-100 dark:bg-gray-800 border-l-2 border-l-primary-500' : ''
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-600 to-indigo-600 flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
                {getInitials(chat.name || chat.jid?.split('@')[0] || '?')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {chat.name || chat.jid?.split('@')[0] || 'Unknown'}
                  </p>
                  <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{formatTime(chat.timestamp)}</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                  {truncate(chat.last_message, 35) || 'No messages'}
                </p>
              </div>
              {chat.unread > 0 && (
                <span className="bg-primary-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                  {chat.unread}
                </span>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  )
}
export default function MessageBubble({ message, isMine }) {
  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${
        isMine
          ? 'bg-primary-600 text-white rounded-br-md'
          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-md border border-gray-200 dark:border-gray-700'
      }`}>
        <p className="whitespace-pre-wrap break-words">{message.body}</p>
        {message.timestamp && (
          <p className={`text-xs mt-1 ${isMine ? 'text-white/70' : 'text-gray-400'}`}>
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    </div>
  )
}
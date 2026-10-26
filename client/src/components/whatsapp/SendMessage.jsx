import { useState } from 'react'
import { Send } from 'lucide-react'
import Button from '../ui/Button'
import { useToast } from '../../hooks/useToast'
import { sendMessage } from '../../api/chats'

export default function SendMessage() {
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const { toast } = useToast()

  const handleSend = async () => {
    if (!phone.trim() || !message.trim()) {
      return toast.error('Phone and message required')
    }
    setSending(true)
    try {
      const jid = `${phone.replace(/[^0-9]/g, '')}@s.whatsapp.net`
      await sendMessage(jid, message.trim())
      toast.success('Message sent!')
      setMessage('')
    } catch {
      toast.error('Failed to send')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Send Message</h3>
      <input
        type="text"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="input-field text-sm mb-2"
        placeholder="Phone number (254...)"
      />
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={2}
        className="input-field text-sm resize-none mb-3"
        placeholder="Type message..."
      />
      <Button icon={Send} onClick={handleSend} disabled={sending} className="w-full">
        {sending ? 'Sending...' : 'Send'}
      </Button>
    </div>
  )
}
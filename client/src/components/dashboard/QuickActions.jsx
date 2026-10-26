import { useNavigate } from 'react-router-dom'
import Button from '../ui/Button'
import { Send, Terminal, Bot, Users } from 'lucide-react'

export default function QuickActions() {
  const navigate = useNavigate()

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
        Quick Actions
      </h3>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" icon={Send} onClick={() => navigate('/broadcast')} className="w-full">
          Broadcast
        </Button>
        <Button variant="secondary" icon={Terminal} onClick={() => navigate('/commands')} className="w-full">
          Commands
        </Button>
        <Button variant="secondary" icon={Bot} onClick={() => navigate('/rules')} className="w-full">
          Rules
        </Button>
        <Button variant="secondary" icon={Users} onClick={() => navigate('/contacts')} className="w-full">
          Contacts
        </Button>
      </div>
    </div>
  )
}
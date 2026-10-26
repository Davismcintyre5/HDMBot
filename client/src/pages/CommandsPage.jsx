import { useState, useEffect } from 'react'
import { Search, Terminal } from 'lucide-react'
import { listCommands, updateCommand } from '../api/commands'
import { listSessions } from '../api/sessions'
import CommandTable from '../components/cmd/CommandTable'
import Button from '../components/ui/Button'
import Select from '../components/ui/Select'
import Modal from '../components/ui/Modal'
import Badge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import { useToast } from '../hooks/useToast'
import { DEFAULT_SESSION, COMMAND_CATEGORIES } from '../utils/constants'

export default function CommandsPage() {
  const [commands, setCommands] = useState([])
  const [sessions, setSessions] = useState([])
  const [sessionId, setSessionId] = useState(DEFAULT_SESSION)
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [viewing, setViewing] = useState(null)
  const { toast } = useToast()

  useEffect(() => {
    listSessions()
      .then(({ data }) => {
        const items = data?.data || data || []
        setSessions(Array.isArray(items) ? items : [])
      })
      .catch(() => {})
  }, [])

  const fetchCommands = async () => {
    setLoading(true)
    try {
      const params = { sessionId }
      if (category) params.category = category
      const { data } = await listCommands(params)
      const items = data?.data || data || []
      setCommands(Array.isArray(items) ? items : [])
    } catch {
      toast.error('Failed to load commands')
      setCommands([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCommands()
  }, [sessionId, category])

  const handleToggle = async (cmd) => {
    try {
      await updateCommand(cmd.name, { enabled: cmd.enabled === false })
      toast.success(cmd.enabled === false ? 'Enabled' : 'Disabled')
      fetchCommands()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Toggle failed')
    }
  }

  const filtered = commands.filter(
    (c) =>
      (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.category || '').toLowerCase().includes(search.toLowerCase())
  )

  const sessionOptions = sessions.map((s) => ({
    value: s.sessionId,
    label: `${s.sessionId}${s.connected ? ' (connected)' : ''}`
  }))

  const categoryOptions = [
    { value: '', label: 'All Categories' },
    ...COMMAND_CATEGORIES.map((c) => ({ value: c, label: c }))
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Commands</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {filtered.length} commands available
          </p>
        </div>
        <div className="flex gap-2 items-end flex-wrap">
          {sessions.length > 0 && (
            <div className="min-w-[200px]">
              <Select
                label="Session"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                options={sessionOptions}
              />
            </div>
          )}
          <div className="min-w-[180px]">
            <Select
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={categoryOptions}
            />
          </div>
        </div>
      </div>

      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-10"
          placeholder="Search commands..."
        />
      </div>

      <div className="card">
        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Terminal}
            title="No commands"
            description="Commands are registered from code on server startup"
          />
        ) : (
          <CommandTable
            commands={filtered}
            onToggle={handleToggle}
            onView={setViewing}
          />
        )}
      </div>

      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing ? `Command: ${viewing.name}` : ''}
      >
        {viewing && (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Name</span>
              <span className="font-mono">{viewing.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Category</span>
              <Badge>{viewing.category}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Description</span>
              <span className="text-right max-w-[60%]">{viewing.desc || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Aliases</span>
              <span className="text-right max-w-[60%] font-mono text-xs">
                {viewing.aliases?.length ? viewing.aliases.join(', ') : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Cooldown</span>
              <span>{viewing.cooldownMs} ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Owner only</span>
              <span>{viewing.ownerOnly ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Admin only</span>
              <span>{viewing.adminOnly ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Usage</span>
              <span>{viewing.usageCount || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Last used</span>
              <span>{viewing.lastUsedAt || 'Never'}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
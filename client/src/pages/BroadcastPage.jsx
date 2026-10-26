import { useState, useEffect } from 'react'
import { Radio, Send, History, CheckCircle, Users } from 'lucide-react'
import { sendBroadcast, getBroadcastHistory, previewBroadcast } from '../api/broadcast'
import { listSessions } from '../api/sessions'
import { listContacts } from '../api/contacts'
import { useSocket } from '../hooks/useSocket'
import Button from '../components/ui/Button'
import Select from '../components/ui/Select'
import Badge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'
import { useToast } from '../hooks/useToast'
import { DEFAULT_SESSION } from '../utils/constants'
import { formatDate } from '../utils/helpers'

export default function BroadcastPage() {
  const [message, setMessage] = useState('')
  const [sessionId, setSessionId] = useState(DEFAULT_SESSION)
  const [sessions, setSessions] = useState([])
  const [contacts, setContacts] = useState([])
  const [filterKind, setFilterKind] = useState('')
  const [filterTag, setFilterTag] = useState('')
  const [history, setHistory] = useState([])
  const [progress, setProgress] = useState(null)
  const [sending, setSending] = useState(false)
  const [previewCount, setPreviewCount] = useState(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const { socket } = useSocket()

  useEffect(() => {
    const init = async () => {
      try {
        const [sessRes, histRes] = await Promise.all([
          listSessions().catch(() => ({ data: { data: [] } })),
          getBroadcastHistory(sessionId).catch(() => ({ data: { data: { items: [] } } }))
        ])
        const sess = sessRes.data?.data || sessRes.data || []
        const hist = histRes.data?.data?.items || histRes.data?.items || []
        setSessions(Array.isArray(sess) ? sess : [])
        setHistory(Array.isArray(hist) ? hist : [])
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [sessionId])

  useEffect(() => {
    if (!socket) return
    const handler = (p) => {
      if (progress?.jobId && p.jobId !== progress.jobId) return
      setProgress(p)
      if (p.done) {
        setSending(false)
        toast.success(`Broadcast finished (${p.sent} sent, ${p.failed} failed)`)
        loadHistory()
      }
    }
    socket.on('broadcast:progress', handler)
    return () => socket.off('broadcast:progress', handler)
  }, [socket, progress?.jobId, toast])

  const loadHistory = async () => {
    try {
      const { data } = await getBroadcastHistory(sessionId)
      const items = data?.data?.items || data?.items || []
      setHistory(Array.isArray(items) ? items : [])
    } catch {}
  }

  const fetchContacts = async () => {
    try {
      const { data } = await listContacts({ sessionId })
      const payload = data?.data || data
      const items = payload?.items || (Array.isArray(payload) ? payload : [])
      setContacts(items)
    } catch {
      setContacts([])
    }
  }

  useEffect(() => {
    fetchContacts()
  }, [sessionId])

  const buildFilter = () => {
    const f = {}
    if (filterKind) f.kind = filterKind
    if (filterTag) f.tag = filterTag
    return Object.keys(f).length ? f : null
  }

  const handlePreview = async () => {
    try {
      const filter = buildFilter()
      if (!filter) return toast.error('Set a filter first')
      const { data } = await previewBroadcast({ sessionId, contactFilter: filter })
      const count = data?.data?.count ?? data?.count ?? 0
      setPreviewCount(count)
      toast.info(`${count} contacts match`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Preview failed')
    }
  }

  const handleSend = async () => {
    if (!message.trim()) return toast.error('Message is required')
    const filter = buildFilter()
    if (!filter) return toast.error('Set a filter to choose recipients')
    setSending(true)
    setProgress(null)
    try {
      const { data } = await sendBroadcast({
        sessionId,
        contactFilter: filter,
        text: message.trim()
      })
      const job = data?.data || data
      setProgress({ jobId: job.jobId, sent: 0, failed: 0, total: job.targetCount, done: false })
      toast.info(`Broadcast started (${job.targetCount} targets)`)
      setMessage('')
      setPreviewCount(null)
      loadHistory()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Send failed')
      setSending(false)
    }
  }

  const connectedSessions = sessions.filter((s) => s.connected)
  const sessionOptions = sessions.map((s) => ({
    value: s.sessionId,
    label: `${s.sessionId}${s.connected ? ' (connected)' : ''}`
  }))

  const kindOptions = [
    { value: '', label: 'All Contacts' },
    { value: 'user', label: 'Users Only' },
    { value: 'group', label: 'Groups Only' }
  ]

  const tags = Array.from(new Set(contacts.flatMap((c) => c.tags || [])))
  const tagOptions = [
    { value: '', label: 'Any Tag' },
    ...tags.map((t) => ({ value: t, label: t }))
  ]

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Broadcast</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Send messages to contacts matching filters
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Radio size={20} className="text-blue-500" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Compose</h3>
                <p className="text-xs text-gray-500">
                  {connectedSessions.length} connected session(s)
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <Select
                label="Session"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                options={sessionOptions}
              />
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Contact Kind"
                  value={filterKind}
                  onChange={(e) => setFilterKind(e.target.value)}
                  options={kindOptions}
                />
                <Select
                  label="Tag"
                  value={filterTag}
                  onChange={(e) => setFilterTag(e.target.value)}
                  options={tagOptions}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={handlePreview}>
                  Preview
                </Button>
                {previewCount !== null && (
                  <span className="text-xs text-gray-500">
                    {previewCount} matching contacts
                  </span>
                )}
              </div>
            </div>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="input-field resize-none"
              placeholder="Type your broadcast message..."
            />

            <div className="flex justify-between items-center mt-4">
              <span className="text-xs text-gray-500">{message.length} chars</span>
              <Button
                icon={Send}
                onClick={handleSend}
                disabled={sending || !message.trim() || !buildFilter()}
              >
                {sending ? 'Sending...' : 'Send Broadcast'}
              </Button>
            </div>

            {progress && (
              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                  <span>Progress</span>
                  <span>
                    {progress.sent + progress.failed} / {progress.total}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${((progress.sent + progress.failed) / progress.total) * 100}%`
                    }}
                  />
                </div>
                <div className="flex gap-4 mt-2 text-xs">
                  <span className="text-green-500">Sent: {progress.sent}</span>
                  <span className="text-red-500">Failed: {progress.failed}</span>
                </div>
              </div>
            )}
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <History size={18} className="text-gray-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white">History</h3>
            </div>
            {history.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No broadcasts yet</p>
            ) : (
              <div className="space-y-3">
                {history.slice(0, 10).map((b, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-white truncate">
                        {b.meta?.jobId?.slice(0, 8) || 'Broadcast'}
                      </p>
                      <p className="text-xs text-gray-500">{formatDate(b.timestamp)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        {b.meta?.sent || 0}/{b.meta?.targetCount || 0}
                      </span>
                      <Badge color={b.severity === 'info' ? 'green' : 'yellow'}>
                        {b.meta?.sent === b.meta?.targetCount ? 'ok' : 'partial'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Users size={18} className="text-green-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                Active Sessions
              </h3>
            </div>
            {connectedSessions.length === 0 ? (
              <p className="text-gray-400 text-xs">None connected</p>
            ) : (
              <div className="space-y-2">
                {connectedSessions.map((s) => (
                  <div key={s.sessionId} className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-gray-700 dark:text-gray-300">{s.sessionId}</span>
                    <span className="text-gray-400 text-xs ml-auto">
                      {s.phoneNumber || '—'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle size={18} className="text-blue-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Quick Stats</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Sessions</span>
                <span>{sessions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Connected</span>
                <span className="text-green-500">{connectedSessions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Contacts</span>
                <span>{contacts.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Broadcasts</span>
                <span>{history.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
import { useState, useEffect, useCallback } from 'react'
import { Plus, Smartphone, RefreshCw, Zap } from 'lucide-react'
import {
  listSessions,
  createSession,
  deleteSession,
  connectSession,
  disconnectSession,
  syncSession
} from '../api/sessions'
import DeviceCard from '../components/device/DeviceCard'
import QRModal from '../components/device/QRModal'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import EmptyState from '../components/ui/EmptyState'
import Spinner from '../components/ui/Spinner'
import { useToast } from '../hooks/useToast'
import { useSocket } from '../hooks/useSocket'
import { DEFAULT_SESSION } from '../utils/constants'

export default function DevicePage() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [qrSession, setQrSession] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [selectedSession, setSelectedSession] = useState(null)
  const [newSessionId, setNewSessionId] = useState('')
  const { toast } = useToast()
  const { socket } = useSocket()

  const fetchSessions = useCallback(async () => {
    try {
      const { data } = await listSessions()
      const items = data?.data || data || []
      setSessions(Array.isArray(items) ? items : [])
    } catch {
      toast.error('Failed to load sessions')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  useEffect(() => {
    if (!socket) return
    const handler = () => fetchSessions()
    socket.on('session_status', handler)
    socket.on('sessions', handler)
    return () => {
      socket.off('session_status', handler)
      socket.off('sessions', handler)
    }
  }, [socket, fetchSessions])

  const handleConnectDefault = async () => {
    try {
      await connectSession(DEFAULT_SESSION)
      toast.info('Connecting...')
      fetchSessions()
      setTimeout(() => {
        setQrSession(DEFAULT_SESSION)
        setQrModalOpen(true)
      }, 500)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Connect failed')
    }
  }

  const handleConnect = async (sessionId) => {
    try {
      await connectSession(sessionId)
      toast.info('Connecting...')
      fetchSessions()
      setTimeout(() => {
        setQrSession(sessionId)
        setQrModalOpen(true)
      }, 500)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Connect failed')
    }
  }

  const handleDisconnect = async (sessionId) => {
    try {
      await disconnectSession(sessionId)
      toast.success('Disconnected')
      fetchSessions()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Disconnect failed')
    }
  }

  const handleSync = async (sessionId) => {
    try {
      await syncSession(sessionId)
      toast.success('Backup flushed')
      fetchSessions()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Sync failed')
    }
  }

  const handleViewQR = (sessionId) => {
    setQrSession(sessionId)
    setQrModalOpen(true)
  }

  const handleDelete = async () => {
    if (!selectedSession) return
    try {
      await deleteSession(selectedSession.sessionId)
      toast.success('Session deleted')
      setConfirmOpen(false)
      setSelectedSession(null)
      fetchSessions()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed')
    }
  }

  const handleAddSession = async () => {
    const id = newSessionId.trim()
    if (!id) return toast.error('Session ID is required')
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      return toast.error('Only letters, numbers, dash, underscore')
    }
    try {
      await createSession(id)
      toast.success('Session created')
      setAddModalOpen(false)
      setNewSessionId('')
      fetchSessions()
      setTimeout(() => {
        setQrSession(id)
        setQrModalOpen(true)
      }, 500)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Create failed')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    )
  }

  const connectedCount = sessions.filter((s) => s.connected).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Devices</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {sessions.length} session{sessions.length !== 1 ? 's' : ''} • {connectedCount} connected
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" icon={Zap} onClick={handleConnectDefault}>
            Connect Default
          </Button>
          <Button variant="secondary" icon={RefreshCw} onClick={fetchSessions}>
            Refresh
          </Button>
          <Button icon={Plus} onClick={() => setAddModalOpen(true)}>
            Add Device
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sessions.length === 0 ? (
          <div className="md:col-span-2 lg:col-span-3">
            <EmptyState
              icon={Smartphone}
              title="No devices"
              description="Add a WhatsApp session to get started"
              action={
                <div className="flex gap-2">
                  <Button icon={Zap} onClick={handleConnectDefault}>
                    Connect Default
                  </Button>
                  <Button icon={Plus} onClick={() => setAddModalOpen(true)}>
                    Add Device
                  </Button>
                </div>
              }
            />
          </div>
        ) : (
          sessions.map((s) => (
            <DeviceCard
              key={s.sessionId}
              session={s}
              isDefault={s.sessionId === DEFAULT_SESSION}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              onQR={handleViewQR}
              onDelete={(sess) => {
                setSelectedSession(sess)
                setConfirmOpen(true)
              }}
              onSync={handleSync}
            />
          ))
        )}
      </div>

      <Modal open={addModalOpen} onClose={() => setAddModalOpen(false)} title="Add Device">
        <div className="space-y-4">
          <Input
            label="Session ID *"
            value={newSessionId}
            onChange={(e) => setNewSessionId(e.target.value)}
            placeholder="WORK-BOT"
          />
          <p className="text-xs text-gray-500">
            Letters, numbers, dash, underscore. Must be unique.
          </p>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={() => setAddModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSession}>Add Device</Button>
          </div>
        </div>
      </Modal>

      <QRModal
        open={qrModalOpen}
        onClose={() => {
          setQrModalOpen(false)
          setQrSession(null)
        }}
        sessionId={qrSession}
      />

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete Device"
        message={`Delete "${selectedSession?.sessionId}"? This logs out the WhatsApp session permanently.`}
        confirmText="Delete"
      />
    </div>
  )
}
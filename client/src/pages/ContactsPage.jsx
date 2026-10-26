import { useState, useEffect, useCallback } from 'react'
import { Users, Search, Plus, Trash2, Edit3, Ban, RefreshCw } from 'lucide-react'
import {
  listContacts,
  createContact,
  updateContact,
  deleteContact,
  syncContact
} from '../api/contacts'
import { listSessions } from '../api/sessions'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Modal from '../components/ui/Modal'
import Badge from '../components/ui/Badge'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import EmptyState from '../components/ui/EmptyState'
import Spinner from '../components/ui/Spinner'
import { useToast } from '../hooks/useToast'
import { DEFAULT_SESSION, CONTACT_KINDS } from '../utils/constants'
import { normalizeNumber, isValidNumber, toJid } from '../utils/helpers'

export default function ContactsPage() {
  const [contacts, setContacts] = useState([])
  const [sessions, setSessions] = useState([])
  const [sessionId, setSessionId] = useState(DEFAULT_SESSION)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [form, setForm] = useState({
    kind: 'user',
    number: '',
    displayName: '',
    notes: '',
    tags: '',
    blacklisted: false
  })
  const { toast } = useToast()

  useEffect(() => {
    listSessions()
      .then(({ data }) => {
        const items = data?.data || data || []
        setSessions(Array.isArray(items) ? items : [])
      })
      .catch(() => {})
  }, [])

  const loadContacts = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await listContacts({ sessionId })
      const payload = data?.data || data
      const items = payload?.items || (Array.isArray(payload) ? payload : [])
      setContacts(items)
    } catch {
      toast.error('Failed to load contacts')
      setContacts([])
    } finally {
      setLoading(false)
    }
  }, [sessionId, toast])

  useEffect(() => {
    loadContacts()
  }, [loadContacts])

  const openAdd = () => {
    setEditing(null)
    setForm({ kind: 'user', number: '', displayName: '', notes: '', tags: '', blacklisted: false })
    setModalOpen(true)
  }

  const openEdit = (contact) => {
    setEditing(contact)
    setForm({
      kind: contact.kind,
      number: contact.number || '',
      displayName: contact.displayName || '',
      notes: contact.notes || '',
      tags: (contact.tags || []).join(', '),
      blacklisted: !!contact.blacklisted
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (form.kind === 'user') {
      if (!isValidNumber(form.number)) {
        return toast.error('Phone must be 10-15 digits')
      }
    } else {
      if (!form.number.includes('@g.us')) {
        return toast.error('Group JID must end with @g.us')
      }
    }

    const jid =
      form.kind === 'user'
        ? toJid(form.number)
        : form.number.trim()

    const payload = {
      sessionId,
      jid,
      displayName: form.displayName || null,
      notes: form.notes || null,
      tags: form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      blacklisted: form.blacklisted
    }

    try {
      if (editing?._id) {
        const patch = {
          displayName: payload.displayName,
          notes: payload.notes,
          tags: payload.tags,
          blacklisted: payload.blacklisted
        }
        await updateContact(editing.jid, sessionId, patch)
        toast.success('Contact updated')
      } else {
        await createContact(payload)
        toast.success('Contact created')
      }
      setModalOpen(false)
      setEditing(null)
      loadContacts()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save')
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await deleteContact(deleting.jid, sessionId)
      toast.success('Contact deleted')
      setConfirmOpen(false)
      setDeleting(null)
      loadContacts()
    } catch {
      toast.error('Failed to delete')
    }
  }

  const handleSync = async (contact) => {
    try {
      await syncContact(sessionId, contact.jid)
      toast.success('Synced from WhatsApp')
      loadContacts()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Sync failed')
    }
  }

  const filtered = contacts.filter((c) => {
    const q = search.toLowerCase()
    return (
      (c.displayName || '').toLowerCase().includes(q) ||
      (c.waName || '').toLowerCase().includes(q) ||
      (c.number || '').includes(q) ||
      (c.jid || '').toLowerCase().includes(q)
    )
  })

  const sessionOptions = sessions.map((s) => ({
    value: s.sessionId,
    label: `${s.sessionId}${s.connected ? ' (connected)' : ''}`
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Contacts</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {contacts.length} contacts
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
          <Button icon={Plus} onClick={openAdd}>
            Add Contact
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-10"
          placeholder="Search contacts..."
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="md:col-span-2 lg:col-span-3 flex justify-center py-10">
            <Spinner />
          </div>
        ) : filtered.length === 0 ? (
          <div className="md:col-span-2 lg:col-span-3">
            <EmptyState
              icon={Users}
              title="No contacts"
              description="Add contacts to manage them here"
              action={
                <Button icon={Plus} onClick={openAdd}>
                  Add Contact
                </Button>
              }
            />
          </div>
        ) : (
          filtered.map((contact) => (
            <div
              key={contact._id}
              className="card p-5 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-medium text-sm">
                    {(contact.displayName || contact.waName || contact.number || '?')
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {contact.displayName || contact.waName || contact.number || 'Unknown'}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {contact.number || contact.jid?.split('@')[0]}
                    </p>
                  </div>
                </div>
                {contact.blacklisted && <Badge color="red">Blocked</Badge>}
              </div>

              {contact.notes && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  {contact.notes}
                </p>
              )}

              {contact.tags?.length > 0 && (
                <div className="flex gap-1 flex-wrap mb-3">
                  {contact.tags.map((tag, i) => (
                    <Badge key={i} color="blue">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => handleSync(contact)}
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
                  title="Sync from WhatsApp"
                >
                  <RefreshCw size={16} />
                </button>
                <button
                  onClick={() => openEdit(contact)}
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
                  title="Edit"
                >
                  <Edit3 size={16} />
                </button>
                <button
                  onClick={() => {
                    updateContact(contact.jid, sessionId, { blacklisted: !contact.blacklisted })
                      .then(() => {
                        toast.success(contact.blacklisted ? 'Unblocked' : 'Blocked')
                        loadContacts()
                      })
                      .catch(() => toast.error('Failed'))
                  }}
                  className={`p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 ${
                    contact.blacklisted ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
                  }`}
                  title={contact.blacklisted ? 'Unblock' : 'Block'}
                >
                  <Ban size={16} />
                </button>
                <button
                  onClick={() => {
                    setDeleting(contact)
                    setConfirmOpen(true)
                  }}
                  className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 ml-auto"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditing(null)
        }}
        title={editing ? 'Edit Contact' : 'Add Contact'}
      >
        <div className="space-y-4">
          {!editing && (
            <>
              <Select
                label="Type"
                value={form.kind}
                onChange={(e) => setForm({ ...form, kind: e.target.value })}
                options={CONTACT_KINDS}
              />
              <Input
                label={form.kind === 'user' ? 'Phone Number *' : 'Group JID *'}
                value={form.number}
                onChange={(e) => setForm({ ...form, number: e.target.value })}
                placeholder={
                  form.kind === 'user' ? '254712345678' : '120363xxxxxxxxxx@g.us'
                }
              />
            </>
          )}
          <Input
            label="Display Name"
            value={form.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            placeholder="John Doe"
          />
          <Input
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Met at conference..."
          />
          <Input
            label="Tags (comma separated)"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            placeholder="vip, customer"
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.blacklisted}
              onChange={(e) => setForm({ ...form, blacklisted: e.target.checked })}
            />
            <span className="text-gray-700 dark:text-gray-300">Blacklisted</span>
          </label>
          <div className="flex gap-3 justify-end pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setModalOpen(false)
                setEditing(null)
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSave}>{editing ? 'Update' : 'Create'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete Contact"
        message={`Delete "${deleting?.displayName || deleting?.number}"?`}
        confirmText="Delete"
      />
    </div>
  )
}
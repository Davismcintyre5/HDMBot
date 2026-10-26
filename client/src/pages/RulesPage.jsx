import { useState, useEffect } from 'react'
import { Plus, Shield } from 'lucide-react'
import { listRules, createRule, updateRule, deleteRule, testRule } from '../api/rules'
import { listSessions } from '../api/sessions'
import RuleTable from '../components/automation/RuleTable'
import RuleForm from '../components/automation/RuleForm'
import RuleTester from '../components/automation/RuleTester'
import Button from '../components/ui/Button'
import Select from '../components/ui/Select'
import Modal from '../components/ui/Modal'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { useToast } from '../hooks/useToast'
import { DEFAULT_SESSION } from '../utils/constants'

export default function RulesPage() {
  const [rules, setRules] = useState([])
  const [sessions, setSessions] = useState([])
  const [sessionId, setSessionId] = useState(DEFAULT_SESSION)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const { toast } = useToast()

  useEffect(() => {
    listSessions()
      .then(({ data }) => {
        const items = data?.data || data || []
        setSessions(Array.isArray(items) ? items : [])
      })
      .catch(() => {})
  }, [])

  const fetchRules = async (sid) => {
    setLoading(true)
    try {
      const { data } = await listRules({ sessionId: sid })
      const payload = data?.data || data
      const items = payload?.items || (Array.isArray(payload) ? payload : [])
      setRules(items)
    } catch {
      toast.error('Failed to load rules')
      setRules([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (sessionId) fetchRules(sessionId)
  }, [sessionId])

  const handleSave = async (formData) => {
    try {
      if (editing?._id) {
        await updateRule(editing._id, formData)
        toast.success('Rule updated')
      } else {
        await createRule(formData)
        toast.success('Rule created')
      }
      setModalOpen(false)
      setEditing(null)
      fetchRules(sessionId)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save')
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await deleteRule(deleting._id)
      toast.success('Rule deleted')
      setConfirmOpen(false)
      setDeleting(null)
      fetchRules(sessionId)
    } catch {
      toast.error('Failed to delete')
    }
  }

  const handleToggle = async (rule) => {
    try {
      await updateRule(rule._id, { enabled: rule.enabled === false })
      toast.success(rule.enabled === false ? 'Enabled' : 'Disabled')
      fetchRules(sessionId)
    } catch {
      toast.error('Failed to toggle')
    }
  }

  const sessionOptions = sessions.map((s) => ({
    value: s.sessionId,
    label: `${s.sessionId}${s.connected ? ' (connected)' : ''}`
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Auto Reply Rules</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {rules.length} rules configured
          </p>
        </div>
        <div className="flex gap-2 items-end flex-wrap">
          {sessions.length > 0 && (
            <div className="min-w-[220px]">
              <Select
                label="Session"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                options={sessionOptions}
              />
            </div>
          )}
          <Button icon={Plus} onClick={() => { setEditing(null); setModalOpen(true) }}>
            Add Rule
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card">
            {loading ? (
              <div className="flex justify-center py-10">
                <Spinner />
              </div>
            ) : rules.length === 0 ? (
              <EmptyState
                icon={Shield}
                title="No rules"
                description="Create auto-reply rules to respond automatically"
                action={
                  <Button icon={Plus} onClick={() => setModalOpen(true)}>
                    Add Rule
                  </Button>
                }
              />
            ) : (
              <RuleTable
                rules={rules}
                onEdit={(r) => { setEditing(r); setModalOpen(true) }}
                onDelete={(r) => { setDeleting(r); setConfirmOpen(true) }}
                onToggle={handleToggle}
              />
            )}
          </div>
        </div>
        <div>
          <RuleTester rules={rules} onTest={testRule} />
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null) }}
        title={editing ? 'Edit Rule' : 'Add Rule'}
        size="lg"
      >
        <RuleForm
          initial={editing}
          sessionId={sessionId}
          onSave={handleSave}
          onCancel={() => { setModalOpen(false); setEditing(null) }}
        />
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete Rule"
        message={`Delete rule "${deleting?.name}"?`}
        confirmText="Delete"
      />
    </div>
  )
}
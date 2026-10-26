import { useState, useEffect, useCallback } from 'react'
import { getDefaults, listSettings, setSetting, resetSetting } from '../api/settings'
import { listSessions } from '../api/sessions'
import { Bot, Shield, Save, RotateCcw, Radio } from 'lucide-react'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Spinner from '../components/ui/Spinner'
import { useToast } from '../hooks/useToast'
import { DEFAULT_SESSION, SETTING_KEYS } from '../utils/constants'

export default function SettingsPage() {
  const [sessionId, setSessionId] = useState(DEFAULT_SESSION)
  const [sessions, setSessions] = useState([])
  const [settings, setSettings] = useState({})
  const [defaults, setDefaults] = useState({})
  const [loading, setLoading] = useState(true)
  const [prefixInput, setPrefixInput] = useState('')
  const [delayInput, setDelayInput] = useState(3000)
  const [saving, setSaving] = useState({})
  const { toast } = useToast()

  useEffect(() => {
    listSessions()
      .then(({ data }) => {
        const items = data?.data || data || []
        setSessions(Array.isArray(items) ? items : [])
      })
      .catch(() => {})
    getDefaults()
      .then(({ data }) => {
        const d = data?.data || data || {}
        setDefaults(d)
      })
      .catch(() => {})
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await listSettings(sessionId)
      const payload = data?.data || data || {}
      setSettings(payload)
      setPrefixInput(payload?.prefix?.value ?? defaults?.prefix ?? '.')
      setDelayInput(payload?.broadcast_delay_ms?.value ?? defaults?.broadcast_delay_ms ?? 3000)
    } catch {
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [sessionId, defaults, toast])

  useEffect(() => {
    load()
  }, [load])

  const save = async (key, value) => {
    setSaving((prev) => ({ ...prev, [key]: true }))
    try {
      await setSetting(key, value, sessionId)
      toast.success(`${key} saved`)
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed')
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }))
    }
  }

  const reset = async (key) => {
    try {
      await resetSetting(key, sessionId)
      toast.success(`${key} reset`)
      load()
    } catch {
      toast.error('Reset failed')
    }
  }

  const prefixValue = settings?.prefix?.value ?? defaults?.prefix ?? '.'
  const antiDelete = settings?.anti_delete?.value ?? defaults?.anti_delete ?? true
  const delayValue = settings?.broadcast_delay_ms?.value ?? defaults?.broadcast_delay_ms ?? 3000

  const sessionOptions = sessions.map((s) => ({
    value: s.sessionId,
    label: `${s.sessionId}${s.connected ? ' (connected)' : ''}`
  }))

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Per-session configuration
          </p>
        </div>
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
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Bot size={20} className="text-blue-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Command Prefix
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Single punctuation character. Currently: <span className="font-mono">{prefixValue}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-3 items-end">
          <Input
            value={prefixInput}
            onChange={(e) => setPrefixInput(e.target.value.slice(0, 1))}
            className="max-w-[100px] font-mono text-center"
            maxLength={1}
          />
          <Button
            onClick={() => save(SETTING_KEYS.PREFIX, prefixInput)}
            disabled={saving[SETTING_KEYS.PREFIX] || !prefixInput}
            icon={Save}
          >
            Save
          </Button>
          <Button variant="ghost" icon={RotateCcw} onClick={() => reset(SETTING_KEYS.PREFIX)}>
            Reset
          </Button>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-red-500/10">
            <Shield size={20} className="text-red-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Anti-Delete
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Recover deleted messages and forward to owner
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => save(SETTING_KEYS.ANTI_DELETE, !antiDelete)}
            disabled={saving[SETTING_KEYS.ANTI_DELETE]}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              antiDelete ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <div
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                antiDelete ? 'translate-x-5' : ''
              }`}
            />
          </button>
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {antiDelete ? 'Enabled' : 'Disabled'}
          </span>
          <Button
            variant="ghost"
            size="sm"
            icon={RotateCcw}
            onClick={() => reset(SETTING_KEYS.ANTI_DELETE)}
            className="ml-auto"
          >
            Reset
          </Button>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-purple-500/10">
            <Radio size={20} className="text-purple-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Broadcast Delay
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Time between messages. Currently: {delayValue} ms
            </p>
          </div>
        </div>
        <div className="flex gap-3 items-end">
          <Input
            type="number"
            value={delayInput}
            onChange={(e) => setDelayInput(Number(e.target.value) || 0)}
            className="max-w-[140px]"
            min={1000}
            max={30000}
            step={500}
          />
          <Button
            onClick={() => save(SETTING_KEYS.BROADCAST_DELAY_MS, delayInput)}
            disabled={saving[SETTING_KEYS.BROADCAST_DELAY_MS]}
            icon={Save}
          >
            Save
          </Button>
          <Button
            variant="ghost"
            icon={RotateCcw}
            onClick={() => reset(SETTING_KEYS.BROADCAST_DELAY_MS)}
          >
            Reset
          </Button>
        </div>
        <p className="text-xs text-gray-400 mt-2">Range: 1000 – 30000 ms</p>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
          Session Details
        </h3>
        <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
          sessionId: {sessionId}
        </div>
      </div>
    </div>
  )
}
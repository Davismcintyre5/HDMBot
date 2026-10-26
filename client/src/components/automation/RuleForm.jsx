import { useState } from 'react'
import Input from '../ui/Input'
import Button from '../ui/Button'
import Select from '../ui/Select'
import Toggle from '../ui/Toggle'
import { TRIGGER_TYPES, ACTION_TYPES, SCOPE_TYPES, MATCH_TARGETS } from '../../utils/constants'

function emptyForm(sessionId) {
  return {
    sessionId: sessionId || '',
    name: '',
    enabled: true,
    priority: 100,
    scopeType: 'global',
    scopeChatJid: '',
    triggerType: 'contains',
    triggerPattern: '',
    caseSensitive: false,
    matchTarget: 'text',
    actionType: 'reply',
    actionText: '',
    actionEmoji: '',
    stopProcessing: true,
    cooldownMs: 0
  }
}

function fromRule(rule) {
  if (!rule) return emptyForm()
  return {
    sessionId: rule.sessionId || '',
    name: rule.name || '',
    enabled: rule.enabled !== false,
    priority: rule.priority ?? 100,
    scopeType: rule.scope?.type || 'global',
    scopeChatJid: rule.scope?.chatJid || '',
    triggerType: rule.trigger?.type || 'contains',
    triggerPattern: rule.trigger?.pattern || '',
    caseSensitive: !!rule.trigger?.caseSensitive,
    matchTarget: rule.trigger?.matchTarget || 'text',
    actionType: rule.action?.type || 'reply',
    actionText: rule.action?.payload?.text || '',
    actionEmoji: rule.action?.payload?.emoji || '',
    stopProcessing: rule.action?.stopProcessing !== false,
    cooldownMs: rule.cooldownMs || 0
  }
}

function toRule(form) {
  const payload = {}
  if (form.actionType === 'reply') payload.text = form.actionText
  else if (form.actionType === 'react') payload.emoji = form.actionEmoji
  else if (form.actionType === 'warn') payload.text = form.actionText

  return {
    sessionId: form.sessionId,
    name: form.name,
    enabled: form.enabled,
    priority: Number(form.priority) || 100,
    scope: {
      type: form.scopeType,
      chatJid: form.scopeType === 'chat' ? form.scopeChatJid : null
    },
    trigger: {
      type: form.triggerType,
      pattern: form.triggerType === 'always' ? null : form.triggerPattern,
      caseSensitive: form.caseSensitive,
      matchTarget: form.matchTarget
    },
    action: {
      type: form.actionType,
      payload,
      stopProcessing: form.stopProcessing
    },
    cooldownMs: Number(form.cooldownMs) || 0
  }
}

export default function RuleForm({ initial, sessionId, onSave, onCancel }) {
  const [form, setForm] = useState(initial ? fromRule(initial) : emptyForm(sessionId))

  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    if (form.triggerType !== 'always' && !form.triggerPattern.trim()) return
    if (!form.sessionId) return
    onSave(toRule(form))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Rule Name *"
        value={form.name}
        onChange={(e) => set('name', e.target.value)}
        placeholder="Greet hellos"
        required
      />

      <Input
        label="Session ID *"
        value={form.sessionId}
        onChange={(e) => set('sessionId', e.target.value)}
        placeholder="HDM-BOT-SESSION"
        required
      />

      <Select
        label="Scope"
        value={form.scopeType}
        onChange={(e) => set('scopeType', e.target.value)}
        options={SCOPE_TYPES}
      />

      {form.scopeType === 'chat' && (
        <Input
          label="Chat JID *"
          value={form.scopeChatJid}
          onChange={(e) => set('scopeChatJid', e.target.value)}
          placeholder="254712345678@s.whatsapp.net"
        />
      )}

      <Select
        label="Trigger Type"
        value={form.triggerType}
        onChange={(e) => set('triggerType', e.target.value)}
        options={TRIGGER_TYPES}
      />

      {form.triggerType !== 'always' && (
        <Input
          label="Trigger Pattern *"
          value={form.triggerPattern}
          onChange={(e) => set('triggerPattern', e.target.value)}
          placeholder="hello"
        />
      )}

      <Select
        label="Match Target"
        value={form.matchTarget}
        onChange={(e) => set('matchTarget', e.target.value)}
        options={MATCH_TARGETS}
      />

      <label className="flex items-center justify-between py-2">
        <span className="text-sm text-gray-700 dark:text-gray-300">Case Sensitive</span>
        <Toggle checked={form.caseSensitive} onChange={(v) => set('caseSensitive', v)} />
      </label>

      <Select
        label="Action Type"
        value={form.actionType}
        onChange={(e) => set('actionType', e.target.value)}
        options={ACTION_TYPES}
      />

      {form.actionType === 'reply' || form.actionType === 'warn' ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Response Text *
          </label>
          <textarea
            value={form.actionText}
            onChange={(e) => set('actionText', e.target.value)}
            rows={3}
            className="input-field resize-none"
            placeholder="Hi there!"
          />
        </div>
      ) : null}

      {form.actionType === 'react' && (
        <Input
          label="Emoji *"
          value={form.actionEmoji}
          onChange={(e) => set('actionEmoji', e.target.value)}
          placeholder="👍"
          maxLength={4}
        />
      )}

      <Input
        label="Priority (lower runs first)"
        type="number"
        value={form.priority}
        onChange={(e) => set('priority', e.target.value)}
      />

      <Input
        label="Cooldown (ms)"
        type="number"
        value={form.cooldownMs}
        onChange={(e) => set('cooldownMs', e.target.value)}
      />

      <label className="flex items-center justify-between py-2">
        <span className="text-sm text-gray-700 dark:text-gray-300">
          Stop processing after match
        </span>
        <Toggle checked={form.stopProcessing} onChange={(v) => set('stopProcessing', v)} />
      </label>

      <label className="flex items-center justify-between py-2">
        <span className="text-sm text-gray-700 dark:text-gray-300">Enabled</span>
        <Toggle checked={form.enabled} onChange={(v) => set('enabled', v)} />
      </label>

      <div className="flex gap-3 justify-end pt-2">
        <Button variant="secondary" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save Rule</Button>
      </div>
    </form>
  )
}
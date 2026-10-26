import { useState } from 'react'
import Input from '../ui/Input'
import Button from '../ui/Button'
import Toggle from '../ui/Toggle'

export default function CommandForm({ initial = {}, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: initial.name || '',
    description: initial.description || '',
    response: initial.response || '',
    category: initial.category || 'custom',
    aliases: initial.aliases?.join(', ') || '',
    adminOnly: initial.adminOnly || false,
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({
      ...form,
      aliases: form.aliases.split(',').map(a => a.trim()).filter(Boolean),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Command Name *"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        placeholder="welcome"
        required
      />
      <Input
        label="Description"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        placeholder="Sends a welcome message"
      />
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Response *</label>
        <textarea
          value={form.response}
          onChange={(e) => setForm({ ...form, response: e.target.value })}
          rows={3}
          className="input-field resize-none"
          placeholder="Welcome to the group! 🎉"
          required
        />
      </div>
      <Input
        label="Category"
        value={form.category}
        onChange={(e) => setForm({ ...form, category: e.target.value })}
        placeholder="custom"
      />
      <Input
        label="Aliases (comma separated)"
        value={form.aliases}
        onChange={(e) => setForm({ ...form, aliases: e.target.value })}
        placeholder="hi, hello"
      />
      <label className="flex items-center justify-between py-2">
        <span className="text-sm text-gray-700 dark:text-gray-300">Admin Only</span>
        <Toggle checked={form.adminOnly} onChange={(v) => setForm({ ...form, adminOnly: v })} />
      </label>
      <div className="flex gap-3 justify-end pt-2">
        <Button variant="secondary" type="button" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save Command</Button>
      </div>
    </form>
  )
}
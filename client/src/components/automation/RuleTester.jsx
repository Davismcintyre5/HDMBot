import { useState, useEffect } from 'react'
import { FlaskConical, CheckCircle, XCircle, Play, Send } from 'lucide-react'
import Select from '../ui/Select'
import Input from '../ui/Input'
import Button from '../ui/Button'
import { useToast } from '../../hooks/useToast'
import { testRule, executeRule } from '../../api/rules'

export default function RuleTester({ rules = [] }) {
  const [ruleId, setRuleId] = useState('')
  const [text, setText] = useState('')
  const [chatJid, setChatJid] = useState('')
  const [result, setResult] = useState(null)
  const [testing, setTesting] = useState(false)
  const [executing, setExecuting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (rules.length === 0) {
      if (ruleId) setRuleId('')
      return
    }
    if (!ruleId || !rules.find((r) => r._id === ruleId)) {
      setRuleId(rules[0]._id)
    }
  }, [rules, ruleId])

  const handleTest = async () => {
    setResult(null)
    if (!ruleId) {
      setResult({ kind: 'test', wouldMatch: false, error: 'Select a rule first' })
      return
    }
    if (!text.trim()) {
      setResult({ kind: 'test', wouldMatch: false, error: 'Type some sample text first' })
      return
    }
    setTesting(true)
    try {
      const res = await testRule(ruleId, { sampleText: text })
      const payload = res?.data?.data || res?.data || res
      setResult({ kind: 'test', ...payload })
    } catch (err) {
      setResult({
        kind: 'test',
        wouldMatch: false,
        error: err.response?.data?.error || err.message || 'Test failed'
      })
    } finally {
      setTesting(false)
    }
  }

  const handleExecute = async () => {
    setResult(null)
    if (!ruleId) {
      setResult({ kind: 'execute', ok: false, error: 'Select a rule first' })
      return
    }
    if (!chatJid.trim()) {
      setResult({ kind: 'execute', ok: false, error: 'Enter a target chat JID' })
      return
    }
    setExecuting(true)
    try {
      const res = await executeRule(ruleId, {
        chatJid: chatJid.trim(),
        sampleText: text
      })
      const payload = res?.data?.data || res?.data || res
      setResult({ kind: 'execute', ...payload })
      toast.success('Rule executed')
    } catch (err) {
      const message = err.response?.data?.error || err.message || 'Execution failed'
      setResult({ kind: 'execute', ok: false, error: message })
      toast.error(message)
    } finally {
      setExecuting(false)
    }
  }

  const selectedRule = rules.find((r) => r._id === ruleId)
  const options = rules.map((r) => ({ value: r._id, label: r.name }))

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg bg-purple-500/10">
          <FlaskConical size={18} className="text-purple-500" />
        </div>
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Rule Tester</h3>
      </div>

      {rules.length === 0 ? (
        <p className="text-xs text-gray-400">No rules to test</p>
      ) : (
        <>
          <Select
            label="Rule"
            value={ruleId}
            onChange={(e) => setRuleId(e.target.value)}
            options={options}
          />

          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Sample Text
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              className="input-field resize-none text-sm"
              placeholder="hello there"
            />
          </div>

          <div className="mt-3">
            <Input
              label="Target Chat JID"
              value={chatJid}
              onChange={(e) => setChatJid(e.target.value)}
              placeholder="254712345678@s.whatsapp.net"
            />
          </div>

          <div className="flex gap-2 mt-4">
            <Button
              variant="secondary"
              className="flex-1"
              icon={FlaskConical}
              onClick={handleTest}
              disabled={testing}
            >
              {testing ? 'Testing...' : 'Test (dry run)'}
            </Button>
            <Button
              className="flex-1"
              icon={Play}
              onClick={handleExecute}
              disabled={executing}
            >
              {executing ? 'Running...' : 'Run now'}
            </Button>
          </div>

          {selectedRule && (
            <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs text-gray-500 dark:text-gray-400">
              <strong>Rule:</strong>{' '}
              trigger=<code className="font-mono">{selectedRule.trigger?.type}:{selectedRule.trigger?.pattern}</code>{' '}
              action=<code className="font-mono">{selectedRule.action?.type}</code>{' '}
              scope=<code className="font-mono">{selectedRule.scope?.type}</code>
            </div>
          )}

          {result && (
            <div className="mt-4">
              {result.kind === 'test' && (result.wouldMatch ? (
                <div className="flex items-start gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                  <CheckCircle size={14} className="text-green-500 mt-0.5" />
                  <div className="text-xs">
                    <p className="text-green-600 dark:text-green-400 font-medium">Would match</p>
                    <p className="text-gray-500">
                      scope: {result.scopeMatch ? '✓' : '✗'} | trigger: {result.triggerMatch ? '✓' : '✗'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                  <XCircle size={14} className="text-red-500 mt-0.5" />
                  <div className="text-xs">
                    <p className="text-red-500 font-medium">{result.error || 'No match'}</p>
                    {!result.error && (
                      <p className="text-gray-500">
                        scope: {result.scopeMatch ? '✓' : '✗'} | trigger: {result.triggerMatch ? '✓' : '✗'}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {result.kind === 'execute' && (result.ok ? (
                <div className="flex items-start gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                  <Send size={14} className="text-green-500 mt-0.5" />
                  <div className="text-xs">
                    <p className="text-green-600 dark:text-green-400 font-medium">Executed</p>
                    <p className="text-gray-500">sent to: {result.chatJid}</p>
                    <p className="text-gray-500">action: {result.action}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                  <XCircle size={14} className="text-red-500 mt-0.5" />
                  <p className="text-xs text-red-500">{result.error}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
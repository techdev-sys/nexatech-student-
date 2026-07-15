import { useState, useEffect } from 'react'
import api from '../api/axios'
import { useToast } from '../context/ToastContext'
import { usePermissions } from '../hooks/usePermissions'
import ConfirmModal from '../components/ConfirmModal'

const AUDIENCE_TYPES = [
  { value: 'all',      label: 'Entire School',    sub: 'All parents and staff' },
  { value: 'parents',  label: 'All Parents',       sub: 'Parents with portal accounts' },
  { value: 'teachers', label: 'All Teachers',      sub: 'All teaching staff' },
  { value: 'staff',    label: 'All Staff',         sub: 'Admin + teachers' },
  { value: 'grade',    label: 'Grade / Level',     sub: 'Students of a specific grade' },
]

const SMS_LIMIT = 160

function CharCounter({ text }) {
  const len     = text.length
  const msgs    = Math.ceil(len / SMS_LIMIT) || 1
  const color   = len > SMS_LIMIT * 2 ? 'text-red-500' : len > SMS_LIMIT ? 'text-amber-600' : 'text-slate-400'
  return (
    <span className={`text-xs tabular-nums ${color}`}>
      {len} chars · {msgs} SMS part{msgs !== 1 ? 's' : ''}
    </span>
  )
}

export default function SmsBroadcastPage() {
  const { can } = usePermissions()
  const toast   = useToast()

  const [audienceType, setAudienceType] = useState('parents')
  const [gradeLevel, setGradeLevel]     = useState('')
  const [body, setBody]                 = useState('')
  const [templateId, setTemplateId]     = useState('')
  const [templates, setTemplates]       = useState([])
  const [sending, setSending]           = useState(false)
  const [confirm, setConfirm]           = useState(false)
  const [lastResult, setLastResult]     = useState(null)

  useEffect(() => {
    api.get('/api/communications/templates', { params: { channel: 'sms', is_active: 1, per_page: 100 } })
      .then(r => setTemplates(r.data.data ?? r.data))
      .catch(() => {})
  }, [])

  const applyTemplate = id => {
    setTemplateId(id)
    const tmpl = templates.find(t => String(t.id) === id)
    if (tmpl) setBody(tmpl.body)
  }

  const handleSend = async () => {
    setSending(true)
    setConfirm(false)
    try {
      const payload = {
        channel:       'sms',
        audience_type: audienceType,
        body,
        ...(templateId ? { template_id: Number(templateId) } : {}),
        ...(audienceType === 'grade' && gradeLevel ? { audience_filter: { grade_level: gradeLevel } } : {}),
      }

      const { data: comm } = await api.post('/api/communications', payload)
      const { data: sent } = await api.post(`/api/communications/${comm.id}/send`)

      setLastResult(sent)
      setBody('')
      setTemplateId('')
      toast.success(`SMS queued for ${sent.total_recipients} recipient${sent.total_recipients !== 1 ? 's' : ''}.`)
    } catch {
      // interceptor handles toast
    } finally {
      setSending(false)
    }
  }

  if (!can('send_sms')) {
    return <div className="py-16 text-center text-slate-400 text-sm">You do not have permission to send SMS broadcasts.</div>
  }

  const canSend = body.trim().length > 0 && !(audienceType === 'grade' && !gradeLevel.trim())

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="bg-indigo-600 rounded-2xl px-6 py-4 text-white">
        <p className="text-sm text-indigo-200 font-medium">Communication Center</p>
        <h2 className="text-lg font-bold">SMS Broadcast</h2>
      </div>

      {/* Template picker */}
      {templates.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Use Template</label>
          <select value={templateId} onChange={e => applyTemplate(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <option value="">No template selected</option>
            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      )}

      {/* Audience */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Audience</label>
        <div className="grid grid-cols-1 gap-2">
          {AUDIENCE_TYPES.map(a => (
            <label key={a.value}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition ${
                audienceType === a.value
                  ? 'border-indigo-400 bg-indigo-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}>
              <input type="radio" name="audience" value={a.value} checked={audienceType === a.value}
                onChange={() => setAudienceType(a.value)} className="text-indigo-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-800">{a.label}</p>
                <p className="text-xs text-slate-400">{a.sub}</p>
              </div>
            </label>
          ))}
        </div>

        {audienceType === 'grade' && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Grade / Level *</label>
            <input type="text" value={gradeLevel} onChange={e => setGradeLevel(e.target.value)}
              placeholder="Form 3"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
        )}
      </div>

      {/* Message composer */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Message</label>
          <CharCounter text={body} />
        </div>
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={5}
          placeholder="Enter message body"
          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
        <p className="text-xs text-slate-400">
          Messages over {SMS_LIMIT} characters are split into multiple SMS parts and billed accordingly.
        </p>
      </div>

      {/* Last result */}
      {lastResult && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4">
          <p className="text-sm font-semibold text-emerald-700">SMS queued successfully</p>
          <p className="text-xs text-emerald-600 mt-0.5">
            {lastResult.total_recipients} recipients · processing in background
          </p>
        </div>
      )}

      {/* Send button */}
      <div className="flex justify-end">
        <button onClick={() => setConfirm(true)} disabled={!canSend || sending}
          className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition">
          {sending && (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
          )}
          Send SMS Broadcast
        </button>
      </div>

      <ConfirmModal
        open={confirm}
        danger={false}
        title="Send SMS Broadcast?"
        message={`This will queue an SMS to all ${AUDIENCE_TYPES.find(a => a.value === audienceType)?.label ?? audienceType} recipients. The message will be sent via the configured SMS provider.`}
        confirmLabel="Yes, send"
        cancelLabel="Review again"
        onConfirm={handleSend}
        onCancel={() => setConfirm(false)}
      />
    </div>
  )
}

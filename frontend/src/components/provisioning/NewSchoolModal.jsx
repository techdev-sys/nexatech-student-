import { useState } from 'react'
import api from '../../api/axios'

const INIT = {
  school_name: '', school_email: '', school_phone: '', school_address: '',
  admin_name: '', admin_email: '', admin_password: '',
}

export default function NewSchoolModal({ onClose, onCreated }) {
  const [form, setForm]     = useState(INIT)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})
    setLoading(true)
    try {
      const { data } = await api.post('/api/v1/platform/schools', form)
      onCreated(data)
    } catch (err) {
      setErrors(err.response?.data?.errors ?? { _: err.response?.data?.message ?? 'Failed.' })
    } finally {
      setLoading(false)
    }
  }

  const field = (label, key, opts = {}) => (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">
        {label}
        {opts.optional && <span className="text-slate-400 font-normal ml-1">(optional)</span>}
      </label>
      <input
        type={opts.type ?? 'text'}
        value={form[key]}
        onChange={set(key)}
        placeholder={opts.placeholder}
        required={!opts.optional}
        className={[
          'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400',
          errors[key] ? 'border-red-400 bg-red-50' : 'border-slate-200',
        ].join(' ')}
      />
      {errors[key] && <p className="text-xs text-red-500 mt-1">{errors[key][0]}</p>}
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Provision New School</h2>
            <p className="text-xs text-slate-400 mt-0.5">Creates a school and its first admin account</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[70vh]">
          <div className="px-6 py-5 space-y-5">
            {/* School section */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">School details</p>
              <div className="space-y-3">
                {field('School name', 'school_name', { placeholder: 'Institution name' })}
                {field('School email', 'school_email', { type: 'email', placeholder: 'admin@school.ac.zw' })}
                {field('Phone', 'school_phone', { optional: true, placeholder: '+263 77 000 0000' })}
                {field('Address', 'school_address', { optional: true, placeholder: 'Institution street address' })}
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-slate-100" />

            {/* Admin section */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">First admin account</p>
              <div className="space-y-3">
                {field('Admin full name', 'admin_name', { placeholder: 'Administrator full name' })}
                {field('Admin email', 'admin_email', { type: 'email', placeholder: 'tatenda@school.ac.zw' })}
                {field('Temporary password', 'admin_password', { type: 'password', placeholder: 'Min. 8 characters' })}
              </div>
            </div>

            {errors._ && (
              <div className="px-3 py-2 rounded-lg bg-red-50 text-red-600 text-sm">{errors._}</div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition flex items-center gap-2"
            >
              {loading && (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              )}
              {loading ? 'Provisioning...' : 'Provision School'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

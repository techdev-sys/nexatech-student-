import { useState, useEffect } from 'react'
import api from '../../api/axios'

const GATEWAYS = [
  { value: 'paynow',  label: 'Paynow',  desc: 'USD / ZiG Zimbabwe payment rail', contactLabel: 'Phone number' },
  { value: 'payfast', label: 'PayFast', desc: 'ZAR South Africa payment rail',    contactLabel: 'Email address' },
]

function fmt(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(amount))
}

// mode: 'pay' (parent/student) | 'record' (admin manual entry)
export default function PaymentDrawer({ invoice, mode = 'pay', onClose, onSuccess }) {
  const isRecord = mode === 'record'

  const [gateway, setGateway] = useState('paynow')
  const [contact, setContact] = useState('')
  const [amount, setAmount]   = useState('')
  const [notes, setNotes]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    if (invoice) {
      setAmount(String(invoice.balance_amount))
      setError('')
      setContact('')
      setNotes('')
      setGateway('paynow')
    }
  }, [invoice])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data } = await api.post('/api/v1/payments/initiate', {
        invoice_id:           invoice.id,
        gateway:              isRecord ? 'manual' : gateway,
        amount:               parseFloat(amount),
        payer_phone_or_email: contact || undefined,
      })

      if (data.checkout_url) {
        window.location.href = data.checkout_url
      } else {
        onSuccess(data.transaction)
      }
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to record payment.')
    } finally {
      setLoading(false)
    }
  }

  const selectedGateway = GATEWAYS.find((g) => g.value === gateway)

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={[
          'fixed inset-0 bg-black/40 z-40 transition-opacity duration-300',
          invoice ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
      />

      {/* Drawer */}
      <div
        className={[
          'fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300',
          invoice ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-semibold text-slate-800">
              {isRecord ? 'Record Payment' : 'Pay Invoice'}
            </h2>
            {isRecord && (
              <p className="text-xs text-slate-400 mt-0.5">Manual settlement entry</p>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {invoice && (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {/* Invoice summary */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Invoice</span>
                <span className="font-mono text-xs">{invoice.invoice_number}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Student</span>
                <span className="font-medium text-slate-700">{invoice.student_name}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Term</span>
                <span>{invoice.term_label}</span>
              </div>
              <div className="h-px bg-slate-200 my-1" />
              <div className="flex justify-between font-semibold text-slate-800">
                <span>Balance due</span>
                <span className="text-red-600">{fmt(invoice.balance_amount, invoice.currency)}</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Amount */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Amount received ({invoice.currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={invoice.balance_amount}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              {/* Gateway selector — pay mode only */}
              {!isRecord && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-2">Payment gateway</label>
                  <div className="grid grid-cols-2 gap-2">
                    {GATEWAYS.map((gw) => (
                      <button
                        key={gw.value}
                        type="button"
                        onClick={() => setGateway(gw.value)}
                        className={[
                          'flex flex-col items-start px-3 py-2.5 rounded-xl border text-left transition',
                          gateway === gw.value
                            ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                            : 'border-slate-200 hover:border-slate-300',
                        ].join(' ')}
                      >
                        <span className={`text-sm font-semibold ${gateway === gw.value ? 'text-indigo-700' : 'text-slate-700'}`}>
                          {gw.label}
                        </span>
                        <span className="text-xs text-slate-400 mt-0.5">{gw.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact — pay mode only */}
              {!isRecord && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {selectedGateway?.contactLabel ?? 'Contact'}
                    <span className="text-slate-400 font-normal ml-1">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder={gateway === 'paynow' ? '+263 77 000 0000' : 'payer@email.com'}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
              )}

              {/* Notes — record mode only */}
              {isRecord && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Reference / notes
                    <span className="text-slate-400 font-normal ml-1">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Receipt reference or payment note"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
              )}

              {error && (
                <div className="px-3 py-2 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={[
                  'w-full disabled:opacity-50 text-white font-semibold text-sm py-2.5 rounded-xl transition flex items-center justify-center gap-2',
                  isRecord
                    ? 'bg-slate-700 hover:bg-slate-800'
                    : 'bg-indigo-600 hover:bg-indigo-700',
                ].join(' ')}
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    {isRecord ? 'Saving...' : 'Redirecting to gateway...'}
                  </>
                ) : isRecord ? (
                  'Confirm & Record Payment'
                ) : (
                  <>
                    Proceed to {selectedGateway?.label}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </>
  )
}

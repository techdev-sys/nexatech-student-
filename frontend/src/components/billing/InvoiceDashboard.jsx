import { useState, useEffect, useCallback } from 'react'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'
import InvoiceTable from './InvoiceTable'
import PaymentDrawer from './PaymentDrawer'

function SummaryCard({ label, value, currency, accent }) {
  const colors = {
    default: 'bg-white border-slate-200',
    green:   'bg-emerald-50 border-emerald-200',
    red:     'bg-red-50 border-red-200',
  }
  const textColors = {
    default: 'text-slate-800',
    green:   'text-emerald-700',
    red:     'text-red-700',
  }
  const labelColors = {
    default: 'text-slate-500',
    green:   'text-emerald-600',
    red:     'text-red-500',
  }

  const formatted = new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(value))

  return (
    <div className={`rounded-xl border p-5 shadow-sm ${colors[accent ?? 'default']}`}>
      <p className={`text-xs font-medium uppercase tracking-wide mb-1 ${labelColors[accent ?? 'default']}`}>
        {label}
      </p>
      <p className={`text-2xl font-bold tabular-nums ${textColors[accent ?? 'default']}`}>
        {formatted}
      </p>
    </div>
  )
}

export default function InvoiceDashboard() {
  const { user } = useAuth()
  const isAdmin = ['admin', 'super_admin'].includes(user?.role)

  const [data, setData]               = useState(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const [activeInvoice, setActiveInvoice] = useState(null)
  const [drawerMode, setDrawerMode]   = useState('pay')

  const fetchData = useCallback(() => {
    setLoading(true)
    api.get('/api/v1/invoices')
      .then((r) => { setData(r.data); setError('') })
      .catch((e) => setError(e.response?.data?.message || 'Failed to load billing data.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const openPay    = (inv) => { setDrawerMode('pay');    setActiveInvoice(inv) }
  const openRecord = (inv) => { setDrawerMode('record'); setActiveInvoice(inv) }

  const handlePaymentSuccess = () => {
    setActiveInvoice(null)
    fetchData()
  }

  return (
    <div className="space-y-5">
      {/* Error */}
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-16 text-slate-400 text-sm">Loading billing data...</div>
      )}

      {data && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SummaryCard
              label="Total Billed"
              value={data.summary.total_billed}
              currency={data.summary.currency}
            />
            <SummaryCard
              label="Total Paid"
              value={data.summary.total_paid}
              currency={data.summary.currency}
              accent="green"
            />
            <SummaryCard
              label="Outstanding Balance"
              value={data.summary.outstanding_balance}
              currency={data.summary.currency}
              accent={Number(data.summary.outstanding_balance) > 0 ? 'red' : 'green'}
            />
          </div>

          {/* Invoice ledger */}
          <InvoiceTable
            invoices={data.invoices}
            isAdmin={isAdmin}
            onPay={openPay}
            onRecord={openRecord}
          />
        </>
      )}

      {/* Payment / record drawer */}
      <PaymentDrawer
        invoice={activeInvoice}
        mode={drawerMode}
        onClose={() => setActiveInvoice(null)}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  )
}

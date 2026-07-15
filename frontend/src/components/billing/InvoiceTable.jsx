const STATUS = {
  paid: {
    label: 'Paid',
    classes: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  },
  partially_paid: {
    label: 'Partial',
    classes: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  },
  unpaid: {
    label: 'Unpaid',
    classes: 'bg-red-50 text-red-600 ring-1 ring-red-200',
  },
}

function StatusBadge({ status }) {
  const cfg = STATUS[status] ?? { label: status, classes: 'bg-slate-100 text-slate-600' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.classes}`}>
      {cfg.label}
    </span>
  )
}

function fmt(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(amount))
}

export default function InvoiceTable({ invoices, onPay, onRecord, isAdmin }) {
  if (!invoices?.length) {
    return (
      <div className="text-center py-16 text-slate-400 text-sm bg-white rounded-xl border border-slate-200">
        No invoices found.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-left">
            <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Invoice #</th>
            <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Student</th>
            <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Term</th>
            <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide text-right">Total</th>
            <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide text-right">Paid</th>
            <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide text-right">Balance</th>
            <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Status</th>
            <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Due</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv, i) => (
            <tr
              key={inv.id}
              className={`border-b border-slate-100 last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}
            >
              <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">
                {inv.invoice_number}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <p className="font-medium text-slate-800">{inv.student_name}</p>
                <p className="text-xs text-slate-400">{inv.student_number}</p>
              </td>
              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{inv.term_label}</td>
              <td className="px-4 py-3 text-right font-medium text-slate-800 whitespace-nowrap">
                {fmt(inv.total_amount, inv.currency)}
              </td>
              <td className="px-4 py-3 text-right text-emerald-600 whitespace-nowrap">
                {fmt(inv.paid_amount, inv.currency)}
              </td>
              <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">
                <span className={Number(inv.balance_amount) > 0 ? 'text-red-600' : 'text-slate-400'}>
                  {fmt(inv.balance_amount, inv.currency)}
                </span>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={inv.status} />
              </td>
              <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{inv.due_date}</td>
              <td className="px-4 py-3">
                {inv.status !== 'paid' && (
                  isAdmin ? (
                    <button
                      onClick={() => onRecord(inv)}
                      className="px-3 py-1.5 text-xs font-medium bg-slate-700 hover:bg-slate-800 text-white rounded-lg transition"
                    >
                      Record
                    </button>
                  ) : (
                    <button
                      onClick={() => onPay(inv)}
                      className="px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
                    >
                      Pay
                    </button>
                  )
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

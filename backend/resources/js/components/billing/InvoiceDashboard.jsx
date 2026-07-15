import { useState } from 'react';
import { useInvoices } from '../../hooks/useInvoices';
import InvoiceRow from './InvoiceRow';

const STATUSES = ['', 'unpaid', 'partially_paid', 'paid'];

export default function InvoiceDashboard() {
    const [status, setStatus] = useState('');
    const { invoices, meta, loading, error, refetch } = useInvoices(status ? { status } : {});

    const totals = invoices.reduce(
        (acc, inv) => ({
            total:   acc.total   + parseFloat(inv.total_amount),
            paid:    acc.paid    + parseFloat(inv.paid_amount),
            balance: acc.balance + parseFloat(inv.balance_amount),
        }),
        { total: 0, paid: 0, balance: 0 }
    );

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
                <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="border rounded px-3 py-1.5 text-sm"
                >
                    {STATUSES.map((s) => (
                        <option key={s} value={s}>{s ? s.replace('_', ' ') : 'All statuses'}</option>
                    ))}
                </select>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4">
                <SummaryCard label="Total Invoiced" value={totals.total} colour="blue" />
                <SummaryCard label="Total Collected" value={totals.paid} colour="green" />
                <SummaryCard label="Outstanding" value={totals.balance} colour="red" />
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            {loading ? (
                <p className="text-gray-500 text-sm">Loading invoices…</p>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200 text-left">
                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                            <tr>
                                {['Invoice #', 'Student', 'Fee', 'Total', 'Paid', 'Balance', 'Due', 'Status', ''].map((h) => (
                                    <th key={h} className="px-4 py-3">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {invoices.length === 0 ? (
                                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">No invoices found.</td></tr>
                            ) : (
                                invoices.map((inv) => (
                                    <InvoiceRow key={inv.id} invoice={inv} onPaid={refetch} />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {meta && (
                <p className="text-xs text-gray-400">
                    Showing {invoices.length} of {meta.total} invoices
                </p>
            )}
        </div>
    );
}

function SummaryCard({ label, value, colour }) {
    const colours = { blue: 'text-blue-600', green: 'text-green-600', red: 'text-red-600' };
    return (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
            <p className={`mt-1 text-2xl font-bold ${colours[colour]}`}>
                ${value.toFixed(2)}
            </p>
        </div>
    );
}

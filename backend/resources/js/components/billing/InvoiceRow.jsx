import StatusBadge from './StatusBadge';
import { initiatePayment } from '../../api/invoices';
import { useState } from 'react';

export default function InvoiceRow({ invoice, onPaid }) {
    const [paying, setPaying] = useState(false);

    const currency = invoice.fee_structure?.currency ?? 'USD';
    const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n);

    async function handlePay() {
        const contact = prompt('Enter payer email or phone for receipt:');
        if (!contact) return;

        setPaying(true);
        try {
            const { data } = await initiatePayment({
                invoice_id:           invoice.id,
                amount:               invoice.balance_amount,
                payer_phone_or_email: contact,
            });
            if (data.checkout_url) {
                window.location.href = data.checkout_url;
            } else {
                alert('Manual payment recorded. Awaiting confirmation.');
                onPaid?.();
            }
        } catch (e) {
            alert(e.response?.data?.error ?? 'Payment initiation failed.');
        } finally {
            setPaying(false);
        }
    }

    return (
        <tr className="hover:bg-gray-50">
            <td className="px-4 py-3 font-mono text-sm text-gray-700">{invoice.invoice_number}</td>
            <td className="px-4 py-3 text-sm">
                <p className="font-medium text-gray-900">{invoice.student?.first_name} {invoice.student?.last_name}</p>
            </td>
            <td className="px-4 py-3 text-sm text-gray-600">{invoice.fee_structure?.title}</td>
            <td className="px-4 py-3 text-sm text-right">{fmt(invoice.total_amount)}</td>
            <td className="px-4 py-3 text-sm text-right text-green-600">{fmt(invoice.paid_amount)}</td>
            <td className="px-4 py-3 text-sm text-right font-semibold text-red-600">{fmt(invoice.balance_amount)}</td>
            <td className="px-4 py-3 text-sm">{invoice.due_date}</td>
            <td className="px-4 py-3"><StatusBadge status={invoice.status} /></td>
            <td className="px-4 py-3">
                {invoice.status !== 'paid' && (
                    <button
                        onClick={handlePay}
                        disabled={paying}
                        className="text-xs px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                        {paying ? 'Processing…' : 'Pay'}
                    </button>
                )}
            </td>
        </tr>
    );
}

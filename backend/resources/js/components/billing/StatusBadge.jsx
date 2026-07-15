const colours = {
    unpaid:          'bg-red-100 text-red-700',
    partially_paid:  'bg-yellow-100 text-yellow-700',
    paid:            'bg-green-100 text-green-700',
};

const labels = {
    unpaid:         'Unpaid',
    partially_paid: 'Partial',
    paid:           'Paid',
};

export default function StatusBadge({ status }) {
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colours[status] ?? 'bg-gray-100 text-gray-600'}`}>
            {labels[status] ?? status}
        </span>
    );
}

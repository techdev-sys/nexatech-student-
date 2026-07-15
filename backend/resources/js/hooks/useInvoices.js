import { useState, useEffect, useCallback } from 'react';
import { getInvoices } from '../api/invoices';

export function useInvoices(filters = {}) {
    const [invoices, setInvoices] = useState([]);
    const [meta, setMeta]         = useState(null);
    const [loading, setLoading]   = useState(true);
    const [error, setError]       = useState(null);

    const fetch = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data } = await getInvoices(filters);
            setInvoices(data.data);
            setMeta(data.meta);
        } catch (e) {
            setError(e.response?.data?.error ?? 'Failed to load invoices.');
        } finally {
            setLoading(false);
        }
    }, [JSON.stringify(filters)]);

    useEffect(() => { fetch(); }, [fetch]);

    return { invoices, meta, loading, error, refetch: fetch };
}

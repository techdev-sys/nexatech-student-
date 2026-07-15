import { createRoot } from 'react-dom/client';
import InvoiceDashboard from './components/billing/InvoiceDashboard';

const el = document.getElementById('app');
if (el) createRoot(el).render(<InvoiceDashboard />);

// ⚠️ LEGACY CLIENT — DO NOT USE IN THE ACTIVE SPA.
// This axios instance belongs exclusively to the legacy `resources/js` billing
// entry (welcome.blade.php → resources/js/app.jsx → InvoiceDashboard). The active
// application lives in `frontend/` and MUST use only `frontend/src/api/axios.js`.
// Nothing under `frontend/src` (timetable or otherwise) may import this file.
import axios from 'axios';

const client = axios.create({
    baseURL: '/api',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

// Attach Bearer token from localStorage on every request
client.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Redirect to login on 401
client.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401) {
            localStorage.removeItem('auth_token');
            window.location.href = '/login';
        }
        return Promise.reject(err);
    }
);

export default client;

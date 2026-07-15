// Module-level handle so axios interceptors (outside React) can trigger toasts
// ToastProvider sets this on mount; axios imports it.
export const toastRef = { show: null }

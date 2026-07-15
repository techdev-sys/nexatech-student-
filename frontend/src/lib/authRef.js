// Module-level handle so axios interceptors (outside React) can trigger logout
// AuthProvider sets this on mount; axios imports it.
export const authRef = { logout: null }

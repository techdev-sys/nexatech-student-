import axios from 'axios'
import { toastRef } from '../lib/toastRef'
import { authRef }  from '../lib/authRef'

// ── Instance ──────────────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: '/',
  withCredentials: true,
  timeout: 20_000,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
})

// ── Helpers ───────────────────────────────────────────────────────────────────

const notify = (msg, type = 'error') => toastRef.show?.(msg, type)

// Flatten Laravel 422 errors  first human message
function firstValidationError(data) {
  if (data?.errors) {
    const msgs = Object.values(data.errors).flat()
    return msgs[0] ?? 'Validation failed.'
  }
  return data?.message ?? 'Validation failed.'
}

// ── Duplicate-submission guard ────────────────────────────────────────────────
// Tracks in-flight mutation keys so a second identical call is rejected instantly
// before it reaches the network. Safe for GET (not tracked).
const inflight = new Set()

function mutationKey(config) {
  return `${config.method}::${config.url}`
}

// ── Request interceptor ───────────────────────────────────────────────────────

api.interceptors.request.use((config) => {
  // Dedup guard for mutating verbs (POST / PATCH / PUT / DELETE)
  const method = config.method?.toUpperCase()
  if (method && method !== 'GET' && method !== 'HEAD') {
    const key = mutationKey(config)
    if (inflight.has(key)) {
      // Cancel this duplicate request silently
      const ctrl = new AbortController()
      ctrl.abort()
      config.signal = ctrl.signal
      config.__dedupCancelled = true
    } else {
      inflight.add(key)
      config.__mutationKey = key
      // Safety release: if the response interceptor never fires (e.g. request blocked
      // before leaving the browser), release the lock after 30 seconds.
      setTimeout(() => inflight.delete(key), 30_000)
    }
  }

  return config
})

// ── Response interceptor ──────────────────────────────────────────────────────

const RETRY_MAX    = 2
const RETRY_DELAY  = 800 // ms, doubles each retry

async function retryGet(error) {
  const config = error.config
  if (!config) return Promise.reject(error)

  const method = config.method?.toUpperCase()
  if (method !== 'GET' && method !== 'HEAD') return Promise.reject(error)

  config.__retries = (config.__retries ?? 0) + 1
  if (config.__retries > RETRY_MAX)           return Promise.reject(error)

  const delay = RETRY_DELAY * config.__retries
  await new Promise(r => setTimeout(r, delay))
  return api(config)
}

api.interceptors.response.use(
  (res) => {
    // Release mutation lock on success
    const key = res.config?.__mutationKey
    if (key) inflight.delete(key)
    return res
  },
  async (err) => {
    // Release mutation lock on error too
    const key = err.config?.__mutationKey
    if (key) inflight.delete(key)

    // Silent cancel (dedup)
    if (err.config?.__dedupCancelled || axios.isCancel(err)) {
      return Promise.reject(err)
    }

    // Network / offline
    if (!err.response) {
      // Retry GET before declaring offline
      const method = err.config?.method?.toUpperCase()
      if (method === 'GET' || method === 'HEAD') {
        try { return await retryGet(err) } catch { /* fall through to the offline notification */ }
      }
      notify('Network unavailable. Check the connection and retry.')
      return Promise.reject(err)
    }

    const { status, data } = err.response

    switch (status) {
      case 401: {
        // Skip loop: if the failing request was already the login or bootstrap call,
        // just clear state without toasting.
        const url = err.config?.url ?? ''
        const isAuthCall = url.includes('/api/login') || url.includes('/api/demo/redeem') || url.includes('/api/logout') || url.includes('/api/me')
        if (!isAuthCall) {
          notify('Session expired. Sign in again.', 'warning')
          authRef.logout?.()
        }
        break
      }
      case 403:
        notify('You do not have permission to access this feature.')
        break
      case 404:
        notify('Requested data could not be found.')
        break
      case 422:
        notify(firstValidationError(data))
        break
      case 429:
        notify('Request limit reached. Wait before retrying.')
        break
      default:
        if (status >= 500) {
          // Retry GET on server errors before showing toast
          try { return await retryGet(err) } catch { /* fall through to the server-error notification */ }
          notify('The server could not complete this request. Try again.')
        }
    }

    return Promise.reject(err)
  }
)

export default api

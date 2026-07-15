import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { toastRef } from '../lib/toastRef'

const ToastContext = createContext(null)

// ── Types ─────────────────────────────────────────────────────────────────────

const CONFIG = {
  success: { bg: 'bg-emerald-600',  icon: 'check',    duration: 3500 },
  error:   { bg: 'bg-red-600',      icon: 'x',        duration: 5500 },
  warning: { bg: 'bg-amber-500',    icon: 'warning',  duration: 4500 },
  info:    { bg: 'bg-indigo-600',   icon: 'info',     duration: 3500 },
  loading: { bg: 'bg-slate-700',    icon: 'spinner',  duration: 0    }, // manual dismiss
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function ToastProvider({ children }) {
  const [toasts, setToasts]   = useState([])
  const counter               = useRef(0)
  const recentMessages        = useRef(new Map()) // dedup: msg  timestamp

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const push = useCallback((message, type = 'success') => {
    const cfg = CONFIG[type] ?? CONFIG.info

    // Dedup: skip if same message shown in last 2 seconds
    const now  = Date.now()
    const last = recentMessages.current.get(message)
    if (last && now - last < 2000) return null

    recentMessages.current.set(message, now)
    // Clean stale dedup entries every 30s
    setTimeout(() => recentMessages.current.delete(message), 30_000)

    const id = ++counter.current
    setToasts(prev => [...prev.slice(-4), { id, message, type }]) // max 5 visible

    if (cfg.duration > 0) {
      setTimeout(() => dismiss(id), cfg.duration)
    }

    return id
  }, [dismiss])

  // Wire into module-level ref so axios can call without React context
  useEffect(() => {
    toastRef.show = push
    return () => { toastRef.show = null }
  }, [push])

  const toast = {
    success: (msg)         => push(msg, 'success'),
    error:   (msg)         => push(msg, 'error'),
    warning: (msg)         => push(msg, 'warning'),
    info:    (msg)         => push(msg, 'info'),
    loading: (msg)         => push(msg, 'loading'),
    dismiss,
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

// ── Stack UI ──────────────────────────────────────────────────────────────────

function ToastIcon({ type }) {
  if (type === 'spinner') return (
    <svg className="w-4 h-4 shrink-0 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  )
  if (type === 'check') return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
  if (type === 'x') return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
  if (type === 'warning') return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
  )
  // info
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function Toast({ t, onDismiss }) {
  const [visible, setVisible] = useState(false)
  const cfg = CONFIG[t.type] ?? CONFIG.info

  useEffect(() => {
    // Trigger enter animation on mount
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div
      style={{ transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)' }}
      className={[
        'pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white max-w-sm',
        cfg.bg,
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
      ].join(' ')}
    >
      <ToastIcon type={cfg.icon} />
      <span className="flex-1 leading-snug">{t.message}</span>
      <button
        onClick={() => onDismiss(t.id)}
        className="text-white/70 hover:text-white transition shrink-0 ml-1"
        aria-label="Dismiss"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

function ToastStack({ toasts, onDismiss }) {
  if (!toasts.length) return null
  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none" role="region" aria-label="Notifications">
      {toasts.map(t => (
        <Toast key={t.id} t={t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

export const useToast = () => useContext(ToastContext)

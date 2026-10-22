import { lazy, Suspense } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import LoginPage from './pages/LoginPage'

const AuthenticatedApp = lazy(() => import('./AuthenticatedApp'))

function LoadingScreen({ message = 'Loading workspace...' }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="text-slate-400 text-sm">{message}</div>
    </div>
  )
}

function AppInner() {
  const { user, loading } = useAuth()

  if (loading) return <LoadingScreen message="Restoring session..." />
  if (!user) return <LoginPage />

  return (
    <Suspense fallback={<LoadingScreen />}>
      <AuthenticatedApp user={user} />
    </Suspense>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </ToastProvider>
  )
}

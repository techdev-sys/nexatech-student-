import { useState } from 'react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

export default function AccountPage() {
  const { user, logout } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (password !== confirmation) {
      setError('New passwords do not match.')
      return
    }
    setBusy(true)
    try {
      await api.post('/api/change-password', {
        current_password: currentPassword,
        password,
        password_confirmation: confirmation,
      })
      await logout()
    } catch (requestError) {
      setError(requestError.response?.data?.errors?.current_password?.[0]
        ?? requestError.response?.data?.errors?.password?.[0]
        ?? 'Could not change the password. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-xl bg-white border border-[#D2D2D2] p-6">
      <h2 className="text-lg font-semibold text-[#001d45]">Account security</h2>
      <p className="text-sm text-[#44474f] mt-1">Signed in as {user.email}. Changing your password signs out every active session.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block text-sm font-medium text-[#001d45]">
          Current password
          <input type="password" autoComplete="current-password" required value={currentPassword}
            onChange={event => setCurrentPassword(event.target.value)}
            className="mt-1 block w-full border border-[#D2D2D2] px-3 py-2" />
        </label>
        <label className="block text-sm font-medium text-[#001d45]">
          New password (at least 12 characters)
          <input type="password" autoComplete="new-password" required minLength={12} value={password}
            onChange={event => setPassword(event.target.value)}
            className="mt-1 block w-full border border-[#D2D2D2] px-3 py-2" />
        </label>
        <label className="block text-sm font-medium text-[#001d45]">
          Confirm new password
          <input type="password" autoComplete="new-password" required minLength={12} value={confirmation}
            onChange={event => setConfirmation(event.target.value)}
            className="mt-1 block w-full border border-[#D2D2D2] px-3 py-2" />
        </label>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={busy}
          className="bg-[#113264] text-white px-5 py-2 text-sm font-semibold disabled:opacity-50">
          {busy ? 'Updating…' : 'Change password'}
        </button>
      </form>
    </div>
  )
}

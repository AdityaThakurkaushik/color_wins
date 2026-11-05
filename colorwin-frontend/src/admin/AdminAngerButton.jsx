import React from 'react'
import { API } from '../api.js'

function authHeaders() {
  const token = localStorage.getItem('colorwin_token')
  return token ? { Authorization: `Bearer ${token}` } : null
}

export default function AdminAngerButton() {
  const [globalLabel, setGlobalLabel] = React.useState('LET IT OUT')
  const [username, setUsername] = React.useState('')
  const [userLabel, setUserLabel] = React.useState('')
  const [users, setUsers] = React.useState([])
  const [error, setError] = React.useState('')
  const [message, setMessage] = React.useState('')
  const [busy, setBusy] = React.useState(false)

  function apply(data) {
    setGlobalLabel(data.label || 'LET IT OUT')
    setUsers(Array.isArray(data.users) ? data.users : [])
  }

  async function load() {
    const headers = authHeaders()
    if (!headers) throw new Error('Login required. Please sign in again.')
    const response = await fetch(`${API}/admin/anger-button`, { headers, cache: 'no-store' })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.message || data.detail || 'Could not load anger button')
    apply(data)
  }

  React.useEffect(() => {
    load().catch((err) => setError(err.message))
  }, [])

  async function save(path, body) {
    const headers = authHeaders()
    if (!headers) {
      setError('Login required. Please sign in again.')
      return
    }
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch(`${API}${path}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.message || data.detail || 'Could not save')
      apply(data)
      setMessage('Saved.')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function removeUser(name) {
    const headers = authHeaders()
    if (!headers) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch(`${API}/admin/anger-button/users/${encodeURIComponent(name)}`, {
        method: 'DELETE',
        headers,
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.message || data.detail || 'Could not remove')
      apply(data)
      setMessage(`${name} now uses the global text.`)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <div className="rounded-xl border border-purple-900 bg-[#091126] p-4 md:p-6">
        <h3 className="text-lg font-bold">Global button text</h3>
        <p className="mt-1 text-sm text-slate-400">Everyone sees this, unless a user has a dedicated line.</p>
        <input
          value={globalLabel}
          maxLength={32}
          onChange={(event) => setGlobalLabel(event.target.value)}
          className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-bold text-white"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => save('/admin/anger-button', { label: globalLabel })}
          className="mt-3 rounded-lg bg-purple-700 px-4 py-2 text-sm font-bold disabled:opacity-50"
        >
          Save for everyone
        </button>
      </div>

      <div className="rounded-xl border border-purple-900 bg-[#091126] p-4 md:p-6">
        <h3 className="text-lg font-bold">Dedicated user</h3>
        <p className="mt-1 text-sm text-slate-400">This user sees a different line. Remove it and they go back to global.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Username"
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
          />
          <input
            value={userLabel}
            maxLength={32}
            onChange={(event) => setUserLabel(event.target.value)}
            placeholder="Button text"
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
          />
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => save('/admin/anger-button/users', { username, label: userLabel })}
          className="mt-3 rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-black disabled:opacity-50"
        >
          Save for this user
        </button>
        <div className="mt-4 space-y-2">
          {users.length === 0 && <p className="text-sm text-slate-500">No dedicated users.</p>}
          {users.map((row) => (
            <div key={row.username} className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 px-3 py-2">
              <div>
                <p className="font-bold text-white">{row.username}</p>
                <p className="text-sm text-amber-300">{row.label}</p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => removeUser(row.username)}
                className="text-sm font-bold text-red-300"
              >
                Use global
              </button>
            </div>
          ))}
        </div>
      </div>
      {error && <p className="text-sm text-red-300">{error}</p>}
      {message && <p className="text-sm text-emerald-300">{message}</p>}
    </section>
  )
}

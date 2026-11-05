import React from 'react'
import { API } from '../api.js'

function getAuthHeaders() {
  const token = localStorage.getItem('colorwin_token')
  return token ? { Authorization: `Bearer ${token}` } : null
}

export default function AdminWalletPolicy() {
  const [global, setGlobal] = React.useState(null)
  const [audit, setAudit] = React.useState([])
  const [userId, setUserId] = React.useState('')
  const [userPolicy, setUserPolicy] = React.useState(null)
  const [error, setError] = React.useState('')
  const [message, setMessage] = React.useState('')
  const [busy, setBusy] = React.useState(false)

  async function load() {
    const headers = getAuthHeaders()
    if (!headers) {
      setError('Login required. Please sign in again.')
      return
    }
    setError('')
    const [policyRes, auditRes] = await Promise.all([
      fetch(`${API}/admin/wallet-policy`, { headers, cache: 'no-store' }),
      fetch(`${API}/admin/wallet-policy/audit`, { headers, cache: 'no-store' }),
    ])
    const policyData = await policyRes.json()
    if (!policyRes.ok) throw new Error(policyData.message || 'Could not load wallet policy')
    setGlobal(policyData)
    if (auditRes.ok) setAudit(await auditRes.json())
  }

  React.useEffect(() => {
    load().catch((err) => setError(err.message))
  }, [])

  async function saveGlobal() {
    const headers = getAuthHeaders()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch(`${API}/admin/wallet-policy`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(global),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Could not save')
      setGlobal(data)
      setMessage('Global wallet policy saved. Existing balances were not changed.')
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function loadUser() {
    const headers = getAuthHeaders()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch(`${API}/admin/wallet-policy/users/${userId}`, { headers, cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'User policy not found')
      setUserPolicy(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function saveUser() {
    const headers = getAuthHeaders()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch(`${API}/admin/wallet-policy/users/${userPolicy.userId}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(userPolicy),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Could not save override')
      setUserPolicy(data)
      setMessage('Per-user override saved. Past transactions were not changed.')
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function clearUser() {
    const headers = getAuthHeaders()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch(`${API}/admin/wallet-policy/users/${userPolicy.userId}`, {
        method: 'DELETE',
        headers,
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Could not clear override')
      setUserPolicy(data)
      setMessage('Per-user override cleared. Global defaults apply.')
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  function field(state, setState, key, label, type) {
    return (
      <label className="block text-sm">
        {label}
        {type === 'check' ? (
          <input
            type="checkbox"
            className="ml-2"
            checked={Boolean(state?.[key])}
            onChange={(event) => setState({ ...state, [key]: event.target.checked })}
          />
        ) : (
          <input
            type="number"
            min="0"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-[#050817] px-3 py-2"
            value={state?.[key] ?? ''}
            onChange={(event) => setState({ ...state, [key]: Number(event.target.value) })}
          />
        )}
      </label>
    )
  }

  return (
    <section className="mx-auto max-w-3xl space-y-4 rounded-xl border border-purple-900 bg-[#091126] p-4 md:p-6">
      <h3 className="text-lg font-bold">Wallet Policy</h3>
      <p className="text-sm text-slate-400">
        Global defaults apply unless a per-user override is set. Changes do not alter past bonuses or withdrawals.
      </p>

      {global && (
        <div className="space-y-3 rounded-lg border border-slate-800 p-4">
          <h4 className="font-semibold">Global defaults</h4>
          {field(global, setGlobal, 'signupBonusEnabled', 'Signup bonus enabled', 'check')}
          {field(global, setGlobal, 'signupBonusAmount', 'Signup bonus amount')}
          {field(global, setGlobal, 'firstWithdrawalCheckEnabled', 'First-withdrawal deposit check enabled', 'check')}
          {field(global, setGlobal, 'firstWithdrawalMinDeposits', 'First withdrawal required deposits')}
          {field(global, setGlobal, 'minWithdrawalEnabled', 'Minimum withdrawal enabled', 'check')}
          {field(global, setGlobal, 'minWithdrawalAmount', 'Minimum withdrawal amount')}
          <button disabled={busy} onClick={saveGlobal} className="w-full rounded-lg bg-purple-700 py-3 font-bold disabled:opacity-50">
            Save global policy
          </button>
        </div>
      )}

      <div className="space-y-3 rounded-lg border border-slate-800 p-4">
        <h4 className="font-semibold">Per-user override</h4>
        <div className="flex gap-2">
          <input
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            placeholder="User ID"
            className="flex-1 rounded-lg border border-slate-700 bg-[#050817] px-3 py-2"
          />
          <button type="button" onClick={loadUser} className="rounded-lg bg-slate-800 px-4 font-bold">Load</button>
        </div>
        {userPolicy && (
          <>
            <p className="text-xs text-slate-400">
              {userPolicy.username} · override {userPolicy.hasOverride ? 'active' : 'using global defaults'}
            </p>
            {field(userPolicy, setUserPolicy, 'signupBonusEnabled', 'Signup bonus enabled', 'check')}
            {field(userPolicy, setUserPolicy, 'signupBonusAmount', 'Signup bonus amount')}
            {field(userPolicy, setUserPolicy, 'firstWithdrawalCheckEnabled', 'First-withdrawal check enabled', 'check')}
            {field(userPolicy, setUserPolicy, 'firstWithdrawalMinDeposits', 'Required approved deposits')}
            {field(userPolicy, setUserPolicy, 'minWithdrawalEnabled', 'Minimum withdrawal enabled', 'check')}
            {field(userPolicy, setUserPolicy, 'minWithdrawalAmount', 'Minimum withdrawal')}
            <div className="flex gap-2">
              <button disabled={busy} onClick={saveUser} className="flex-1 rounded-lg bg-purple-700 py-3 font-bold disabled:opacity-50">Save override</button>
              <button disabled={busy} onClick={clearUser} className="flex-1 rounded-lg border border-slate-600 py-3 font-bold disabled:opacity-50">Clear override</button>
            </div>
          </>
        )}
      </div>

      {error && <p className="rounded-lg border border-red-800 bg-red-950 p-3 text-sm text-red-300">{error}</p>}
      {message && <p className="rounded-lg border border-emerald-800 bg-emerald-950 p-3 text-sm text-emerald-300">{message}</p>}

      <div className="rounded-lg border border-slate-800 p-4">
        <h4 className="font-semibold">Audit</h4>
        <div className="mt-2 max-h-64 space-y-2 overflow-y-auto text-xs text-slate-300">
          {audit.length === 0 && <p>No policy changes recorded yet.</p>}
          {audit.map((row) => (
            <p key={row.id}>
              {row.createdAt} · {row.actorUsername} · {row.settingKey}: {row.oldValue} → {row.newValue}
              {row.targetUserId ? ` · user ${row.targetUserId}` : ''}
            </p>
          ))}
        </div>
      </div>
    </section>
  )
}

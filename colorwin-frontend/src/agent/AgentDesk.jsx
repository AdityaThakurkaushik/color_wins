import React from 'react'
import { API } from '../api.js'

const depositReasons = [
  'Payment not matched with UTR/UPI transaction ID',
  'wrong UTR/UPI transaction ID',
  'Payment Not Received',
  'Wrong UTR/UPI transaction ID and amount',
  'Due to technical reason.',
]

const withdrawReasons = [
  'Due to a technical reason, withdrawal may take up to 12 hours. Thanks for your patience.',
  'Bank details do not match the account name.',
  'This payout could not be completed. Your coins were returned.',
  'Withdrawal request was cancelled. Your coins were returned.',
  'Daily withdrawal limit reached. Please try again later.',
]

export default function AgentDesk({ panel }) {
  const approval = panel === 'approval'
  const rejectReasons = approval ? depositReasons : withdrawReasons
  const storageKey = approval ? 'colorwin_approval_token' : 'colorwin_withdraw_token'
  const title = approval ? 'Approval-Agent' : 'withdraw-Agent'
  const [token, setToken] = React.useState(() => localStorage.getItem(storageKey) || '')
  const [agentId, setAgentId] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [rows, setRows] = React.useState([])
  const [reasons, setReasons] = React.useState({})
  const [custom, setCustom] = React.useState({})
  const [error, setError] = React.useState('')
  const [message, setMessage] = React.useState('')
  const [busy, setBusy] = React.useState(false)

  async function load(current = token) {
    const path = approval ? '/approval/deposits' : '/withdraw-agent/withdrawals'
    const response = await fetch(`${API}${path}`, {
      headers: { Authorization: `Bearer ${current}` },
      cache: 'no-store',
    })
    if (response.status === 401) {
      localStorage.removeItem(storageKey)
      setToken('')
      throw new Error('Login again')
    }
    if (!response.ok) throw new Error('Could not load requests')
    setRows(await response.json())
  }

  React.useEffect(() => {
    if (!token) return
    load(token).catch((err) => setError(err.message))
  }, [token])

  async function login(event) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const response = await fetch(`${API}/agent/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, password, panel }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.message || 'Login failed')
      localStorage.setItem(storageKey, data.token)
      setToken(data.token)
      setPassword('')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  function logout() {
    localStorage.removeItem(storageKey)
    setToken('')
    setRows([])
  }

  async function act(publicId, action, preset) {
    setError('')
    setMessage('')
    const reason = (preset || custom[publicId] || reasons[publicId] || '').trim()
    if (action === 'reject' && reason.length < 3) {
      setError('Choose a reason or type one. The user will see it.')
      return
    }
    const base = approval ? `/approval/deposits/${publicId}` : `/withdraw-agent/withdrawals/${publicId}`
    const path = action === 'approve' ? (approval ? `${base}/approve` : `${base}/paid`) : `${base}/reject`
    const response = await fetch(`${API}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: action === 'reject' ? JSON.stringify({ reason }) : '{}',
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(data.message || 'Action failed')
      return
    }
    setMessage(action === 'reject' ? `${publicId} rejected. Reason: ${reason}` : `${publicId} approved`)
    await load(token)
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050817] p-4 text-white">
        <form onSubmit={login} className="w-full max-w-sm space-y-3 rounded-2xl border border-purple-800 bg-[#091126] p-6">
          <h1 className="text-2xl font-black">{title}</h1>
          <p className="text-sm text-slate-400">Use the agent ID and password given by the admin.</p>
          <input value={agentId} onChange={(event) => setAgentId(event.target.value)} placeholder="Agent ID" className="w-full rounded-lg border border-slate-700 bg-[#050817] px-3 py-2" required />
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="Password" className="w-full rounded-lg border border-slate-700 bg-[#050817] px-3 py-2" required />
          {error && <p className="text-sm text-red-300">{error}</p>}
          <button disabled={busy} className="w-full rounded-lg bg-purple-700 py-2 font-bold disabled:opacity-50">{busy ? 'Checking...' : 'Enter'}</button>
        </form>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050817] p-4 text-white">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-black">{title}</h1>
          <button onClick={logout} className="text-sm font-bold text-red-300">Logout</button>
        </div>
        {error && <p className="mb-3 text-sm text-red-300">{error}</p>}
        {message && <p className="mb-3 text-sm text-emerald-300">{message}</p>}
        <div className="space-y-3">
          {rows.length === 0 && <p className="text-sm text-slate-400">Nothing waiting.</p>}
          {rows.map((row) => (
            <div key={row.publicId} className="rounded-xl border border-purple-900 bg-[#091126] p-4">
              <p className="font-bold">{row.publicId} · {row.username}</p>
              <p className="text-sm text-slate-300">{row.amount} coins{row.utr ? ` · UTR ${row.utr}` : ''}</p>
              {row.upiId && <p className="text-xs text-slate-400">{row.methodLabel} · {row.upiId}</p>}
              <div className="mt-2 space-y-1">
                {rejectReasons.map((reason) => (
                  <button key={reason} type="button" onClick={() => act(row.publicId, 'reject', reason)} className="block w-full rounded-lg border border-red-900 px-3 py-2 text-left text-xs text-red-200">{reason}</button>
                ))}
              </div>
              <input value={custom[row.publicId] || ''} onChange={(event) => setCustom({ ...custom, [row.publicId]: event.target.value })} placeholder="Or type your own reason" className="mt-2 w-full rounded-lg border border-slate-700 bg-[#050817] px-3 py-2 text-sm" />
              <div className="mt-2 flex gap-2">
                <button onClick={() => act(row.publicId, 'approve')} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-bold">{approval ? 'Approve' : 'Mark paid'}</button>
                <button onClick={() => act(row.publicId, 'reject')} className="rounded-lg bg-red-800 px-3 py-2 text-sm font-bold">Reject with typed reason</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

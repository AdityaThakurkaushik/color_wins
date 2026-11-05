import React from 'react'
import { API } from '../api.js'

function headers() {
  const token = localStorage.getItem('colorwin_token')
  return token ? { Authorization: `Bearer ${token}` } : null
}

export default function AdminReferralAgents() {
  const [agents, setAgents] = React.useState([])
  const [form, setForm] = React.useState({ username: '', password: '', displayName: '', agentCode: '' })
  const [error, setError] = React.useState('')
  const [message, setMessage] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [busyId, setBusyId] = React.useState(null)

  async function load() {
    setLoading(true)
    try {
      const auth = headers()
      const response = await fetch(`${API}/admin/referral-agents`, { headers: auth, cache: 'no-store' })
      if (!response.ok) throw new Error('Could not load referral agents')
      const data = await response.json()
      setAgents(Array.isArray(data) ? data : [])
      setError('')
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    load().catch((err) => setError(err.message || 'Load failed'))
  }, [])

  async function createAgent(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    const response = await fetch(`${API}/admin/referral-agents`, {
      method: 'POST',
      headers: { ...headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: form.username.trim(),
        password: form.password,
        displayName: form.displayName.trim() || undefined,
        agentCode: form.agentCode.trim() || undefined,
      }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(data.message || 'Could not create agent')
      return
    }
    setMessage(`Created ${data.username}. Link: ${data.referralLink}`)
    setForm({ username: '', password: '', displayName: '', agentCode: '' })
    await load()
  }

  async function toggle(agent) {
    const next = !agent.active
    if (!window.confirm(`${next ? 'Unblock' : 'Block'} ${agent.username}?`)) return
    setBusyId(agent.id)
    try {
      const response = await fetch(`${API}/admin/referral-agents/${agent.id}/status`, {
        method: 'PATCH',
        headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: next }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.message || 'Update failed')
      setAgents((list) => list.map((item) => (item.id === agent.id ? data : item)))
      setMessage(`${agent.username} ${next ? 'unblocked' : 'blocked'}`)
    } catch (err) {
      setError(err.message || 'Update failed')
    } finally {
      setBusyId(null)
    }
  }

  async function resetPassword(agent) {
    const password = window.prompt(`New password for ${agent.username} (min 8 chars)`)
    if (!password) return
    setBusyId(agent.id)
    try {
      const response = await fetch(`${API}/admin/referral-agents/${agent.id}/password`, {
        method: 'POST',
        headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.message || 'Password reset failed')
      setMessage(`Password updated for ${agent.username}`)
    } catch (err) {
      setError(err.message || 'Password reset failed')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-yellow-700/40 bg-[#091126] p-4">
        <h3 className="text-lg font-bold">Create Referral Agent</h3>
        <p className="mt-1 text-sm text-slate-400">
          Agent panel: <code className="text-yellow-300">/referral-agent</code> · link uses <code className="text-yellow-300">?aref=CODE</code>
        </p>
        <form onSubmit={createAgent} className="mt-4 grid gap-2 md:grid-cols-2">
          <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="Username / login ID" className="rounded-lg border border-slate-700 bg-[#050817] px-3 py-2" required />
          <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Password (8+)" className="rounded-lg border border-slate-700 bg-[#050817] px-3 py-2" required />
          <input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} placeholder="Display name (optional)" className="rounded-lg border border-slate-700 bg-[#050817] px-3 py-2" />
          <input value={form.agentCode} onChange={(e) => setForm({ ...form, agentCode: e.target.value })} placeholder="Custom aref code (optional)" className="rounded-lg border border-slate-700 bg-[#050817] px-3 py-2" />
          <button className="rounded-lg bg-yellow-500 px-4 py-2 font-bold text-black md:col-span-2">Create agent</button>
        </form>
        {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
        {message && <p className="mt-2 break-all text-sm text-emerald-300">{message}</p>}
      </div>

      <div className="rounded-xl border border-purple-900 bg-[#091126] p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg font-bold">Referral Agents</h3>
          <button type="button" onClick={() => load().catch((e) => setError(e.message))} className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm">
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="px-2 py-2">Agent</th>
                <th className="px-2 py-2">Code / Link</th>
                <th className="px-2 py-2">Refs</th>
                <th className="px-2 py-2">Earned</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => (
                <tr key={agent.id} className="border-t border-slate-800">
                  <td className="px-2 py-3">
                    <p className="font-bold">{agent.displayName || agent.username}</p>
                    <p className="text-xs text-slate-400">@{agent.username}</p>
                  </td>
                  <td className="px-2 py-3">
                    <p className="font-mono text-yellow-300">{agent.agentCode}</p>
                    <p className="max-w-[220px] break-all text-[11px] text-slate-400">{agent.referralLink}</p>
                  </td>
                  <td className="px-2 py-3">{Number(agent.totalReferrals || 0).toLocaleString('en-IN')}</td>
                  <td className="px-2 py-3 text-emerald-300">{Number(agent.totalEarned || 0).toLocaleString('en-IN')}</td>
                  <td className="px-2 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${agent.active ? 'bg-emerald-950 text-emerald-300' : 'bg-red-950 text-red-300'}`}>
                      {agent.active ? 'Active' : 'Blocked'}
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" disabled={busyId === agent.id} onClick={() => toggle(agent)} className="rounded-lg border border-slate-600 px-2 py-1 text-xs">
                        {agent.active ? 'Block' : 'Unblock'}
                      </button>
                      <button type="button" disabled={busyId === agent.id} onClick={() => resetPassword(agent)} className="rounded-lg border border-slate-600 px-2 py-1 text-xs">
                        Reset pass
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {agents.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-2 py-6 text-center text-slate-400">No referral agents yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

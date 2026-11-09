import React from 'react'
import { API } from '../api.js'

function headers() {
  const token = localStorage.getItem('colorwin_token')
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' }
}

function money(n) {
  return Number(n || 0).toLocaleString('en-IN')
}

export default function AdminReferralAgents() {
  const [agents, setAgents] = React.useState([])
  const [pending, setPending] = React.useState([])
  const [form, setForm] = React.useState({ username: '', password: '', displayName: '', agentCode: '' })
  const [msgForm, setMsgForm] = React.useState({ agentId: '', title: '', body: '' })
  const [rejectReason, setRejectReason] = React.useState('')
  const [rejectId, setRejectId] = React.useState(null)
  const [error, setError] = React.useState('')
  const [message, setMessage] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [busyId, setBusyId] = React.useState(null)
  const [selectedId, setSelectedId] = React.useState(null)
  const [detail, setDetail] = React.useState({ referrals: [], earnings: [], withdrawals: [] })
  const [edit, setEdit] = React.useState({
    displayName: '',
    agentCode: '',
    firstDepositPercent: '',
    nextDepositPercent: '',
    minBalance: '',
    password: '',
    balanceDelta: '',
  })

  async function load() {
    setLoading(true)
    try {
      const [agentsRes, pendingRes] = await Promise.all([
        fetch(`${API}/admin/referral-agents`, { headers: headers(), cache: 'no-store' }),
        fetch(`${API}/admin/referral-agents/pending-withdrawals`, { headers: headers(), cache: 'no-store' }),
      ])
      if (!agentsRes.ok) throw new Error('Could not load referral agents.')
      setAgents(await agentsRes.json())
      setPending(pendingRes.ok ? await pendingRes.json() : [])
      setError('')
    } finally {
      setLoading(false)
    }
  }

  async function loadDetail(id) {
    const [refs, earns, withs] = await Promise.all([
      fetch(`${API}/admin/referral-agents/${id}/referrals`, { headers: headers(), cache: 'no-store' }),
      fetch(`${API}/admin/referral-agents/${id}/earnings`, { headers: headers(), cache: 'no-store' }),
      fetch(`${API}/admin/referral-agents/${id}/withdrawals`, { headers: headers(), cache: 'no-store' }),
    ])
    setDetail({
      referrals: refs.ok ? await refs.json() : [],
      earnings: earns.ok ? await earns.json() : [],
      withdrawals: withs.ok ? await withs.json() : [],
    })
  }

  React.useEffect(() => {
    load().catch((err) => setError(err.message || 'Load failed.'))
  }, [])

  React.useEffect(() => {
    if (!selectedId) return
    const agent = agents.find((a) => a.id === selectedId)
    if (!agent) return
    setEdit({
      displayName: agent.displayName || '',
      agentCode: agent.agentCode || '',
      firstDepositPercent: agent.firstDepositPercent ?? '',
      nextDepositPercent: agent.nextDepositPercent ?? '',
      minBalance: agent.minBalance ?? '',
      password: '',
      balanceDelta: '',
    })
    loadDetail(selectedId).catch((err) => setError(err.message || 'Detail load failed.'))
  }, [selectedId, agents])

  async function createAgent(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    const response = await fetch(`${API}/admin/referral-agents`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        username: form.username.trim(),
        password: form.password,
        displayName: form.displayName.trim() || undefined,
        agentCode: form.agentCode.trim() || undefined,
      }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(data.message || 'Could not create agent.')
      return
    }
    setMessage(`Created ${data.username}. Link: ${data.referralLink}`)
    setForm({ username: '', password: '', displayName: '', agentCode: '' })
    await load()
  }

  async function api(path, options = {}) {
    const response = await fetch(`${API}${path}`, { ...options, headers: headers() })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.message || 'Request failed.')
    return data
  }

  async function toggle(agent) {
    const next = !agent.active
    if (!window.confirm(`${next ? 'Unblock' : 'Block'} ${agent.username}?`)) return
    setBusyId(agent.id)
    try {
      const data = await api(`/admin/referral-agents/${agent.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ active: next }),
      })
      setAgents((list) => list.map((item) => (item.id === agent.id ? data : item)))
      setMessage(`${agent.username} ${next ? 'unblocked' : 'blocked'}.`)
    } catch (err) {
      setError(err.message || 'Update failed.')
    } finally {
      setBusyId(null)
    }
  }

  async function saveEdit() {
    if (!selectedId) return
    setBusyId(selectedId)
    setError('')
    try {
      const body = {
        displayName: edit.displayName.trim(),
        agentCode: edit.agentCode.trim(),
        clearFirstDepositPercent: edit.firstDepositPercent === '' || edit.firstDepositPercent == null,
        clearNextDepositPercent: edit.nextDepositPercent === '' || edit.nextDepositPercent == null,
        clearMinBalance: edit.minBalance === '' || edit.minBalance == null,
      }
      if (!body.clearFirstDepositPercent) body.firstDepositPercent = Number(edit.firstDepositPercent)
      if (!body.clearNextDepositPercent) body.nextDepositPercent = Number(edit.nextDepositPercent)
      if (!body.clearMinBalance) body.minBalance = Number(edit.minBalance)
      const data = await api(`/admin/referral-agents/${selectedId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
      setAgents((list) => list.map((item) => (item.id === selectedId ? data : item)))
      setMessage('Agent settings saved.')
    } catch (err) {
      setError(err.message || 'Save failed.')
    } finally {
      setBusyId(null)
    }
  }

  async function resetPassword() {
    if (!selectedId) return
    const password = (edit.password || '').trim()
    if (password.length < 8) {
      setError('New password must be at least 8 characters.')
      return
    }
    setBusyId(selectedId)
    setError('')
    try {
      await api(`/admin/referral-agents/${selectedId}/password`, {
        method: 'POST',
        body: JSON.stringify({ password }),
      })
      setEdit((cur) => ({ ...cur, password: '' }))
      setMessage('Password updated.')
    } catch (err) {
      setError(err.message || 'Password reset failed.')
    } finally {
      setBusyId(null)
    }
  }

  async function adjustBalance() {
    if (!selectedId) return
    const delta = Number(edit.balanceDelta)
    if (!Number.isFinite(delta) || delta === 0) {
      setError('Enter a non-zero balance change.')
      return
    }
    setBusyId(selectedId)
    setError('')
    try {
      const data = await api(`/admin/referral-agents/${selectedId}/balance`, {
        method: 'POST',
        body: JSON.stringify({ delta, note: 'admin adjust' }),
      })
      setAgents((list) => list.map((item) => (item.id === selectedId ? data : item)))
      setEdit((cur) => ({ ...cur, balanceDelta: '' }))
      await loadDetail(selectedId)
      setMessage(`Balance adjusted by ${delta}.`)
    } catch (err) {
      setError(err.message || 'Balance adjust failed.')
    } finally {
      setBusyId(null)
    }
  }

  async function removeAgent(agent) {
    if (!window.confirm(`Delete ${agent.username}? This cannot be undone.`)) return
    setBusyId(agent.id)
    try {
      await api(`/admin/referral-agents/${agent.id}`, { method: 'DELETE' })
      if (selectedId === agent.id) setSelectedId(null)
      setMessage(`${agent.username} deleted.`)
      await load()
    } catch (err) {
      setError(err.message || 'Delete failed.')
    } finally {
      setBusyId(null)
    }
  }

  async function markPaid(id) {
    setBusyId(`w-${id}`)
    try {
      await api(`/admin/referral-agents/withdrawals/${id}/paid`, { method: 'POST', body: '{}' })
      setMessage(`Withdrawal #${id} marked as paid.`)
      await load()
      if (selectedId) await loadDetail(selectedId)
    } catch (err) {
      setError(err.message || 'Could not mark withdrawal as paid.')
    } finally {
      setBusyId(null)
    }
  }

  async function rejectWithdraw(id) {
    const reason = (rejectReason || '').trim()
    if (!reason) {
      setError('Please enter a reject reason.')
      return
    }
    setBusyId(`w-${id}`)
    try {
      await api(`/admin/referral-agents/withdrawals/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      })
      setRejectId(null)
      setRejectReason('')
      setMessage(`Withdrawal #${id} rejected.`)
      await load()
      if (selectedId) await loadDetail(selectedId)
    } catch (err) {
      setError(err.message || 'Could not reject withdrawal.')
    } finally {
      setBusyId(null)
    }
  }

  async function sendMessage(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    try {
      const data = await api('/admin/referral-agents/messages', {
        method: 'POST',
        body: JSON.stringify({
          agentId: msgForm.agentId ? Number(msgForm.agentId) : null,
          title: msgForm.title.trim(),
          body: msgForm.body.trim(),
        }),
      })
      setMessage(data.message || `Message sent to ${data.sent} agent(s).`)
      setMsgForm({ agentId: '', title: '', body: '' })
    } catch (err) {
      setError(err.message || 'Could not send message.')
    }
  }

  const selected = agents.find((a) => a.id === selectedId) || null

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

      <div className="rounded-xl border border-sky-700/40 bg-[#091126] p-4">
        <h3 className="text-lg font-bold">Send admin message</h3>
        <p className="mt-1 text-sm text-slate-400">Send to one agent, or leave recipient blank to message all active agents.</p>
        <form onSubmit={sendMessage} className="mt-3 grid gap-2">
          <select value={msgForm.agentId} onChange={(e) => setMsgForm({ ...msgForm, agentId: e.target.value })} className="rounded-lg border border-slate-700 bg-[#050817] px-3 py-2">
            <option value="">All active agents</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>{a.displayName || a.username} (@{a.username})</option>
            ))}
          </select>
          <input value={msgForm.title} onChange={(e) => setMsgForm({ ...msgForm, title: e.target.value })} placeholder="Message title" className="rounded-lg border border-slate-700 bg-[#050817] px-3 py-2" required maxLength={120} />
          <textarea value={msgForm.body} onChange={(e) => setMsgForm({ ...msgForm, body: e.target.value })} placeholder="Message body" className="min-h-[90px] rounded-lg border border-slate-700 bg-[#050817] px-3 py-2" required maxLength={2000} />
          <button className="rounded-lg bg-sky-600 px-4 py-2 font-bold">Send message</button>
        </form>
      </div>

      <div className="rounded-xl border border-amber-700/50 bg-[#091126] p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg font-bold">Pending agent withdrawals</h3>
          <span className="text-xs text-slate-400">{pending.length} pending</span>
        </div>
        <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
          {pending.length === 0 && <p className="text-sm text-slate-500">No pending withdrawals.</p>}
          {pending.map((w) => (
            <div key={w.id} className="rounded-lg border border-slate-800 px-3 py-2 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold">{w.agentDisplayName || w.agentUsername} · {money(w.amount)}</p>
                  <p className="text-xs text-slate-400">
                    {w.payoutMethod} · {w.accountHolderName}
                    {w.upiId ? ` · ${w.upiId}` : ''}
                    {w.bankAccountNumber ? ` · ${w.bankName} ${w.bankAccountNumber}` : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" disabled={busyId === `w-${w.id}`} onClick={() => markPaid(w.id)} className="rounded border border-emerald-700 px-2 py-1 text-xs text-emerald-300">Mark paid</button>
                  <button type="button" disabled={busyId === `w-${w.id}`} onClick={() => { setRejectId(w.id); setRejectReason('') }} className="rounded border border-red-700 px-2 py-1 text-xs text-red-300">Reject</button>
                </div>
              </div>
              {rejectId === w.id && (
                <div className="mt-2 flex gap-2">
                  <input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reject reason" className="w-full rounded border border-slate-700 bg-[#050817] px-2 py-1 text-xs" />
                  <button type="button" onClick={() => rejectWithdraw(w.id)} className="rounded border border-red-700 px-2 py-1 text-xs text-red-300">Confirm</button>
                </div>
              )}
            </div>
          ))}
        </div>
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
                <th className="px-2 py-2">Code / %</th>
                <th className="px-2 py-2">Balance</th>
                <th className="px-2 py-2">Withdrawable</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => (
                <tr key={agent.id} className={`border-t border-slate-800 ${selectedId === agent.id ? 'bg-purple-950/40' : ''}`}>
                  <td className="px-2 py-3">
                    <button type="button" className="text-left" onClick={() => setSelectedId(agent.id)}>
                      <p className="font-bold">{agent.displayName || agent.username}</p>
                      <p className="text-xs text-slate-400">@{agent.username}</p>
                    </button>
                  </td>
                  <td className="px-2 py-3">
                    <p className="font-mono text-yellow-300">{agent.agentCode}</p>
                    <p className="text-[11px] text-slate-400">
                      {agent.effectiveFirstDepositPercent ?? agent.globalFirstDepositPercent}% /
                      {' '}{agent.effectiveNextDepositPercent ?? agent.globalNextDepositPercent}%
                    </p>
                  </td>
                  <td className="px-2 py-3 text-emerald-300">{money(agent.balance)}</td>
                  <td className="px-2 py-3 text-amber-200">{money(agent.withdrawableBalance)} <span className="text-[10px] text-slate-500">(min {money(agent.effectiveMinBalance)})</span></td>
                  <td className="px-2 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${agent.active ? 'bg-emerald-950 text-emerald-300' : 'bg-red-950 text-red-300'}`}>
                      {agent.active ? 'Active' : 'Blocked'}
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => setSelectedId(agent.id)} className="rounded-lg border border-slate-600 px-2 py-1 text-xs">Manage</button>
                      <button type="button" disabled={busyId === agent.id} onClick={() => toggle(agent)} className="rounded-lg border border-slate-600 px-2 py-1 text-xs">
                        {agent.active ? 'Block' : 'Unblock'}
                      </button>
                      <button type="button" disabled={busyId === agent.id} onClick={() => removeAgent(agent)} className="rounded-lg border border-red-800 px-2 py-1 text-xs text-red-300">Delete</button>
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

      {selected && (
        <div className="space-y-4 rounded-xl border border-cyan-800/50 bg-[#091126] p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-bold">Manage @{selected.username}</h3>
            <button type="button" onClick={() => setSelectedId(null)} className="rounded border border-slate-700 px-2 py-1 text-xs">Close</button>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <input value={edit.displayName} onChange={(e) => setEdit({ ...edit, displayName: e.target.value })} placeholder="Display name" className="rounded-lg border border-slate-700 bg-[#050817] px-3 py-2" />
            <input value={edit.agentCode} onChange={(e) => setEdit({ ...edit, agentCode: e.target.value })} placeholder="Agent code" className="rounded-lg border border-slate-700 bg-[#050817] px-3 py-2 font-mono uppercase" />
            <label className="text-xs text-slate-400">
              1st deposit % (blank = global {selected.globalFirstDepositPercent}%)
              <input type="number" min="0" max="100" step="0.01" value={edit.firstDepositPercent} onChange={(e) => setEdit({ ...edit, firstDepositPercent: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-[#050817] px-3 py-2 text-sm text-white" />
            </label>
            <label className="text-xs text-slate-400">
              Next deposit % (blank = global {selected.globalNextDepositPercent}%)
              <input type="number" min="0" max="100" step="0.01" value={edit.nextDepositPercent} onChange={(e) => setEdit({ ...edit, nextDepositPercent: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-[#050817] px-3 py-2 text-sm text-white" />
            </label>
            <label className="text-xs text-slate-400 md:col-span-2">
              Min balance override (blank = global {money(selected.globalMinAgentBalance)})
              <input type="number" min="0" step="1" value={edit.minBalance} onChange={(e) => setEdit({ ...edit, minBalance: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-[#050817] px-3 py-2 text-sm text-white" />
            </label>
          </div>
          <button type="button" disabled={busyId === selected.id} onClick={saveEdit} className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-bold">Save settings</button>

          <div className="grid gap-2 md:grid-cols-2">
            <div className="rounded-lg border border-slate-800 p-3">
              <p className="mb-2 text-sm font-bold">Reset password</p>
              <div className="flex gap-2">
                <input type="text" value={edit.password} onChange={(e) => setEdit({ ...edit, password: e.target.value })} placeholder="New password (8+)" className="w-full rounded-lg border border-slate-700 bg-[#050817] px-3 py-2" />
                <button type="button" disabled={busyId === selected.id} onClick={resetPassword} className="rounded-lg border border-yellow-600 px-3 py-2 text-xs font-bold text-yellow-300">Set</button>
              </div>
            </div>
            <div className="rounded-lg border border-slate-800 p-3">
              <p className="mb-2 text-sm font-bold">Adjust balance (current {money(selected.balance)})</p>
              <div className="flex gap-2">
                <input type="number" value={edit.balanceDelta} onChange={(e) => setEdit({ ...edit, balanceDelta: e.target.value })} placeholder="+100 or -50" className="w-full rounded-lg border border-slate-700 bg-[#050817] px-3 py-2" />
                <button type="button" disabled={busyId === selected.id} onClick={adjustBalance} className="rounded-lg border border-emerald-600 px-3 py-2 text-xs font-bold text-emerald-300">Apply</button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div>
              <h4 className="font-bold">Referred users ({detail.referrals.length})</h4>
              <ul className="mt-2 max-h-64 space-y-2 overflow-y-auto text-sm">
                {detail.referrals.map((u) => (
                  <li key={u.id || u.username} className="rounded border border-slate-800 px-2 py-2">
                    <p className="font-bold">{u.displayName}</p>
                    <p className="text-xs text-slate-400">@{u.username} · {money(u.betsCount)} bets · bal {money(u.balance)}</p>
                  </li>
                ))}
                {detail.referrals.length === 0 && <li className="text-slate-500">No users</li>}
              </ul>
            </div>
            <div>
              <h4 className="font-bold">Earnings history</h4>
              <ul className="mt-2 max-h-64 space-y-2 overflow-y-auto text-sm">
                {detail.earnings.map((e) => (
                  <li key={e.id} className="rounded border border-slate-800 px-2 py-2">
                    <div className="flex justify-between gap-2">
                      <span>{e.kind}</span>
                      <span className="text-emerald-300">+{money(e.coins)}</span>
                    </div>
                  </li>
                ))}
                {detail.earnings.length === 0 && <li className="text-slate-500">No earnings</li>}
              </ul>
            </div>
            <div>
              <h4 className="font-bold">Withdrawals</h4>
              <ul className="mt-2 max-h-64 space-y-2 overflow-y-auto text-sm">
                {detail.withdrawals.map((w) => (
                  <li key={w.id} className="rounded border border-slate-800 px-2 py-2">
                    <div className="flex justify-between gap-2">
                      <span>{money(w.amount)}</span>
                      <span>{w.status}</span>
                    </div>
                  </li>
                ))}
                {detail.withdrawals.length === 0 && <li className="text-slate-500">No withdrawals</li>}
              </ul>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

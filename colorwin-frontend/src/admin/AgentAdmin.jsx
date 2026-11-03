import React from 'react'
import { API } from '../api.js'

function headers() {
  const token = localStorage.getItem('colorwin_token')
  return token ? { Authorization: `Bearer ${token}` } : null
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('en-IN')
}

export default function AgentAdmin({ kind }) {
  const approval = kind === 'APPROVAL'
  const [agents, setAgents] = React.useState([])
  const [activity, setActivity] = React.useState({ items: [], page: 0, totalPages: 0, total: 0 })
  const [form, setForm] = React.useState({ agentId: '', password: '' })
  const [error, setError] = React.useState('')
  const [message, setMessage] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  async function load(page = 0) {
    setLoading(true)
    try {
      const auth = headers()
      const activityKind = approval ? 'DEPOSIT' : 'WITHDRAWAL'
      const [agentResponse, activityResponse] = await Promise.all([
        fetch(`${API}/admin/review/agents?kind=${kind}`, { headers: auth, cache: 'no-store' }),
        fetch(`${API}/admin/review/activity?kind=${activityKind}&page=${page}`, { headers: auth, cache: 'no-store' }),
      ])
      if (!agentResponse.ok || !activityResponse.ok) throw new Error('Could not load agents')
      const agentData = await agentResponse.json()
      setAgents(Array.isArray(agentData) ? agentData : [])
      setActivity(await activityResponse.json())
      setError('')
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    load(0).catch((err) => setError(err.message || 'Could not load agents'))
  }, [kind])

  async function createAgent(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    const response = await fetch(`${API}/admin/review/agents`, {
      method: 'POST',
      headers: { ...headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, kind }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(data.message || 'Could not create agent')
      return
    }
    setMessage(`${data.agentId} created. Share this ID and password.`)
    setForm({ agentId: '', password: '' })
    await load(0)
  }

  const activeCount = agents.filter((agent) => agent.active).length
  const blockedCount = agents.length - activeCount

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-purple-900 bg-[#091126] p-4">
        <h3 className="text-lg font-bold">{approval ? 'Create Approval-Agent' : 'Create withdraw-Agent'}</h3>
        <p className="mt-1 text-sm text-slate-400">
          {approval
            ? 'This agent logs in at /approval-agent and can approve or reject deposit credits only.'
            : 'This agent logs in at /withdraw-agent and can mark withdrawals paid or reject them.'}
        </p>
        <form onSubmit={createAgent} className="mt-4 grid gap-2 md:grid-cols-3">
          <input value={form.agentId} onChange={(event) => setForm({ ...form, agentId: event.target.value })} placeholder="Agent ID" className="rounded-lg border border-slate-700 bg-[#050817] px-3 py-2" required />
          <input value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Password" className="rounded-lg border border-slate-700 bg-[#050817] px-3 py-2" required />
          <button className="rounded-lg bg-purple-700 px-4 py-2 font-bold">Create</button>
        </form>
        {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
        {message && <p className="mt-2 text-sm text-emerald-300">{message}</p>}
      </div>

      <div className="rounded-xl border border-purple-900 bg-[#091126] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold">{approval ? 'Approval Agent Management' : 'Withdraw Agent Management'}</h3>
            <p className="mt-1 text-sm text-slate-400">All agents created to date. Newly created agents appear here automatically.</p>
          </div>
          <button type="button" onClick={() => load(activity.page || 0).catch((err) => setError(err.message))} disabled={loading} className="rounded-lg border border-purple-700 px-3 py-2 text-sm hover:bg-purple-900/50 disabled:opacity-50">
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-700 bg-[#050817] p-3">
            <p className="text-sm text-slate-400">Total Created</p>
            <p className="mt-1 text-2xl font-bold text-white">{agents.length}</p>
          </div>
          <div className="rounded-lg border border-emerald-900 bg-emerald-950/20 p-3">
            <p className="text-sm text-slate-400">Active Agents</p>
            <p className="mt-1 text-2xl font-bold text-emerald-300">{activeCount}</p>
          </div>
          <div className="rounded-lg border border-red-900 bg-red-950/20 p-3">
            <p className="text-sm text-slate-400">Blocked / Inactive</p>
            <p className="mt-1 text-2xl font-bold text-red-300">{blockedCount}</p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="bg-[#050817] text-slate-400">
              <tr>
                <th className="px-3 py-3">#</th>
                <th className="px-3 py-3">Agent ID</th>
                <th className="px-3 py-3">Agent Type</th>
                <th className="px-3 py-3">Created At</th>
                <th className="px-3 py-3">Current Status</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent, index) => (
                <tr key={agent.id} className="border-t border-slate-800">
                  <td className="px-3 py-3 text-slate-400">{index + 1}</td>
                  <td className="px-3 py-3 font-semibold text-white">{agent.agentId || '—'}</td>
                  <td className="px-3 py-3">{agent.kind || kind}</td>
                  <td className="px-3 py-3 text-slate-300">{formatDate(agent.createdAt)}</td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${agent.active ? 'bg-emerald-950 text-emerald-300' : 'bg-red-950 text-red-300'}`}>
                      {agent.active ? 'Active' : 'Blocked'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && agents.length === 0 && <p className="py-6 text-center text-sm text-slate-400">No agents created yet.</p>}
        </div>
        <p className="mt-3 text-xs text-slate-500">Agent records are displayed from the existing admin API. No agent is deleted or modified from this list.</p>
      </div>

      <div className="rounded-xl border border-purple-900 bg-[#091126] p-4">
        <h3 className="text-lg font-bold">{approval ? 'Approval activity' : 'Withdraw activity'}</h3>
        <p className="mt-1 text-sm text-slate-400">{activity.total || 0} records. 10 per page.</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="py-2 pr-3">When</th>
                <th className="py-2 pr-3">Agent</th>
                <th className="py-2 pr-3">Action</th>
                <th className="py-2 pr-3">Transaction</th>
                <th className="py-2 pr-3">Player</th>
                <th className="py-2 pr-3">Amount</th>
                <th className="py-2">Reason</th>
              </tr>
            </thead>
            <tbody>
              {(activity.items || []).map((item) => (
                <tr key={item.id} className="border-t border-slate-800">
                  <td className="py-2 pr-3">{formatDate(item.createdAt)}</td>
                  <td className="py-2 pr-3">{item.agentId}</td>
                  <td className="py-2 pr-3">{item.action}</td>
                  <td className="py-2 pr-3">{item.publicId}</td>
                  <td className="py-2 pr-3">{item.player}</td>
                  <td className="py-2 pr-3">{item.amount}</td>
                  <td className="py-2">{item.reason || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(activity.items || []).length === 0 && <p className="mt-3 text-sm text-slate-400">No activity yet.</p>}
        </div>
        <div className="mt-3 flex items-center gap-3 text-sm">
          <button type="button" disabled={activity.page <= 0 || loading} onClick={() => load(activity.page - 1).catch((err) => setError(err.message))} className="rounded-lg border border-slate-700 px-3 py-1 disabled:opacity-40">Previous</button>
          <span>Page {activity.totalPages === 0 ? 0 : activity.page + 1} of {activity.totalPages}</span>
          <button type="button" disabled={activity.page + 1 >= activity.totalPages || loading} onClick={() => load(activity.page + 1).catch((err) => setError(err.message))} className="rounded-lg border border-slate-700 px-3 py-1 disabled:opacity-40">Next</button>
        </div>
      </div>
    </section>
  )
}

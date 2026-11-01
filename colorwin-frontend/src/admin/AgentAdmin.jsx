import React from 'react'
import { API } from '../api.js'

function headers() {
  const token = localStorage.getItem('colorwin_token')
  return token ? { Authorization: `Bearer ${token}` } : null
}

export default function AgentAdmin({ kind }) {
  const approval = kind === 'APPROVAL'
  const [agents, setAgents] = React.useState([])
  const [activity, setActivity] = React.useState({ items: [], page: 0, totalPages: 0, total: 0 })
  const [form, setForm] = React.useState({ agentId: '', password: '' })
  const [error, setError] = React.useState('')
  const [message, setMessage] = React.useState('')

  async function load(page = 0) {
    const auth = headers()
    const activityKind = approval ? 'DEPOSIT' : 'WITHDRAWAL'
    const [agentResponse, activityResponse] = await Promise.all([
      fetch(`${API}/admin/review/agents?kind=${kind}`, { headers: auth, cache: 'no-store' }),
      fetch(`${API}/admin/review/activity?kind=${activityKind}&page=${page}`, { headers: auth, cache: 'no-store' }),
    ])
    if (!agentResponse.ok || !activityResponse.ok) throw new Error('Could not load agents')
    setAgents(await agentResponse.json())
    setActivity(await activityResponse.json())
  }

  React.useEffect(() => {
    load(0).catch((err) => setError(err.message))
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
        <ul className="mt-3 space-y-1 text-sm text-slate-300">
          {agents.length === 0 && <li>No agents yet.</li>}
          {agents.map((agent) => (
            <li key={agent.id}>{agent.agentId} · {agent.active ? 'Active' : 'Off'}</li>
          ))}
        </ul>
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
                  <td className="py-2 pr-3">{item.createdAt.replace('T', ' ').slice(0, 16)}</td>
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
          <button type="button" disabled={activity.page <= 0} onClick={() => load(activity.page - 1)} className="rounded-lg border border-slate-700 px-3 py-1 disabled:opacity-40">Previous</button>
          <span>Page {activity.totalPages === 0 ? 0 : activity.page + 1} of {activity.totalPages}</span>
          <button type="button" disabled={activity.page + 1 >= activity.totalPages} onClick={() => load(activity.page + 1)} className="rounded-lg border border-slate-700 px-3 py-1 disabled:opacity-40">Next</button>
        </div>
      </div>
    </section>
  )
}

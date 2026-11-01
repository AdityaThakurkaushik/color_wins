import React from 'react'
import { API } from '../api.js'

function headers() {
  const token = localStorage.getItem('colorwin_token')
  return token ? { Authorization: `Bearer ${token}` } : null
}

export default function FundRequests() {
  const [methods, setMethods] = React.useState([])
  const [form, setForm] = React.useState({ label: 'Main UPI', upiId: '', active: true, priority: 1 })
  const [error, setError] = React.useState('')
  const [message, setMessage] = React.useState('')

  async function load() {
    const auth = headers()
    const response = await fetch(`${API}/admin/payment-methods`, { headers: auth, cache: 'no-store' })
    if (!response.ok) throw new Error('Could not load payment methods')
    setMethods(await response.json())
  }

  React.useEffect(() => {
    load().catch((err) => setError(err.message))
  }, [])

  async function saveMethod(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    const auth = headers()
    const response = await fetch(`${API}/admin/payment-methods`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(data.message || 'Could not save UPI')
      return
    }
    setMessage('Payment method saved.')
    setForm({ label: 'Main UPI', upiId: '', active: true, priority: 1 })
    await load()
  }

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-purple-900 bg-[#091126] p-4">
        <h3 className="text-lg font-bold">UPI for Add Funds</h3>
        <p className="mt-1 text-sm text-slate-400">Saving an active UPI turns the older ones off. Players pay this UPI, and the QR is made from it.</p>
        <p className="mt-2 text-sm text-slate-300">Deposit approvals are handled at /approval-agent. Withdrawals are handled at /withdraw-agent.</p>
        <form onSubmit={saveMethod} className="mt-4 grid gap-2">
          <input value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} placeholder="Label" className="rounded-lg border border-slate-700 bg-[#050817] px-3 py-2" />
          <input value={form.upiId} onChange={(event) => setForm({ ...form, upiId: event.target.value })} placeholder="name@bank" className="rounded-lg border border-slate-700 bg-[#050817] px-3 py-2" required />
          <label className="text-sm"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} /> Active</label>
          <button className="rounded-lg bg-purple-700 px-4 py-2 font-bold">Save UPI</button>
          {error && <p className="text-sm text-red-300">{error}</p>}
          {message && <p className="text-sm text-emerald-300">{message}</p>}
        </form>
        <ul className="mt-3 space-y-1 text-sm text-slate-300">
          {methods.map((method) => (
            <li key={method.id}>{method.active ? 'Shown to players' : 'Off'} · {method.label} · {method.upiId}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}

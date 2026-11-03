import React from 'react'
import { API } from '../api.js'

const money = (value) => '₹' + Number(value || 0).toLocaleString('en-IN')
const dateTime = (value) => value ? new Date(value).toLocaleString('en-IN') : '—'

export default function AdminDeposits() {
  const [rows, setRows] = React.useState([])
  const [filter, setFilter] = React.useState('ALL')
  const [selectedId, setSelectedId] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [busyId, setBusyId] = React.useState('')
  const [reason, setReason] = React.useState('')
  const [error, setError] = React.useState('')
  const [message, setMessage] = React.useState('')

  const load = React.useCallback(async () => {
    const token = localStorage.getItem('colorwin_token')
    if (!token) { setError('Admin login required. Please sign in again.'); return }
    setLoading(true); setError('')
    try {
      const response = await fetch(API + '/admin/deposits', {
        headers: { Authorization: 'Bearer ' + token }, cache: 'no-store',
      })
      const data = await response.json().catch(() => [])
      if (!response.ok) throw new Error(data.message || 'Deposits API failed: ' + response.status)
      const list = Array.isArray(data) ? data : []
      setRows(list)
      setSelectedId((current) => list.some((row) => row.publicId === current) ? current : (list[0]?.publicId || ''))
    } catch (err) { setError(err.message || 'Deposit requests could not be loaded.') }
    finally { setLoading(false) }
  }, [])

  React.useEffect(() => { load() }, [load])

  const selected = rows.find((row) => row.publicId === selectedId) || null
  const visibleRows = filter === 'ALL' ? rows : rows.filter((row) => row.status === filter)
  const totals = rows.reduce((acc, row) => {
    const key = row.status || 'UNKNOWN'
    acc[key] = (acc[key] || 0) + 1
    acc[key + '_AMOUNT'] = (acc[key + '_AMOUNT'] || 0) + Number(row.amount || 0)
    return acc
  }, {})
  const totalAmount = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0)

  async function act(publicId, action) {
    if (action === 'reject' && reason.trim().length < 3) { setError('Reject karne ke liye reason likhna zaroori hai.'); return }
    const prompt = action === 'approve'
      ? 'Approve this deposit and credit virtual coins to the user?'
      : 'Reject this deposit request?'
    if (!window.confirm(prompt)) return
    const token = localStorage.getItem('colorwin_token')
    setBusyId(publicId); setError(''); setMessage('')
    try {
      const response = await fetch(API + '/admin/deposits/' + encodeURIComponent(publicId) + '/' + action, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: action === 'reject' ? JSON.stringify({ reason: reason.trim() }) : '{}',
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.message || 'Deposit action failed: ' + response.status)
      setMessage(action === 'approve'
        ? publicId + ' approved. ' + money(data.amountConfirmed || data.amount) + ' credited.'
        : publicId + ' rejected.')
      setReason('')
      await load()
    } catch (err) { setError(err.message || 'Deposit action failed.') }
    finally { setBusyId('') }
  }

  const Stat = ({ title, count, amount, tone }) => (
    <div className={'rounded-xl border p-4 ' + tone}>
      <p className="text-sm text-slate-300">{title}</p>
      <p className="mt-1 text-2xl font-black text-white">{count || 0}</p>
      <p className="mt-1 text-sm font-semibold text-slate-200">{money(amount)}</p>
    </div>
  )

  return (
    <section className="space-y-4 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-2xl font-black">Deposits</h2><p className="mt-1 text-sm text-slate-400">Review user add-funds requests and approve verified UTRs.</p></div>
        <button type="button" onClick={load} disabled={loading} className="rounded-lg border border-amber-600 px-4 py-2 text-sm font-bold text-amber-200 disabled:opacity-50">{loading ? 'Refreshing...' : '↻ Refresh'}</button>
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat title="Pending UTR" count={totals.SUBMITTED} amount={totals.SUBMITTED_AMOUNT} tone="border-amber-700 bg-amber-950/30" />
        <Stat title="Approved" count={totals.APPROVED} amount={totals.APPROVED_AMOUNT} tone="border-emerald-700 bg-emerald-950/30" />
        <Stat title="Rejected" count={totals.REJECTED} amount={totals.REJECTED_AMOUNT} tone="border-red-800 bg-red-950/30" />
        <Stat title="Total Requests" count={rows.length} amount={totalAmount} tone="border-blue-800 bg-blue-950/30" />
      </div>
      {error && <p className="rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">{error}</p>}
      {message && <p className="rounded-lg border border-emerald-800 bg-emerald-950/30 p-3 text-sm text-emerald-300">{message}</p>}
      <div className="flex flex-wrap gap-2">
        {['ALL', 'PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED', 'EXPIRED'].map((item) => <button key={item} type="button" onClick={() => setFilter(item)} className={'rounded-lg px-4 py-2 text-sm font-bold ' + (filter === item ? 'border border-amber-400 bg-amber-500 text-black' : 'border border-slate-700 bg-slate-900 text-slate-300')}>{item === 'ALL' ? 'All Requests' : item}</button>)}
      </div>
      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.8fr)]">
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#091126]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-800/70 text-xs uppercase text-slate-300"><tr><th className="p-3">Request / User</th><th className="p-3">Amount</th><th className="p-3">UTR</th><th className="p-3">Status</th><th className="p-3">Created</th><th className="p-3">View</th></tr></thead>
              <tbody>
                {visibleRows.map((row) => <tr key={row.publicId} className={'border-t border-slate-800 ' + (selectedId === row.publicId ? 'bg-amber-950/20' : '')}>
                  <td className="p-3"><p className="font-bold">{row.publicId}</p><p className="text-xs text-slate-400">{row.username || 'User'} · ID {row.userId ?? '—'}</p></td>
                  <td className="p-3 font-bold">{money(row.amount)}</td><td className="p-3">{row.utr || '—'}</td>
                  <td className="p-3"><span className={'rounded-full px-2 py-1 text-xs font-bold ' + (row.status === 'APPROVED' ? 'bg-emerald-950 text-emerald-300' : row.status === 'REJECTED' ? 'bg-red-950 text-red-300' : row.status === 'SUBMITTED' ? 'bg-amber-950 text-amber-200' : 'bg-slate-800 text-slate-300')}>{row.status}</span></td>
                  <td className="p-3 text-xs text-slate-400">{dateTime(row.createdAt)}</td><td className="p-3"><button type="button" onClick={() => setSelectedId(row.publicId)} className="rounded-lg border border-amber-700 px-3 py-1.5 text-xs font-bold text-amber-200">Details</button></td>
                </tr>)}
                {!loading && visibleRows.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-slate-400">No deposit requests found.</td></tr>}
                {loading && rows.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-slate-400">Loading deposits...</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="border-t border-slate-800 p-3 text-xs text-slate-500">Showing {visibleRows.length} request(s). Only SUBMITTED requests can be approved or rejected.</p>
        </div>
        <aside className="h-fit rounded-xl border border-slate-700 bg-[#091126] p-4">
          <h3 className="text-lg font-black">Deposit Details</h3>
          {!selected ? <p className="mt-4 text-sm text-slate-400">Select a deposit request to view details.</p> : <>
            <div className="mt-4 border-b border-slate-800 pb-3"><p className="font-bold">{selected.username || 'User'}</p><p className="text-xs text-slate-400">User ID: {selected.userId ?? '—'} · {selected.publicId}</p></div>
            <div className="mt-3 space-y-2 break-all text-sm">
              <p className="flex justify-between gap-3"><span className="text-slate-400">Amount requested</span><b>{money(selected.amount)}</b></p>
              <p className="flex justify-between gap-3"><span className="text-slate-400">Amount credited</span><b>{selected.amountConfirmed == null ? '—' : money(selected.amountConfirmed)}</b></p>
              <p className="flex justify-between gap-3"><span className="text-slate-400">Status</span><b>{selected.status}</b></p>
              <p><span className="text-slate-400">Payment method: </span>{selected.methodLabel || '—'} · UPI {selected.upiId || '—'}</p>
              <p><span className="text-slate-400">UTR: </span>{selected.utr || 'Not submitted yet'}</p>
              <p><span className="text-slate-400">Created: </span>{dateTime(selected.createdAt)}</p>
              <p><span className="text-slate-400">UTR submitted: </span>{dateTime(selected.submittedAt)}</p>
              <p><span className="text-slate-400">Expires: </span>{dateTime(selected.expiresAt)}</p>
              {selected.rejectReason && <p className="text-red-300">Reject reason: {selected.rejectReason}</p>}
            </div>
            {selected.status === 'SUBMITTED' && <div className="mt-4 space-y-2">
              <button type="button" onClick={() => act(selected.publicId, 'approve')} disabled={busyId === selected.publicId} className="w-full rounded-lg bg-emerald-700 px-4 py-3 font-bold disabled:opacity-50">{busyId === selected.publicId ? 'Processing...' : '✓ Approve & Credit Coins'}</button>
              <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows="3" maxLength="255" placeholder="Reject reason (required)" className="w-full rounded-lg border border-slate-700 bg-[#050817] p-3 text-sm text-white" />
              <button type="button" onClick={() => act(selected.publicId, 'reject')} disabled={busyId === selected.publicId} className="w-full rounded-lg bg-red-800 px-4 py-3 font-bold disabled:opacity-50">✕ Reject Deposit</button>
            </div>}
          </>}
        </aside>
      </div>
    </section>
  )
}

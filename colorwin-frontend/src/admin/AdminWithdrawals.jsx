import React from 'react'
import { API } from '../api.js'

const money = (value) => '₹' + Number(value || 0).toLocaleString('en-IN')
const dateTime = (value) => value ? new Date(value).toLocaleString('en-IN') : '—'

export default function AdminWithdrawals() {
  const [rows, setRows] = React.useState([])
  const [status, setStatus] = React.useState('ALL')
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
      const response = await fetch(API + '/admin/withdrawals', {
        headers: { Authorization: 'Bearer ' + token }, cache: 'no-store',
      })
      const data = await response.json().catch(() => [])
      if (!response.ok) throw new Error(data.message || 'Withdrawals API failed: ' + response.status)
      const list = Array.isArray(data) ? data : []
      setRows(list)
      setSelectedId((current) => list.some((row) => row.publicId === current) ? current : (list[0]?.publicId || ''))
    } catch (err) { setError(err.message || 'Withdrawal requests could not be loaded.') }
    finally { setLoading(false) }
  }, [])

  React.useEffect(() => { load() }, [load])

  const selected = rows.find((row) => row.publicId === selectedId) || null
  const visibleRows = status === 'ALL' ? rows : rows.filter((row) => row.status === status)
  const totals = rows.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1
    acc[row.status + '_AMOUNT'] = (acc[row.status + '_AMOUNT'] || 0) + Number(row.amount || 0)
    return acc
  }, {})

  async function act(publicId, action) {
    if (action === 'reject' && reason.trim().length < 3) { setError('Reject karne ke liye reason likhna zaroori hai.'); return }
    if (!window.confirm(action === 'paid' ? 'Mark this withdrawal as paid?' : 'Reject this withdrawal and refund the user coins?')) return
    const token = localStorage.getItem('colorwin_token')
    setBusyId(publicId); setError(''); setMessage('')
    try {
      const response = await fetch(API + '/admin/withdrawals/' + encodeURIComponent(publicId) + '/' + action, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: action === 'reject' ? JSON.stringify({ reason: reason.trim() }) : '{}',
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.message || 'Action failed: ' + response.status)
      setMessage(action === 'paid' ? publicId + ' marked as paid.' : publicId + ' rejected. User coins refunded.')
      setReason('')
      await load()
    } catch (err) { setError(err.message || 'Withdrawal action failed.') }
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
        <div><h2 className="text-2xl font-black">Withdrawals</h2><p className="mt-1 text-sm text-slate-400">Manage user withdrawal requests and manual payouts.</p></div>
        <button type="button" onClick={load} disabled={loading} className="rounded-lg border border-amber-600 px-4 py-2 text-sm font-bold text-amber-200 hover:bg-amber-950/40 disabled:opacity-50">{loading ? 'Refreshing...' : '↻ Refresh'}</button>
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat title="Pending" count={totals.PENDING} amount={totals.PENDING_AMOUNT} tone="border-amber-700 bg-amber-950/30" />
        <Stat title="Paid" count={totals.PAID} amount={totals.PAID_AMOUNT} tone="border-emerald-700 bg-emerald-950/30" />
        <Stat title="Rejected" count={totals.REJECTED} amount={totals.REJECTED_AMOUNT} tone="border-red-800 bg-red-950/30" />
        <Stat title="Total Requests" count={rows.length} amount={rows.reduce((sum, row) => sum + Number(row.amount || 0), 0)} tone="border-blue-800 bg-blue-950/30" />
      </div>
      {error && <p className="rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">{error}</p>}
      {message && <p className="rounded-lg border border-emerald-800 bg-emerald-950/30 p-3 text-sm text-emerald-300">{message}</p>}
      <div className="flex flex-wrap gap-2">
        {['ALL', 'PENDING', 'PAID', 'REJECTED'].map((item) => <button key={item} type="button" onClick={() => setStatus(item)} className={'rounded-lg px-4 py-2 text-sm font-bold ' + (status === item ? 'border border-amber-400 bg-amber-500 text-black' : 'border border-slate-700 bg-slate-900 text-slate-300')}>{item === 'ALL' ? 'All Requests' : item}</button>)}
      </div>
      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.8fr)]">
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#091126]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-800/70 text-xs uppercase text-slate-300"><tr><th className="p-3">Request / User</th><th className="p-3">Amount</th><th className="p-3">Method</th><th className="p-3">Status</th><th className="p-3">Requested</th><th className="p-3">View</th></tr></thead>
              <tbody>
                {visibleRows.map((row) => <tr key={row.publicId} className={'border-t border-slate-800 ' + (selectedId === row.publicId ? 'bg-amber-950/20' : '')}>
                  <td className="p-3"><p className="font-bold">{row.publicId}</p><p className="text-xs text-slate-400">{row.username || 'User'} · ID {row.userId ?? '—'}</p></td>
                  <td className="p-3 font-bold">{money(row.amount)}</td><td className="p-3">{row.payoutMethod || '—'}</td>
                  <td className="p-3"><span className={'rounded-full px-2 py-1 text-xs font-bold ' + (row.status === 'PAID' ? 'bg-emerald-950 text-emerald-300' : row.status === 'REJECTED' ? 'bg-red-950 text-red-300' : 'bg-amber-950 text-amber-200')}>{row.status}</span></td>
                  <td className="p-3 text-xs text-slate-400">{dateTime(row.createdAt)}</td><td className="p-3"><button type="button" onClick={() => setSelectedId(row.publicId)} className="rounded-lg border border-amber-700 px-3 py-1.5 text-xs font-bold text-amber-200">Details</button></td>
                </tr>)}
                {!loading && visibleRows.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-slate-400">No withdrawal requests found.</td></tr>}
                {loading && rows.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-slate-400">Loading withdrawals...</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="border-t border-slate-800 p-3 text-xs text-slate-500">Showing {visibleRows.length} request(s). Payout information is visible only to authenticated admins.</p>
        </div>
        <aside className="h-fit rounded-xl border border-slate-700 bg-[#091126] p-4">
          <h3 className="text-lg font-black">Withdrawal Details</h3>
          {!selected ? <p className="mt-4 text-sm text-slate-400">Select a withdrawal request to view details.</p> : <>
            <div className="mt-4 border-b border-slate-800 pb-3"><p className="font-bold">{selected.username || 'User'}</p><p className="text-xs text-slate-400">User ID: {selected.userId ?? '—'} · {selected.publicId}</p></div>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3"><span className="text-slate-400">Amount</span><b>{money(selected.amount)}</b></div>
              <div className="flex justify-between gap-3"><span className="text-slate-400">Status</span><b>{selected.status}</b></div>
              <div className="flex justify-between gap-3"><span className="text-slate-400">Requested</span><span className="text-right">{dateTime(selected.createdAt)}</span></div>
            </div>
            <div className="mt-4 rounded-lg border border-amber-700/70 bg-amber-950/20 p-3">
              <h4 className="font-bold text-amber-200">Payout Details</h4>
              <div className="mt-3 space-y-2 break-all text-sm">
                <p><span className="text-slate-400">Method: </span>{selected.payoutMethod || '—'}</p><p><span className="text-slate-400">Account Holder: </span>{selected.accountHolderName || '—'}</p>
                {selected.payoutMethod === 'UPI' ? <p><span className="text-slate-400">UPI ID: </span>{selected.upiId || '—'}</p> : <><p><span className="text-slate-400">Bank: </span>{selected.bankName || '—'}</p><p><span className="text-slate-400">Account Number: </span>{selected.bankAccountNumber || '—'}</p><p><span className="text-slate-400">IFSC: </span>{selected.bankIfsc || '—'}</p></>}
              </div>
            </div>
            {selected.rejectReason && <p className="mt-3 text-sm text-red-300">Reject reason: {selected.rejectReason}</p>}
            {selected.status === 'PENDING' && <div className="mt-4 space-y-2">
              <button type="button" onClick={() => act(selected.publicId, 'paid')} disabled={busyId === selected.publicId} className="w-full rounded-lg bg-emerald-700 px-4 py-3 font-bold disabled:opacity-50">{busyId === selected.publicId ? 'Processing...' : '✓ Mark as Paid'}</button>
              <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows="3" maxLength="255" placeholder="Reject reason (required)" className="w-full rounded-lg border border-slate-700 bg-[#050817] p-3 text-sm text-white" />
              <button type="button" onClick={() => act(selected.publicId, 'reject')} disabled={busyId === selected.publicId} className="w-full rounded-lg bg-red-800 px-4 py-3 font-bold disabled:opacity-50">✕ Reject & Refund</button>
            </div>}
          </>}
        </aside>
      </div>
    </section>
  )
}

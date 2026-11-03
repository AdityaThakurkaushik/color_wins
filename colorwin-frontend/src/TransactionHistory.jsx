import { useEffect, useState } from 'react'
import { API } from './api.js'

const filters = ['ALL', 'DEPOSIT', 'WITHDRAWAL']

function authHeaders() {
  const token = localStorage.getItem('colorwin_token')
  return token ? { Authorization: `Bearer ${token}` } : null
}

export default function TransactionHistory({ onBack, onBalanceChange }) {
  const [rows, setRows] = useState([])
  const [filter, setFilter] = useState('ALL')
  const [amount, setAmount] = useState(100)
  const [accountHolderName, setAccountHolderName] = useState('')
  const [payoutMethod, setPayoutMethod] = useState('UPI')
  const [upiId, setUpiId] = useState('')
  const [bankName, setBankName] = useState('')
  const [bankAccountNumber, setBankAccountNumber] = useState('')
  const [bankIfsc, setBankIfsc] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    const headers = authHeaders()
    const response = await fetch(`${API}/user/transactions`, { headers, cache: 'no-store' })
    const data = await response.json()
    if (!response.ok) throw new Error(data.message || 'Could not load history')
    setRows(data)
  }

  useEffect(() => {
    load().catch((err) => setError(err.message))
  }, [])

  async function requestWithdrawal(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    if (!accountHolderName.trim()) {
      setError('Enter account holder name.')
      return
    }
    if (payoutMethod === 'UPI' && !upiId.trim()) {
      setError('Enter your UPI ID.')
      return
    }
    if (payoutMethod === 'BANK' && (!bankName.trim() || !bankAccountNumber.trim() || !bankIfsc.trim())) {
      setError('Enter bank name, account number and IFSC.')
      return
    }

    setBusy(true)
    try {
      const headers = authHeaders()
      const payload = {
        amount: Number(amount),
        accountHolderName: accountHolderName.trim(),
        payoutMethod,
        upiId: payoutMethod === 'UPI' ? upiId.trim() : null,
        bankName: payoutMethod === 'BANK' ? bankName.trim() : null,
        bankAccountNumber: payoutMethod === 'BANK' ? bankAccountNumber.trim() : null,
        bankIfsc: payoutMethod === 'BANK' ? bankIfsc.trim().toUpperCase() : null,
      }
      const response = await fetch(`${API}/user/withdrawals`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Withdrawal failed')
      setMessage(`${data.publicId} requested. ${data.amount} coins are on hold.`)
      setFilter('WITHDRAWAL')
      setUpiId('')
      setBankName('')
      setBankAccountNumber('')
      setBankIfsc('')
      await load()
      onBalanceChange?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const visible = rows.filter((row) => filter === 'ALL' || row.kind === filter)

  return (
    <section className="space-y-3 pb-4">
      <button onClick={onBack} className="text-sm font-bold text-fuchsia-300">‹ Back</button>
      <h2 className="text-xl font-black">Transaction History</h2>

      <form onSubmit={requestWithdrawal} className="space-y-3 rounded-2xl border border-purple-800 bg-[#0d0d1c] p-4">
        <p className="text-sm text-slate-400">Request a withdrawal. Coins leave the wallet until it is paid or rejected.</p>
        <label className="block space-y-1 text-xs text-slate-300">
          Withdrawal amount
          <input type="number" min="10" max="5000" value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="w-full rounded-lg border border-purple-900 bg-[#101020] px-3 py-2 text-white" />
        </label>
        <label className="block space-y-1 text-xs text-slate-300">
          Account holder name
          <input value={accountHolderName} onChange={(event) => setAccountHolderName(event.target.value)}
            maxLength={100} autoComplete="name" placeholder="Name on payment account"
            className="w-full rounded-lg border border-purple-900 bg-[#101020] px-3 py-2 text-white" required />
        </label>
        <label className="block space-y-1 text-xs text-slate-300">
          Payout method
          <select value={payoutMethod} onChange={(event) => setPayoutMethod(event.target.value)}
            className="w-full rounded-lg border border-purple-900 bg-[#101020] px-3 py-2 text-white">
            <option value="UPI">UPI</option>
            <option value="BANK">Bank account</option>
          </select>
        </label>
        {payoutMethod === 'UPI' ? (
          <label className="block space-y-1 text-xs text-slate-300">
            UPI ID
            <input value={upiId} onChange={(event) => setUpiId(event.target.value)}
              placeholder="name@bank" maxLength={100}
              className="w-full rounded-lg border border-purple-900 bg-[#101020] px-3 py-2 text-white" required />
          </label>
        ) : (
          <>
            <label className="block space-y-1 text-xs text-slate-300">
              Bank name
              <input value={bankName} onChange={(event) => setBankName(event.target.value)}
                maxLength={100} placeholder="Bank name"
                className="w-full rounded-lg border border-purple-900 bg-[#101020] px-3 py-2 text-white" required />
            </label>
            <label className="block space-y-1 text-xs text-slate-300">
              Account number
              <input value={bankAccountNumber} onChange={(event) => setBankAccountNumber(event.target.value)}
                inputMode="numeric" maxLength={34} placeholder="Bank account number"
                className="w-full rounded-lg border border-purple-900 bg-[#101020] px-3 py-2 text-white" required />
            </label>
            <label className="block space-y-1 text-xs text-slate-300">
              IFSC code
              <input value={bankIfsc} onChange={(event) => setBankIfsc(event.target.value.toUpperCase())}
                maxLength={11} placeholder="ABCD0123456"
                className="w-full rounded-lg border border-purple-900 bg-[#101020] px-3 py-2 text-white uppercase" required />
            </label>
          </>
        )}
        <button disabled={busy} className="w-full rounded-xl bg-amber-500 py-3 font-black text-black disabled:opacity-50">
          {busy ? 'Please wait...' : 'Request withdrawal'}
        </button>
      </form>

      <div className="grid grid-cols-3 gap-2">
        {filters.map((item) => (
          <button key={item} onClick={() => setFilter(item)}
            className={`rounded-lg py-2 text-xs font-bold ${filter === item ? 'bg-fuchsia-600' : 'bg-slate-800'}`}>
            {item === 'ALL' ? 'All' : item === 'DEPOSIT' ? 'Deposit' : 'Withdrawal'}
          </button>
        ))}
      </div>

      {error && <p className="rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">{error}</p>}
      {message && <p className="rounded-lg border border-emerald-800 bg-emerald-950/30 p-3 text-sm text-emerald-300">{message}</p>}

      <div className="rounded-2xl border border-purple-900 bg-[#0d0d1c] p-3">
        {visible.length === 0 && <p className="p-2 text-sm text-slate-400">No transactions in this section.</p>}
        {visible.map((row) => (
          <div key={row.id} className="flex items-center justify-between gap-3 border-b border-purple-950 py-3 last:border-0">
            <div>
              <p className="font-bold text-white">{row.title}</p>
              <p className="text-xs text-slate-400">{row.detail}</p>
              <p className="text-[11px] text-slate-500">{row.createdAt ? new Date(row.createdAt).toLocaleString() : ''}</p>
            </div>
            <div className="text-right">
              <p className={`font-black ${row.direction === 'IN' ? 'text-emerald-300' : 'text-amber-300'}`}>
                {row.direction === 'IN' ? '+' : '-'}{row.amount}
              </p>
              <p className="text-[11px] uppercase text-slate-400">{row.status}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

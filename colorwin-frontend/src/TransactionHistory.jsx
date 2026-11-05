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
  const [amount, setAmount] = useState(200)
  const [minWithdrawalEnabled, setMinWithdrawalEnabled] = useState(true)
  const [minWithdrawalAmount, setMinWithdrawalAmount] = useState(200)
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
    const [historyResponse, meResponse] = await Promise.all([
      fetch(`${API}/user/transactions`, { headers, cache: 'no-store' }),
      fetch(`${API}/user/me`, { headers, cache: 'no-store' }),
    ])
    const data = await historyResponse.json()
    if (!historyResponse.ok) throw new Error(data.message || 'Could not load history')
    setRows(data)
    if (meResponse.ok) {
      const me = await meResponse.json()
      const enabled = me.minWithdrawalEnabled !== false
      const min = Number(me.minWithdrawalAmount) > 0 ? Number(me.minWithdrawalAmount) : 200
      setMinWithdrawalEnabled(enabled)
      setMinWithdrawalAmount(min)
      setAmount((current) => {
        const value = Number(current)
        if (!enabled) return current
        if (!Number.isInteger(value) || value < min) return String(min)
        return current
      })
    }
  }

  useEffect(() => {
    load().catch((err) => setError(err.message))
  }, [])

  async function requestWithdrawal(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    const minimum = minWithdrawalEnabled ? minWithdrawalAmount : 1
    if (!Number.isInteger(Number(amount)) || Number(amount) < minimum) {
      setError(minWithdrawalEnabled
        ? `Minimum withdrawal is ₹${minWithdrawalAmount}`
        : 'Enter a valid withdrawal amount')
      return
    }
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

  const field = 'w-full rounded-2xl border border-yellow-400/30 bg-[#101020] px-3 py-3 text-base font-bold text-white outline-none focus:border-yellow-300'

  return (
    <section className="space-y-3 pb-4">
      <button type="button" onClick={onBack} className="rounded-2xl border border-yellow-300/70 bg-gradient-to-b from-[#2a1d12] to-[#120b24] px-4 py-2 text-sm font-black text-yellow-300 shadow-[0_3px_0_#6b4a00] active:translate-y-0.5 active:shadow-[0_1px_0_#6b4a00]">‹ Back</button>

      <div className="relative overflow-hidden rounded-3xl border border-yellow-400/40 bg-[linear-gradient(120deg,#3b0764_0%,#6b21a8_40%,#1a0b2e_100%)] p-5 shadow-[0_12px_32px_rgba(88,28,135,0.4)]">
        <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-yellow-400/20 blur-2xl" />
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-yellow-300">Wallet</p>
        <h2 className="mt-1 text-2xl font-black text-white">📜 Transaction History</h2>
        <p className="mt-1 text-sm font-bold text-fuchsia-200">Deposits, withdrawals, and game coins</p>
      </div>

      <form onSubmit={requestWithdrawal} className="space-y-3 rounded-3xl border border-red-900/40 bg-[#0d0d1c] p-4">
        <p className="text-sm font-bold text-slate-400">Request a withdrawal. Coins leave the wallet until paid or rejected.</p>
        {minWithdrawalEnabled && <p className="text-xs font-black text-red-300/80">Minimum withdrawal is ₹{minWithdrawalAmount}</p>}
        <label className="block space-y-1 text-sm font-bold text-slate-300">Withdrawal amount
          <input type="number" min={minWithdrawalEnabled ? minWithdrawalAmount : 1} max="5000" value={amount} onChange={(event) => setAmount(event.target.value)} className={field} />
        </label>
        <label className="block space-y-1 text-sm font-bold text-slate-300">Account holder name
          <input value={accountHolderName} onChange={(event) => setAccountHolderName(event.target.value)} maxLength={100} autoComplete="name" placeholder="Name on payment account" className={field} required />
        </label>
        <div className="space-y-1">
          <p className="text-sm font-bold text-slate-300">Payout method</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPayoutMethod('UPI')}
              className={`flex h-14 items-center justify-center gap-2 rounded-2xl text-base font-black leading-none active:translate-y-0.5 ${
                payoutMethod === 'UPI'
                  ? 'border border-yellow-200 bg-gradient-to-b from-yellow-300 to-amber-500 text-black shadow-[0_4px_0_#92400e]'
                  : 'border border-yellow-400/20 bg-gradient-to-b from-[#1a1430] to-[#0b0b18] text-slate-300 shadow-[0_3px_0_#3b0764]'
              }`}
            >
              <span className="text-lg leading-none">📲</span>
              <span>UPI</span>
            </button>
            <button
              type="button"
              onClick={() => setPayoutMethod('BANK')}
              className={`flex h-14 items-center justify-center gap-2 rounded-2xl text-base font-black leading-none active:translate-y-0.5 ${
                payoutMethod === 'BANK'
                  ? 'border border-yellow-200 bg-gradient-to-b from-yellow-300 to-amber-500 text-black shadow-[0_4px_0_#92400e]'
                  : 'border border-yellow-400/20 bg-gradient-to-b from-[#1a1430] to-[#0b0b18] text-slate-300 shadow-[0_3px_0_#3b0764]'
              }`}
            >
              <span className="text-lg leading-none">🏦</span>
              <span>Bank</span>
            </button>
          </div>
        </div>
        {payoutMethod === 'UPI' ? (
          <label className="block space-y-1 text-sm font-bold text-slate-300">UPI ID
            <input value={upiId} onChange={(event) => setUpiId(event.target.value)} placeholder="name@bank" maxLength={100} className={field} required />
          </label>
        ) : (
          <>
            <label className="block space-y-1 text-sm font-bold text-slate-300">Bank name
              <input value={bankName} onChange={(event) => setBankName(event.target.value)} maxLength={100} placeholder="Bank name" className={field} required />
            </label>
            <label className="block space-y-1 text-sm font-bold text-slate-300">Account number
              <input value={bankAccountNumber} onChange={(event) => setBankAccountNumber(event.target.value)} inputMode="numeric" maxLength={34} placeholder="Bank account number" className={field} required />
            </label>
            <label className="block space-y-1 text-sm font-bold text-slate-300">IFSC code
              <input value={bankIfsc} onChange={(event) => setBankIfsc(event.target.value.toUpperCase())} maxLength={11} placeholder="ABCD0123456" className={`${field} uppercase`} required />
            </label>
          </>
        )}
        <button disabled={busy} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-red-900/60 bg-gradient-to-b from-[#3a1518] to-[#1a0a0c] text-base font-black leading-none text-red-300/80 shadow-[0_4px_0_#450a0a] active:translate-y-0.5 active:shadow-[0_2px_0_#450a0a] disabled:opacity-50">
          {busy ? 'Please wait...' : <><span className="text-lg leading-none">🔻</span><span>Request withdrawal</span></>}
        </button>
      </form>

      <div className="grid grid-cols-3 gap-2">
        {filters.map((item) => (
          <button type="button" key={item} onClick={() => setFilter(item)}
            className={`flex h-12 items-center justify-center rounded-2xl text-sm font-black leading-none shadow-[0_3px_0_#3b0764] active:translate-y-0.5 ${filter === item ? 'border border-yellow-200 bg-gradient-to-b from-yellow-300 to-amber-500 text-black shadow-[0_3px_0_#92400e]' : 'border border-yellow-400/20 bg-gradient-to-b from-[#1a1430] to-[#0b0b18] text-slate-200'}`}>
            {item === 'ALL' ? 'All' : item === 'DEPOSIT' ? '💰 Deposit' : '🔻 Withdraw'}
          </button>
        ))}
      </div>

      {error && <p className="rounded-2xl border border-red-900/50 bg-[#3a1518] p-3 text-sm font-bold text-red-300/80">{error}</p>}
      {message && <p className="rounded-2xl border border-emerald-400/40 bg-[#102418] p-3 text-sm font-bold text-emerald-300">{message}</p>}

      <div className="space-y-2 rounded-3xl border border-yellow-400/25 bg-[#0d0d1c] p-3">
        {visible.length === 0 && <p className="p-2 text-sm text-slate-400">No transactions in this section.</p>}
        {visible.map((row) => (
          <div key={row.id} className={`flex items-center justify-between gap-3 rounded-2xl border px-3 py-3 shadow-[0_3px_0_#3b0764] ${row.direction === 'IN' ? 'border-emerald-400/30 bg-gradient-to-b from-[#102418] to-[#0b0b18]' : 'border-red-900/40 bg-gradient-to-b from-[#3a1518] to-[#0b0b18]'}`}>
            <div className="min-w-0">
              <p className="font-black text-white">{row.title}</p>
              <p className="truncate text-xs text-slate-400">{row.detail}</p>
              <p className="text-[11px] text-slate-500">{row.createdAt ? new Date(row.createdAt).toLocaleString() : ''}</p>
            </div>
            <div className="text-right">
              <p className={`font-black ${row.direction === 'IN' ? 'text-emerald-300' : 'text-red-300/80'}`}>
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

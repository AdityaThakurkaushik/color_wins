import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { API } from './api.js'

const presets = [100, 200, 500, 1000]

function authHeaders() {
  const token = localStorage.getItem('colorwin_token')
  return token ? { Authorization: `Bearer ${token}` } : null
}

export default function AddFunds({ onBack, onBalanceChange }) {
  const [amount, setAmount] = useState(100)
  const [deposit, setDeposit] = useState(null)
  const [history, setHistory] = useState([])
  const [utr, setUtr] = useState('')
  const [qrUrl, setQrUrl] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [telegram, setTelegram] = useState({ enabled: false, linked: false, botUsername: '' })
  const [payTo, setPayTo] = useState(null)

  async function loadTelegram() {
    const headers = authHeaders()
    if (!headers) return
    const response = await fetch(`${API}/user/telegram`, { headers, cache: 'no-store' })
    if (response.ok) setTelegram(await response.json())
  }

  async function loadHistory() {
    const headers = authHeaders()
    if (!headers) return
    const [historyResponse, methodResponse] = await Promise.all([
      fetch(`${API}/deposits`, { headers, cache: 'no-store' }),
      fetch(`${API}/deposits/payment-method`, { headers, cache: 'no-store' }),
    ])
    if (historyResponse.ok) {
      const rows = await historyResponse.json()
      setHistory(rows)
      setDeposit((current) => {
        if (!current) return current
        return rows.find((row) => row.publicId === current.publicId) || current
      })
    }
    if (methodResponse.ok) setPayTo(await methodResponse.json())
  }

  useEffect(() => {
    loadHistory().catch(() => setError('Could not load deposits.'))
    loadTelegram().catch(() => {})
    function onFocus() { loadTelegram().catch(() => {}) }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  async function connectTelegram() {
    setError('')
    setBusy(true)
    try {
      const headers = authHeaders()
      const response = await fetch(`${API}/user/telegram/link`, { method: 'POST', headers })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Could not connect Telegram')
      window.open(data.url, '_blank', 'noopener')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!deposit || deposit.status !== 'PENDING') {
      setQrUrl('')
      return
    }
    const link = `upi://pay?pa=${encodeURIComponent(deposit.upiId)}&am=${Number(deposit.amount).toFixed(2)}&cu=INR&tn=${deposit.publicId}`
    QRCode.toDataURL(link, { width: 240, margin: 1 }).then(setQrUrl).catch(() => setQrUrl(''))
  }, [deposit])

  async function createDeposit(event) {
    event.preventDefault()
    setError('')
    if (!Number.isInteger(Number(amount)) || Number(amount) < 100) {
      setError('Minimum deposit is ₹100')
      return
    }
    setBusy(true)
    try {
      const headers = authHeaders()
      const response = await fetch(`${API}/deposits`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(amount) }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Could not start deposit')
      setDeposit(data)
      setUtr('')
      await loadHistory()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function submitUtr(event) {
    event.preventDefault()
    setError('')
    const cleanUtr = String(utr).replace(/\D/g, '')
    if (!/^\d{12}$/.test(cleanUtr) || new Set(cleanUtr).size < 3) {
      setError('Enter a valid 12-digit UTR')
      return
    }
    setBusy(true)
    try {
      const headers = authHeaders()
      const response = await fetch(`${API}/deposits/${deposit.publicId}/utr`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ utr: cleanUtr }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Could not submit UTR')
      setDeposit(data)
      await loadHistory()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-3 pb-4">
      <button
        type="button"
        onClick={onBack}
        className="rounded-2xl border border-yellow-300/70 bg-gradient-to-b from-[#2a1d12] to-[#120b24] px-4 py-2 text-sm font-black text-yellow-300 shadow-[0_3px_0_#6b4a00] active:translate-y-0.5 active:shadow-[0_1px_0_#6b4a00]"
      >
        ‹ Back
      </button>

      <div className="relative overflow-hidden rounded-3xl border border-yellow-400/40 bg-[linear-gradient(120deg,#3b0764_0%,#14532d_38%,#1a0b2e_100%)] p-5 shadow-[0_12px_32px_rgba(20,83,45,0.35)]">
        <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-emerald-400/20 blur-2xl" />
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-300">Wallet</p>
        <h2 className="mt-1 text-2xl font-black text-white">💰 Add Funds</h2>
        <p className="mt-1 text-sm font-bold text-emerald-100">1 rupee = 1 coin. Coins after approval.</p>
      </div>

      {telegram.enabled && (
        <div className="rounded-3xl border border-yellow-400/25 bg-[#0d0d1c] p-4">
          <p className="text-sm font-bold text-slate-300">
            Telegram: {telegram.linked ? `connected to @${telegram.botUsername}` : 'not connected'}
          </p>
          {!telegram.linked && (
            <button type="button" onClick={connectTelegram} disabled={busy} className="mt-3 w-full rounded-2xl border border-fuchsia-300/70 bg-gradient-to-b from-fuchsia-500 to-purple-800 py-3 font-black text-white shadow-[0_4px_0_#4a044e] active:translate-y-0.5 active:shadow-[0_2px_0_#4a044e] disabled:opacity-50">
              💬 Connect Telegram
            </button>
          )}
        </div>
      )}

      {!deposit && (
        <form onSubmit={createDeposit} className="space-y-3 rounded-3xl border border-yellow-400/25 bg-[#0d0d1c] p-4">
          <div className="grid grid-cols-4 gap-2">
            {presets.map((value) => (
              <button
                type="button"
                key={value}
                onClick={() => setAmount(value)}
                className={`rounded-2xl py-2.5 text-sm font-black shadow-[0_3px_0_#14532d] active:translate-y-0.5 active:shadow-[0_1px_0_#14532d] ${
                  Number(amount) === value
                    ? 'border border-emerald-200 bg-gradient-to-b from-emerald-300 to-green-700 text-white'
                    : 'border border-yellow-400/20 bg-gradient-to-b from-[#1a1430] to-[#0b0b18] text-slate-200'
                }`}
              >
                {value}
              </button>
            ))}
          </div>
          <label className="block text-sm font-bold text-slate-300">
            Amount
            <input
              type="number"
              min="100"
              max="5000"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="mt-1 w-full rounded-2xl border border-yellow-400/30 bg-[#101020] px-3 py-2.5 font-black text-white outline-none focus:border-emerald-400"
            />
          </label>
          <button disabled={busy} className="w-full rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-300 to-green-700 py-3.5 font-black text-white shadow-[0_4px_0_#14532d,0_0_16px_rgba(16,185,129,0.35)] active:translate-y-0.5 active:shadow-[0_2px_0_#14532d] disabled:opacity-50">
            {busy ? 'Please wait...' : '💰 Continue to payment'}
          </button>
          {payTo?.upiId && (
            <p className="text-sm font-bold text-slate-300">Payment goes to <span className="font-mono text-yellow-300">{payTo.upiId}</span>. QR after continue.</p>
          )}
        </form>
      )}

      {deposit && (
        <div className="space-y-3 rounded-3xl border border-yellow-400/25 bg-[#0d0d1c] p-4">
          <p className="text-sm font-bold text-slate-400">{deposit.publicId} · {deposit.status}</p>
          <p className="text-3xl font-black text-emerald-300">💰 {deposit.amount} coins</p>
          {deposit.status === 'PENDING' && (
            <>
              <p className="text-sm font-bold text-slate-300">Pay exactly ₹{deposit.amount} to</p>
              <p className="break-all rounded-2xl border border-yellow-400/30 bg-[#080817] p-3 font-mono text-lg font-black text-yellow-300">{deposit.upiId}</p>
              {qrUrl && <img src={qrUrl} alt="UPI QR code" className="mx-auto w-52 rounded-2xl bg-white p-2 shadow-[0_4px_0_#14532d]" />}
              {telegram.enabled && telegram.linked && (
                <a
                  href={`https://t.me/${telegram.botUsername}?start=${deposit.publicId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-2xl border border-fuchsia-300/70 bg-gradient-to-b from-fuchsia-500 to-purple-800 py-3 text-center font-black text-white shadow-[0_4px_0_#4a044e] active:translate-y-0.5"
                >
                  💬 Send UTR in Telegram
                </a>
              )}
              {telegram.enabled && !telegram.linked && (
                <p className="text-sm font-bold text-amber-200">Connect Telegram above, or submit UTR here.</p>
              )}
              <form onSubmit={submitUtr} className="space-y-2">
                <label className="block text-sm font-bold text-slate-300">
                  UTR / transaction number
                  <input
                    value={utr}
                    onChange={(event) => {
                      setUtr(event.target.value.replace(/\D/g, '').slice(0, 12))
                      setError('')
                    }}
                    inputMode="numeric"
                    autoComplete="off"
                    spellCheck={false}
                    minLength={12}
                    maxLength={12}
                    pattern="[0-9]{12}"
                    required
                    className="mt-1 w-full rounded-2xl border border-yellow-400/30 bg-[#101020] px-3 py-2.5 tracking-[0.18em] font-black text-white outline-none focus:border-emerald-400"
                    placeholder="12 digit UTR"
                  />
                </label>
                <button disabled={busy} className="w-full rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-300 to-green-700 py-3.5 font-black text-white shadow-[0_4px_0_#14532d] active:translate-y-0.5 active:shadow-[0_2px_0_#14532d] disabled:opacity-50">
                  {busy ? 'Sending...' : '💰 Submit UTR'}
                </button>
              </form>
            </>
          )}
          {deposit.status === 'SUBMITTED' && (
            <p className="rounded-2xl border border-emerald-400/40 bg-[#102418] p-3 text-sm font-bold text-emerald-300">UTR received. Coins after approval. Check the bell.</p>
          )}
          {deposit.status === 'APPROVED' && (
            <p className="rounded-2xl border border-emerald-400/40 bg-[#102418] p-3 text-sm font-bold text-emerald-300">{deposit.amountConfirmed} coins added to your wallet.</p>
          )}
          {deposit.status === 'REJECTED' && (
            <p className="rounded-2xl border border-red-900/50 bg-[#3a1518] p-3 text-sm font-bold text-red-300/80">Rejected: {deposit.rejectReason}</p>
          )}
          <button
            type="button"
            onClick={() => { setDeposit(null); onBalanceChange?.() }}
            className="w-full rounded-2xl border border-yellow-300/70 bg-gradient-to-b from-[#2a1d12] to-[#120b24] py-3 font-black text-yellow-300 shadow-[0_4px_0_#6b4a00] active:translate-y-0.5 active:shadow-[0_2px_0_#6b4a00]"
          >
            New request
          </button>
        </div>
      )}

      {error && <p className="rounded-2xl border border-red-900/50 bg-[#3a1518] p-3 text-sm font-bold text-red-300/80">{error}</p>}

      <div className="rounded-3xl border border-yellow-400/25 bg-[#0d0d1c] p-4">
        <h3 className="font-black text-white">Your requests</h3>
        <div className="mt-2 space-y-2 text-sm">
          {history.length === 0 && <p className="text-slate-400">No deposits yet.</p>}
          {history.map((item) => (
            <button
              type="button"
              key={item.publicId}
              onClick={() => { setDeposit(item); setError('') }}
              className="flex w-full items-center justify-between rounded-2xl border border-yellow-400/20 bg-gradient-to-b from-[#1a1430] to-[#0b0b18] px-3 py-3 text-left shadow-[0_3px_0_#3b0764] active:translate-y-0.5 active:shadow-[0_1px_0_#3b0764]"
            >
              <span className="font-black text-white">{item.publicId}<br /><span className="text-xs font-bold text-slate-400">{item.status}</span></span>
              <span className="font-black text-emerald-300">💰 {item.amount}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

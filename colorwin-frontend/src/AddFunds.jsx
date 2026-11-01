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
    setBusy(true)
    try {
      const headers = authHeaders()
      const response = await fetch(`${API}/deposits/${deposit.publicId}/utr`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ utr }),
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
      <button onClick={onBack} className="text-sm font-bold text-fuchsia-300">‹ Back</button>
      <h2 className="text-xl font-black">Add Funds</h2>
      <p className="text-sm text-slate-400">1 rupee = 1 coin. Coins are added after approval.</p>

      {telegram.enabled && (
        <div className="rounded-2xl border border-purple-800 bg-[#0d0d1c] p-4">
          <p className="text-sm text-slate-300">
            Telegram: {telegram.linked ? `connected to @${telegram.botUsername}` : 'not connected'}
          </p>
          {!telegram.linked && (
            <button type="button" onClick={connectTelegram} disabled={busy} className="mt-2 w-full rounded-xl bg-sky-700 py-3 font-black disabled:opacity-50">
              Connect Telegram
            </button>
          )}
        </div>
      )}

      {!deposit && (
        <form onSubmit={createDeposit} className="space-y-3 rounded-2xl border border-purple-800 bg-[#0d0d1c] p-4">
          <div className="grid grid-cols-4 gap-2">
            {presets.map((value) => (
              <button
                type="button"
                key={value}
                onClick={() => setAmount(value)}
                className={`rounded-lg py-2 text-sm font-bold ${Number(amount) === value ? 'bg-fuchsia-600' : 'bg-slate-800'}`}
              >
                {value}
              </button>
            ))}
          </div>
          <label className="block text-sm text-slate-400">
            Amount
            <input
              type="number"
              min="10"
              max="5000"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="mt-1 w-full rounded-lg border border-purple-900 bg-[#101020] px-3 py-2 text-white"
            />
          </label>
          <button disabled={busy} className="w-full rounded-xl bg-fuchsia-600 py-3 font-black disabled:opacity-50">
            {busy ? 'Please wait...' : 'Continue to payment'}
          </button>
          {payTo?.upiId && (
            <p className="text-sm text-slate-300">Payment goes to <span className="font-mono font-bold text-white">{payTo.upiId}</span>. The QR appears after you continue.</p>
          )}
        </form>
      )}

      {deposit && (
        <div className="space-y-3 rounded-2xl border border-purple-800 bg-[#0d0d1c] p-4">
          <p className="text-sm text-slate-400">{deposit.publicId} · {deposit.status}</p>
          <p className="text-3xl font-black text-yellow-300">{deposit.amount} coins</p>
          {deposit.status === 'PENDING' && (
            <>
              <p className="text-sm text-slate-300">Pay exactly ₹{deposit.amount} to</p>
              <p className="break-all font-mono text-lg font-bold">{deposit.upiId}</p>
              {qrUrl && <img src={qrUrl} alt="UPI QR code" className="mx-auto w-52 rounded-lg bg-white p-2" />}
              {telegram.enabled && telegram.linked && (
                <a
                  href={`https://t.me/${telegram.botUsername}?start=${deposit.publicId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-xl bg-sky-700 py-3 text-center font-black"
                >
                  Send UTR in Telegram
                </a>
              )}
              {telegram.enabled && !telegram.linked && (
                <p className="text-sm text-amber-200">Connect Telegram above before sending the UTR in the bot. You can still submit it here.</p>
              )}
              <form onSubmit={submitUtr} className="space-y-2">
                <label className="block text-sm text-slate-400">
                  UTR / transaction number
                  <input
                    value={utr}
                    onChange={(event) => { setUtr(event.target.value); setError('') }}
                    minLength={10}
                    maxLength={22}
                    required
                    className="mt-1 w-full rounded-lg border border-purple-900 bg-[#101020] px-3 py-2 uppercase text-white"
                    placeholder="12 digit UTR"
                  />
                </label>
                <button disabled={busy} className="w-full rounded-xl bg-fuchsia-600 py-3 font-black disabled:opacity-50">
                  {busy ? 'Sending...' : 'Submit UTR'}
                </button>
              </form>
            </>
          )}
          {deposit.status === 'SUBMITTED' && (
            <p className="text-sm text-emerald-300">UTR received. Coins will appear after approval. Check the bell for the notification.</p>
          )}
          {deposit.status === 'APPROVED' && (
            <p className="text-sm text-emerald-300">{deposit.amountConfirmed} coins were added to your wallet.</p>
          )}
          {deposit.status === 'REJECTED' && (
            <p className="text-sm text-red-300">Rejected: {deposit.rejectReason}</p>
          )}
          <button type="button" onClick={() => { setDeposit(null); onBalanceChange?.() }} className="text-sm font-bold text-fuchsia-300">
            New request
          </button>
        </div>
      )}

      {error && <p className="rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">{error}</p>}

      <div className="rounded-2xl border border-purple-900 bg-[#0d0d1c] p-4">
        <h3 className="font-bold">Your requests</h3>
        <div className="mt-2 space-y-2 text-sm">
          {history.length === 0 && <p className="text-slate-400">No deposits yet.</p>}
          {history.map((item) => (
            <button key={item.publicId} onClick={() => { setDeposit(item); setError('') }} className="flex w-full justify-between border-t border-purple-900 py-2 text-left">
              <span>{item.publicId}<br /><span className="text-slate-400">{item.status}</span></span>
              <span className="font-bold text-yellow-300">{item.amount}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

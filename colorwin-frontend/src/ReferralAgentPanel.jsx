import { useEffect, useState } from 'react'
import { API } from './api.js'

const TOKEN_KEY = 'mh_referral_agent_token'

function money(n) {
  return Number(n || 0).toLocaleString('en-IN')
}

function kindLabel(kind, firstPct, nextPct) {
  if (kind === 'SIGNUP') return 'Signup reward'
  if (kind === 'FIRST_DEPOSIT') return `First deposit ${firstPct ?? 10}%`
  if (kind === 'NEXT_DEPOSIT') return `Next deposit ${nextPct ?? 5}%`
  return kind
}

function agentShareLink(me) {
  if (!me?.agentCode) return me?.referralLink || ''
  return `${window.location.origin}/?aref=${me.agentCode}`
}

export default function ReferralAgentPanel() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [me, setMe] = useState(null)
  const [referrals, setReferrals] = useState([])
  const [earnings, setEarnings] = useState([])

  async function loadDesk(activeToken = token) {
    const headers = { Authorization: `Bearer ${activeToken}` }
    const [meRes, refRes, earnRes] = await Promise.all([
      fetch(`${API}/referral-agent/me`, { headers, cache: 'no-store' }),
      fetch(`${API}/referral-agent/referrals`, { headers, cache: 'no-store' }),
      fetch(`${API}/referral-agent/earnings`, { headers, cache: 'no-store' }),
    ])
    if (!meRes.ok) throw new Error('Session expired. Login again.')
    setMe(await meRes.json())
    setReferrals(refRes.ok ? await refRes.json() : [])
    setEarnings(earnRes.ok ? await earnRes.json() : [])
  }

  useEffect(() => {
    if (!token) return undefined
    let cancelled = false
    loadDesk(token).catch((err) => {
      if (!cancelled) {
        setError(err.message || 'Could not load panel')
        localStorage.removeItem(TOKEN_KEY)
        setToken('')
      }
    })
    return () => { cancelled = true }
  }, [token])

  async function login(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const response = await fetch(`${API}/referral-agent/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.message || 'Login failed')
      localStorage.setItem(TOKEN_KEY, data.token)
      setToken(data.token)
      setPassword('')
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY)
    setToken('')
    setMe(null)
    setReferrals([])
    setEarnings([])
  }

  async function copyLink() {
    const link = agentShareLink(me)
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setError('Copy failed')
    }
  }

  if (!token) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_top,#3b0764_0%,#050817_55%)] p-4 text-white">
        <span className="ra-float a" aria-hidden="true">💰</span>
        <span className="ra-float b" aria-hidden="true">🪙</span>
        <span className="ra-float c" aria-hidden="true">💵</span>
        <span className="ra-float d" aria-hidden="true">✨</span>
        <form onSubmit={login} className="ra-login-card ra-sheen-wrap relative z-[1] w-full max-w-md space-y-4 overflow-hidden rounded-3xl border border-yellow-400/40 bg-[linear-gradient(160deg,#1a0b2e_0%,#0b0b18_60%)] p-6">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-yellow-300">Millionaire Hub</p>
            <h1 className="mt-2 text-3xl font-black">Referral Agent</h1>
            <p className="mt-1 text-sm font-bold text-fuchsia-200">Login with the ID & password from admin.</p>
          </div>
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" className="w-full rounded-2xl border border-yellow-400/30 bg-[#080817] px-4 py-3 font-bold outline-none focus:border-yellow-300" required />
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" className="w-full rounded-2xl border border-yellow-400/30 bg-[#080817] px-4 py-3 font-bold outline-none focus:border-yellow-300" required />
          {error && <p className="text-sm text-red-300">{error}</p>}
          <button disabled={busy} className="ra-copy-btn w-full rounded-2xl border border-yellow-200 bg-gradient-to-b from-yellow-300 to-amber-500 py-3.5 font-black text-black shadow-[0_4px_0_#92400e] disabled:opacity-50">
            {busy ? 'Checking...' : 'Enter Agent Panel'}
          </button>
        </form>
      </div>
    )
  }

  const shareLink = agentShareLink(me)

  return (
    <div className="ra-desk min-h-screen bg-[#03030c] text-white">
      <div className="mx-auto max-w-3xl space-y-3 p-3 pb-10">
        <header className="ra-hero relative overflow-hidden rounded-3xl border border-yellow-400/45 bg-[linear-gradient(120deg,#3b0764_0%,#9d174d_45%,#1a0b2e_100%)] p-5">
          <div className="ra-hero-orb pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-yellow-300/25 blur-3xl" />
          <span className="ra-float a" aria-hidden="true">💰</span>
          <span className="ra-float b" aria-hidden="true">🤑</span>
          <span className="ra-float c" aria-hidden="true">🪙</span>
          <span className="ra-float d" aria-hidden="true">💸</span>
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-yellow-300">Agent Desk</p>
              <h1 className="mt-1 text-2xl font-black sm:text-3xl">{me?.displayName || 'Referral Agent'}</h1>
              <p className="mt-1 text-sm font-bold text-fuchsia-100">@{me?.username} · code {me?.agentCode}</p>
            </div>
            <button type="button" onClick={logout} className="rounded-2xl border border-white/20 bg-black/30 px-3 py-2 text-xs font-black">Logout</button>
          </div>
          <div className="ra-sheen-wrap relative mt-4 rounded-2xl border border-yellow-300/40 bg-black/35 p-3">
            <p className="text-xs font-bold text-yellow-200">Your special link</p>
            <p className="mt-1 break-all text-sm font-black text-white">{shareLink || '...'}</p>
            <button type="button" onClick={copyLink} className="ra-copy-btn mt-3 w-full rounded-2xl border border-yellow-200 bg-gradient-to-b from-yellow-300 to-amber-500 py-2.5 font-black text-black shadow-[0_3px_0_#92400e]">
              {copied ? '✓ Copied' : '📋 Copy Agent Link'}
            </button>
          </div>
        </header>

        {error && <p className="rounded-2xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">{error}</p>}

        <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ['Balance', me?.balance],
            ['Referrals', me?.totalReferrals],
            ['Signup $', me?.signupEarned],
            ['Commission', Number(me?.firstDepositEarned || 0) + Number(me?.nextDepositEarned || 0)],
          ].map(([label, value]) => (
            <div key={label} className="ra-stat rounded-2xl border border-yellow-400/25 bg-gradient-to-b from-[#1a1430] to-[#0b0b18] p-3 shadow-[0_3px_0_#3b0764]">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
              <p className="mt-1 text-xl font-black text-yellow-300">{money(value)}</p>
            </div>
          ))}
        </section>

        <section className="mh-rise rounded-3xl border border-emerald-400/30 bg-[#0d0d1c] p-4">
          <h2 className="text-lg font-black">Commission rules</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-2xl border border-yellow-400/20 bg-[#101020] p-3">
              <p className="text-xs text-slate-400">Signup</p>
              <p className="mt-1 text-lg font-black text-yellow-300">{money(me?.signupReward)} coins</p>
            </div>
            <div className="rounded-2xl border border-emerald-400/30 bg-[#101020] p-3">
              <p className="text-xs text-slate-400">1st deposit</p>
              <p className="mt-1 text-lg font-black text-emerald-300">{me?.firstDepositPercent ?? 10}%</p>
            </div>
            <div className="rounded-2xl border border-sky-400/30 bg-[#101020] p-3">
              <p className="text-xs text-slate-400">Next deposits</p>
              <p className="mt-1 text-lg font-black text-sky-300">{me?.nextDepositPercent ?? 5}%</p>
            </div>
          </div>
        </section>

        <section className="mh-rise rounded-3xl border border-yellow-400/25 bg-[#0d0d1c] p-4">
          <h2 className="text-lg font-black">Your referrals</h2>
          {referrals.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">No referrals yet. Share your link.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {referrals.map((row) => (
                <li key={row.username} className="mh-pop flex items-center justify-between gap-3 rounded-2xl border border-yellow-400/20 bg-gradient-to-r from-[#1a1430] to-[#0b0b18] px-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-black text-white">{row.displayName}</p>
                    <p className="text-xs text-slate-400">@{row.username}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-black text-yellow-300">{money(row.betsCount)} bets</p>
                    <p className="text-[10px] font-bold text-slate-400">{row.verified ? 'Verified' : 'Pending'}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mh-rise rounded-3xl border border-fuchsia-400/25 bg-[#0d0d1c] p-4">
          <h2 className="text-lg font-black">Earnings activity</h2>
          {earnings.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">No earnings yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {earnings.map((row) => (
                <li key={row.id} className="mh-pop rounded-2xl border border-fuchsia-400/20 bg-[#101020] px-3 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-black text-fuchsia-200">{kindLabel(row.kind, me?.firstDepositPercent, me?.nextDepositPercent)}</p>
                    <p className="font-black text-yellow-300">+{money(row.coins)}</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {row.displayName || row.username}
                    {row.percent != null ? ` · ${row.percent}% of ${money(row.baseAmount)}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

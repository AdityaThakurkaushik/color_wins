import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import gsap from 'gsap'
import { API } from './api.js'
import CasinoWheel from './agent/CasinoWheel.jsx'
import { isSfxMuted, playCoin, playTick, playWin, setSfxMuted, startMusic, stopMusic } from './agent/casinoSfx.js'

const TOKEN_KEY = 'mh_referral_agent_token'

function money(n) {
  return Number(n || 0).toLocaleString('en-IN')
}

function kindLabel(kind, firstPct, nextPct) {
  if (kind === 'SIGNUP') return 'Signup reward'
  if (kind === 'FIRST_DEPOSIT') return `First deposit ${firstPct ?? 10}%`
  if (kind === 'NEXT_DEPOSIT') return `Next deposit ${nextPct ?? 5}%`
  if (kind === 'ADJUST') return 'Balance adjust'
  return kind
}

function agentShareLink(me) {
  if (!me?.agentCode) return me?.referralLink || ''
  return `${window.location.origin}/?aref=${me.agentCode}`
}

function ChipStat({ label, value, tone = 'gold' }) {
  const valueRef = useRef(null)
  useEffect(() => {
    if (!valueRef.current) return
    const obj = { n: 0 }
    const tween = gsap.to(obj, {
      n: Number(value || 0),
      duration: 0.8,
      ease: 'power2.out',
      onUpdate: () => {
        if (valueRef.current) valueRef.current.textContent = money(Math.round(obj.n))
      },
    })
    return () => tween.kill()
  }, [value])

  return (
    <div className={`ra-chip ra-chip-${tone}`}>
      <p className="ra-chip-label">{label}</p>
      <p ref={valueRef} className="ra-chip-value">{money(value)}</p>
    </div>
  )
}

export default function ReferralAgentPanel() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [copied, setCopied] = useState(false)
  const [muted, setMuted] = useState(() => isSfxMuted())
  const [me, setMe] = useState(null)
  const [referrals, setReferrals] = useState([])
  const [earnings, setEarnings] = useState([])
  const [withdrawals, setWithdrawals] = useState([])
  const [messages, setMessages] = useState([])
  const [openMessageId, setOpenMessageId] = useState(null)
  const [notifOpen, setNotifOpen] = useState(false)
  const [profile, setProfile] = useState({ displayName: '' })
  const [withdraw, setWithdraw] = useState({
    amount: '',
    payoutMethod: 'UPI',
    accountHolderName: '',
    upiId: '',
    bankName: '',
    bankAccountNumber: '',
    bankIfsc: '',
  })

  const quickAmounts = useMemo(() => {
    const max = Number(me?.withdrawableBalance || 0)
    return [50, 100, 200, 500].filter((n) => n <= max)
  }, [me?.withdrawableBalance])

  const wheelLabels = useMemo(() => ([
    `${me?.signupReward ?? 20}`,
    `${me?.firstDepositPercent ?? 10}%`,
    `${me?.nextDepositPercent ?? 5}%`,
    'VIP',
    'LINK',
    'CASH',
    'WIN',
    'AGENT',
  ]), [me?.signupReward, me?.firstDepositPercent, me?.nextDepositPercent])

  async function loadDesk(activeToken = token) {
    const headers = { Authorization: `Bearer ${activeToken}` }
    const [meRes, refRes, earnRes, withRes, msgRes] = await Promise.all([
      fetch(`${API}/referral-agent/me`, { headers, cache: 'no-store' }),
      fetch(`${API}/referral-agent/referrals`, { headers, cache: 'no-store' }),
      fetch(`${API}/referral-agent/earnings`, { headers, cache: 'no-store' }),
      fetch(`${API}/referral-agent/withdrawals`, { headers, cache: 'no-store' }),
      fetch(`${API}/referral-agent/messages`, { headers, cache: 'no-store' }),
    ])
    if (!meRes.ok) throw new Error('Your session expired. Please log in again.')
    const meData = await meRes.json()
    setMe(meData)
    setProfile({ displayName: meData.displayName || '' })
    setReferrals(refRes.ok ? await refRes.json() : [])
    setEarnings(earnRes.ok ? await earnRes.json() : [])
    setWithdrawals(withRes.ok ? await withRes.json() : [])
    setMessages(msgRes.ok ? await msgRes.json() : [])
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
    if (!isSfxMuted()) startMusic()
    return () => {
      cancelled = true
      stopMusic()
    }
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
      playWin()
      if (!isSfxMuted()) startMusic()
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  function logout() {
    stopMusic()
    localStorage.removeItem(TOKEN_KEY)
    setToken('')
    setMe(null)
    setReferrals([])
    setEarnings([])
    setWithdrawals([])
    setMessages([])
    setOpenMessageId(null)
    setNotifOpen(false)
  }

  function timeAgo(value) {
    if (!value) return ''
    const ms = Date.now() - new Date(value).getTime()
    const mins = Math.floor(ms / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  async function openMessage(row) {
    setOpenMessageId((current) => (current === row.id ? null : row.id))
    if (row.acknowledged) return
    try {
      const response = await fetch(`${API}/referral-agent/messages/${row.id}/ack`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.message || 'Could not acknowledge notification.')
      setMessages((list) => list.map((item) => (item.id === row.id ? data : item)))
      setMe((current) => (current ? {
        ...current,
        unreadMessages: Math.max(0, Number(current.unreadMessages || 1) - 1),
      } : current))
      playTick()
    } catch (err) {
      setError(err.message || 'Could not acknowledge notification.')
    }
  }

  async function copyLink() {
    const link = agentShareLink(me)
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      playCoin()
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setError('Copy failed')
    }
  }

  async function saveProfile(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch(`${API}/referral-agent/profile`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ displayName: profile.displayName.trim() }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.message || 'Could not save profile')
      setMe(data)
      setMessage('Name saved')
      playTick()
    } catch (err) {
      setError(err.message || 'Could not save profile')
    } finally {
      setBusy(false)
    }
  }

  async function requestWithdraw(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    const amount = Number(withdraw.amount)
    const available = Number(me?.withdrawableBalance ?? Math.max(0, Number(me?.balance || 0) - Number(me?.effectiveMinBalance || 0)))
    const minKeep = Number(me?.effectiveMinBalance || 0)
    const holder = withdraw.accountHolderName.trim()
    const method = String(withdraw.payoutMethod || '').toUpperCase()
    const upiId = withdraw.upiId.trim()
    const bankName = withdraw.bankName.trim()
    const bankAccountNumber = withdraw.bankAccountNumber.replace(/\s+/g, '')
    const bankIfsc = withdraw.bankIfsc.replace(/\s+/g, '').toUpperCase()
    if (!Number.isFinite(amount) || amount <= 0) {
      setBusy(false)
      setError('Enter a withdraw amount greater than 0.')
      return
    }
    if (amount > available) {
      setBusy(false)
      setError(`You can withdraw up to ${money(available)} coins. A minimum balance of ${money(minKeep)} must remain in your account.`)
      return
    }
    if (!holder) {
      setBusy(false)
      setError('Please enter the account holder name.')
      return
    }
    if (method === 'UPI') {
      if (!/^[A-Za-z0-9._-]{2,}@[A-Za-z0-9.-]{2,}$/.test(upiId)) {
        setBusy(false)
        setError('Please enter a valid UPI ID (example: name@bank).')
        return
      }
    } else if (method === 'BANK') {
      if (!bankName) {
        setBusy(false)
        setError('Please enter the bank name.')
        return
      }
      if (!/^[0-9]{6,34}$/.test(bankAccountNumber)) {
        setBusy(false)
        setError('Please enter a valid account number (6–34 digits).')
        return
      }
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankIfsc)) {
        setBusy(false)
        setError('Please enter a valid IFSC code (example: HDFC0001234).')
        return
      }
    } else {
      setBusy(false)
      setError('Please choose UPI or Bank as the payout method.')
      return
    }
    try {
      const response = await fetch(`${API}/referral-agent/withdrawals`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          payoutMethod: method,
          accountHolderName: holder,
          upiId: method === 'UPI' ? upiId : undefined,
          bankName: method === 'BANK' ? bankName : undefined,
          bankAccountNumber: method === 'BANK' ? bankAccountNumber : undefined,
          bankIfsc: method === 'BANK' ? bankIfsc : undefined,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        await loadDesk(token).catch(() => {})
        throw new Error(data.message || 'Withdraw request failed')
      }
      if (data.me) setMe(data.me)
      else await loadDesk(token)
      setWithdrawals((list) => (data.withdrawal ? [data.withdrawal, ...list] : list))
      setWithdraw((cur) => ({ ...cur, amount: '' }))
      setMessage('Withdraw request submitted')
      playWin()
    } catch (err) {
      setError(err.message || 'Withdraw request failed')
    } finally {
      setBusy(false)
    }
  }

  function toggleMute() {
    const next = !muted
    setMuted(next)
    setSfxMuted(next)
    if (!next) {
      startMusic()
      playTick()
    }
  }

  if (!token) {
    return (
      <div className="ra-casino ra-login-screen">
        <div className="ra-felt" aria-hidden="true" />
        <div className="ra-login-layout">
          <CasinoWheel size={210} spinning />
          <form
            onSubmit={login}
            className="ra-panel ra-login-card"
            onPointerDown={() => { if (!isSfxMuted()) startMusic() }}
          >
            <p className="ra-kicker">Millionaire Hub</p>
            <h1 className="ra-title">VIP Agent Lounge</h1>
            <p className="ra-sub">Enter with your admin-issued agent credentials.</p>
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" className="ra-input" required />
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" className="ra-input" required />
            {error && <p className="ra-error">{error}</p>}
            <button disabled={busy} className="ra-btn-gold">
              {busy ? 'Checking table...' : 'Enter Agent Desk'}
            </button>
            <button
              type="button"
              className="ra-icon-btn"
              onClick={() => {
                const next = !muted
                setMuted(next)
                setSfxMuted(next)
                if (!next) startMusic()
              }}
            >
              {muted ? '🔇 Music off' : '🔊 Music on'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  const shareLink = agentShareLink(me)
  const unreadCount = Number(me?.unreadMessages || 0)

  return (
    <div className="ra-casino ra-desk">
      <div className="ra-felt" aria-hidden="true" />
      <div className="ra-shell">
        <header className="ra-panel ra-vip-header">
          <div className="ra-vip-top">
            <div className="min-w-0">
              <p className="ra-kicker">VIP Agent Desk · Table {me?.agentCode}</p>
              <h1 className="ra-title ra-title-sm">{me?.displayName || 'Referral Agent'}</h1>
              <p className="ra-sub">@{me?.username}</p>
            </div>
            <div className="ra-vip-actions">
              <button type="button" onClick={toggleMute} className="ra-icon-btn" title={muted ? 'Unmute' : 'Mute'}>
                {muted ? '🔇' : '🔊'}
              </button>
              <button
                type="button"
                onClick={() => setNotifOpen((open) => !open)}
                className="ra-icon-btn relative"
                aria-label="Admin notifications"
                aria-expanded={notifOpen}
              >
                🔔
                {unreadCount > 0 && (
                  <span className="ra-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
              </button>
              <button type="button" onClick={logout} className="ra-icon-btn">Logout</button>
            </div>
          </div>

          <div className="ra-vip-grid">
            <div className="ra-wheel-wrap">
              <CasinoWheel size={168} spinning labels={wheelLabels} />
              <p className="ra-wheel-caption">Live commission wheel</p>
            </div>
            <div className="ra-ticket">
              <p className="ra-ticket-label">Your invite ticket</p>
              <p className="ra-ticket-link">{shareLink || '...'}</p>
              <button type="button" onClick={copyLink} className="ra-btn-gold">
                {copied ? 'Ticket copied' : 'Print / Copy Link'}
              </button>
            </div>
          </div>
        </header>

        {notifOpen && createPortal(
          <>
            <button type="button" aria-label="Close notifications" className="ra-notif-backdrop" onClick={() => setNotifOpen(false)} />
            <div className="ra-notif-panel" role="dialog" aria-label="Admin notifications" onWheel={(e) => e.stopPropagation()}>
              <div className="ra-notif-head">
                <div>
                  <p className="ra-notif-title">Pit Boss Alerts</p>
                  <p className="ra-notif-sub">{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}</p>
                </div>
                <button type="button" onClick={() => setNotifOpen(false)} className="ra-icon-btn">Close</button>
              </div>
              <div className="ra-notif-scroll">
                {messages.length === 0 ? (
                  <p className="ra-empty">No notifications yet.</p>
                ) : messages.map((row) => {
                  const open = openMessageId === row.id
                  return (
                    <button key={row.id} type="button" onClick={() => openMessage(row)} className={`ra-notif-item ${row.acknowledged ? 'is-seen' : 'is-new'}`}>
                      <span className={`ra-dot ${row.acknowledged ? 'green' : 'red'}`} />
                      <span className="min-w-0 flex-1">
                        <span className="ra-notif-row">
                          <span className="ra-notif-item-title">{row.title}</span>
                          <span className="ra-notif-time">{timeAgo(row.createdAt)}</span>
                        </span>
                        <span className={`ra-notif-body ${open ? 'is-open' : ''}`}>{row.body}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </>,
          document.body,
        )}

        {error && <p className="ra-banner ra-banner-bad">{error}</p>}
        {message && <p className="ra-banner ra-banner-good">{message}</p>}

        <section className="ra-chip-row">
          <ChipStat label="Balance" value={me?.balance} tone="gold" />
          <ChipStat label="Withdrawable" value={me?.withdrawableBalance} tone="green" />
          <ChipStat label="Referrals" value={me?.totalReferrals} tone="red" />
          <ChipStat label="Commission" value={Number(me?.firstDepositEarned || 0) + Number(me?.nextDepositEarned || 0)} tone="blue" />
        </section>

        <section className="ra-panel">
          <h2 className="ra-section-title">House rules</h2>
          <div className="ra-rules">
            <div className="ra-rule"><span>Signup</span><strong>{money(me?.signupReward)} coins</strong></div>
            <div className="ra-rule"><span>1st deposit</span><strong>{me?.firstDepositPercent ?? 10}%</strong></div>
            <div className="ra-rule"><span>Next deposits</span><strong>{me?.nextDepositPercent ?? 5}%</strong></div>
          </div>
        </section>

        <section className="ra-panel">
          <h2 className="ra-section-title">Player nameplate</h2>
          <form onSubmit={saveProfile} className="ra-form">
            <input value={profile.displayName} onChange={(e) => setProfile({ displayName: e.target.value })} placeholder="Display name" className="ra-input" required maxLength={60} />
            <button disabled={busy} className="ra-btn-gold">Save name</button>
          </form>
        </section>

        <section className="ra-panel">
          <div className="ra-section-head">
            <h2 className="ra-section-title">Cashier window</h2>
            <p className="ra-meta">Withdrawable {money(me?.withdrawableBalance)} · Min keep {money(me?.effectiveMinBalance)}</p>
          </div>
          {quickAmounts.length > 0 && (
            <div className="ra-quick">
              {quickAmounts.map((amt) => (
                <button key={amt} type="button" className="ra-chip-btn" onClick={() => { setWithdraw((c) => ({ ...c, amount: String(amt) })); playTick() }}>
                  {amt}
                </button>
              ))}
            </div>
          )}
          <form onSubmit={requestWithdraw} className="ra-form">
            <input type="number" min="1" max={Math.max(1, Number(me?.withdrawableBalance || 0))} value={withdraw.amount} onChange={(e) => setWithdraw({ ...withdraw, amount: e.target.value })} placeholder={`Amount (max ${money(me?.withdrawableBalance)})`} className="ra-input" required />
            <div className="ra-method" role="group" aria-label="Payout method">
              <button
                type="button"
                className={`ra-method-btn ${withdraw.payoutMethod === 'UPI' ? 'is-active' : ''}`}
                onClick={() => { setWithdraw((cur) => ({ ...cur, payoutMethod: 'UPI' })); playTick() }}
              >
                UPI
              </button>
              <button
                type="button"
                className={`ra-method-btn ${withdraw.payoutMethod === 'BANK' ? 'is-active' : ''}`}
                onClick={() => { setWithdraw((cur) => ({ ...cur, payoutMethod: 'BANK' })); playTick() }}
              >
                Bank
              </button>
            </div>
            <input value={withdraw.accountHolderName} onChange={(e) => setWithdraw({ ...withdraw, accountHolderName: e.target.value })} placeholder="Account holder name" className="ra-input" required maxLength={100} />
            {withdraw.payoutMethod === 'UPI' ? (
              <input value={withdraw.upiId} onChange={(e) => setWithdraw({ ...withdraw, upiId: e.target.value })} placeholder="UPI ID (name@bank)" className="ra-input" required maxLength={100} />
            ) : (
              <>
                <input value={withdraw.bankName} onChange={(e) => setWithdraw({ ...withdraw, bankName: e.target.value })} placeholder="Bank name" className="ra-input" required maxLength={100} />
                <input value={withdraw.bankAccountNumber} onChange={(e) => setWithdraw({ ...withdraw, bankAccountNumber: e.target.value.replace(/[^\d]/g, '') })} placeholder="Account number" className="ra-input" required inputMode="numeric" maxLength={34} />
                <input value={withdraw.bankIfsc} onChange={(e) => setWithdraw({ ...withdraw, bankIfsc: e.target.value.replace(/\s+/g, '').toUpperCase() })} placeholder="IFSC (HDFC0001234)" className="ra-input ra-input-upper" required maxLength={11} />
              </>
            )}
            <button disabled={busy || Number(me?.withdrawableBalance || 0) <= 0} className="ra-btn-gold">Request withdraw</button>
          </form>
          {withdrawals.length > 0 && (
            <ul className="ra-list">
              {withdrawals.map((row) => (
                <li key={row.id} className="ra-list-item">
                  <div className="ra-list-main">
                    <strong>{money(row.amount)}</strong>
                    <span>{row.status}</span>
                  </div>
                  <p>{row.payoutMethod} · {row.upiId || row.bankAccountNumber}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="ra-panel">
          <h2 className="ra-section-title">Players at your table</h2>
          {referrals.length === 0 ? (
            <p className="ra-empty">No referrals yet. Share your ticket link.</p>
          ) : (
            <ul className="ra-list">
              {referrals.map((row) => (
                <li key={row.username} className="ra-list-item ra-player">
                  <div>
                    <strong>{row.displayName}</strong>
                    <p>@{row.username}</p>
                  </div>
                  <div className="text-right">
                    <strong className="text-amber-300">{money(row.betsCount)} bets</strong>
                    <p>{row.verified ? 'Verified' : 'Pending'}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="ra-panel">
          <h2 className="ra-section-title">Win board</h2>
          {earnings.length === 0 ? (
            <p className="ra-empty">No earnings yet.</p>
          ) : (
            <ul className="ra-list">
              {earnings.map((row) => (
                <li key={row.id} className="ra-list-item">
                  <div className="ra-list-main">
                    <strong>{kindLabel(row.kind, me?.firstDepositPercent, me?.nextDepositPercent)}</strong>
                    <span className="text-amber-300">{row.kind === 'ADJUST' && Number(row.baseAmount) < 0 ? '-' : '+'}{money(row.coins)}</span>
                  </div>
                  <p>
                    {row.displayName || row.username || 'Admin'}
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

import { useState, useEffect, useCallback, useRef } from 'react'
import gsap from 'gsap'
import Auth from './Auth.jsx'
import AdminDashboard from './admin/AdminDashboard.jsx'
import AgentDesk from './agent/AgentDesk.jsx'
import ReferralAgentPanel from './ReferralAgentPanel.jsx'
import AddFunds from './AddFunds.jsx'
import TransactionHistory from './TransactionHistory.jsx'
import LeaderboardBoard from './LeaderboardBoard.jsx'
import { API } from './api.js'
import SpinPage from './SpinPage.jsx'
import {
  isGameSfxMuted,
  setGameSfxMuted,
  startGameMusic,
  playClick,
  playChip,
  playPlace,
  playHit,
  playWinChime,
  playLoseTone,
} from './gameSfx.js'

const colors = [
  { name: 'RED', value: 'RED', gem: 'from-red-300 via-red-500 to-red-900', glow: 'shadow-[0_10px_28px_rgba(239,68,68,0.45)]' },
  { name: 'GREEN', value: 'GREEN', gem: 'from-emerald-200 via-emerald-500 to-emerald-900', glow: 'shadow-[0_10px_28px_rgba(16,185,129,0.45)]' },
  { name: 'BLUE', value: 'BLUE', gem: 'from-sky-200 via-blue-500 to-blue-900', glow: 'shadow-[0_10px_28px_rgba(59,130,246,0.45)]' },
]

const GEM_FLOAT_ICONS = ['+1', '🤑', '💸', '💵', '🪙', '💰', '💲', '₹', '$']
const BET_CHIPS = [
  { id: '5', label: '5', value: 5, tone: 'blue' },
  { id: '10', label: '10', value: 10, tone: 'red' },
  { id: '20', label: '20', value: 20, tone: 'teal' },
  { id: '50', label: '50', value: 50, tone: 'green' },
  { id: '100', label: '100', value: 100, tone: 'black' },
  { id: 'ALL', label: 'ALL', value: 'ALL', tone: 'purple' },
]
const DEFAULT_AVATAR = '/millionaire-hub-logo.svg'

function AccountRibbon({ name }) {
  const label = (name && String(name).trim()) || 'Guest'
  return (
    <span className="relative z-[1] max-w-[5.8rem] truncate rounded-full border border-yellow-300/80 bg-gradient-to-r from-amber-100 via-yellow-300 to-amber-400 px-1.5 py-0.5 text-center font-serif text-[9px] italic leading-tight tracking-wide text-amber-950 shadow-[0_0_8px_rgba(250,204,21,0.45)] sm:max-w-[6.5rem] sm:text-[10px]">
      {label}
    </span>
  )
}
const HERO_SLIDES = [
  {
    kicker: 'Millionaire Hub Presents',
    title: 'CONTROL YOUR GREED. WIN BIG.',
    line: 'The smartest move is knowing when to stop.',
    chip: 'Play with a cool head.',
  },
  {
    kicker: 'Play Smart',
    title: 'GREED LOSES. DISCIPLINE WINS.',
    line: 'Chase every round and you give it all back.',
    chip: 'Stay in control of your points.',
  },
  {
    kicker: 'Win With Patience',
    title: 'DON\'T FEED THE GREED.',
    line: 'One clean win beats ten hungry bets.',
    chip: 'Walk away while you are ahead.',
  },
  {
    kicker: 'Stay In Charge',
    title: 'MASTER YOUR URGE. TAKE THE WIN.',
    line: 'Big rewards belong to players who stay calm.',
    chip: 'Control your greed and win big.',
  },
]

function compressProfilePhoto(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Choose a photo'))
      return
    }
    const image = new Image()
    const url = URL.createObjectURL(file)
    image.onload = () => {
      const canvas = document.createElement('canvas')
      const size = 256
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      const scale = Math.max(size / image.width, size / image.height)
      const w = image.width * scale
      const h = image.height * scale
      ctx.drawImage(image, (size - w) / 2, (size - h) / 2, w, h)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.82))
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read photo'))
    }
    image.src = url
  })
}





function ReferralPage({ currentUser }) {
  const [copied, setCopied] = useState('')
  const [shareMessage, setShareMessage] = useState('')
  const [referralStats, setReferralStats] = useState({
    totalReferrals: 0,
    successful: 0,
    pending: 0,
    totalEarnedCoins: 0,
  })
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState('')
  const [network, setNetwork] = useState([])
  const [networkLoading, setNetworkLoading] = useState(true)

  const referralCode = currentUser?.referralCode || ''
  const [referralSettings, setReferralSettings] = useState(null)
const [referralSettingsLoading, setReferralSettingsLoading] = useState(true)
const [referralSettingsError, setReferralSettingsError] = useState('')

useEffect(() => {
  let cancelled = false

  async function loadReferralSettings() {
    try {
      const response = await fetch(`${API}/referral-settings`, {
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error(`Settings load failed: ${response.status}`)
      }

      const data = await response.json()

      if (!cancelled) {
        setReferralSettings(data)
      }
    } catch (error) {
      if (!cancelled) {
        setReferralSettingsError(error.message)
      }
    } finally {
      if (!cancelled) {
        setReferralSettingsLoading(false)
      }
    }
  }

  loadReferralSettings()

  return () => {
    cancelled = true
  }
}, [])

  const referralLink =
    `https://millionairehub.tech/?ref=${referralCode}`

  useEffect(() => {
    let cancelled = false

    async function loadReferralStats() {
      setStatsLoading(true)
      setStatsError('')

      try {
        const token = localStorage.getItem('colorwin_token')

        if (!token) {
          throw new Error('Login session expired. Please log in again.')
        }

        const response = await fetch(
          `${API}/user/referral-stats`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )

        if (!response.ok) {
          throw new Error(
            `Could not load referral stats (HTTP ${response.status}).`
          )
        }

        const data = await response.json()

        if (!cancelled) {
          setReferralStats({
            totalReferrals: Number(data.totalReferrals ?? 0),
            successful: Number(data.successful ?? 0),
            pending: Number(data.pending ?? 0),
            totalEarnedCoins: Number(data.totalEarnedCoins ?? 0),
          })
        }
      } catch (error) {
        if (!cancelled) {
          setStatsError(
            error.message || 'Could not load referral stats.'
          )
        }
      } finally {
        if (!cancelled) {
          setStatsLoading(false)
        }
      }
    }

    loadReferralStats()

    async function loadNetwork() {
      setNetworkLoading(true)
      try {
        const token = localStorage.getItem('colorwin_token')
        if (!token) return
        const response = await fetch(`${API}/user/referral-network`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        })
        if (!response.ok) return
        const data = await response.json()
        if (!cancelled) setNetwork(Array.isArray(data.referrals) ? data.referrals : [])
      } catch {
        if (!cancelled) setNetwork([])
      } finally {
        if (!cancelled) setNetworkLoading(false)
      }
    }
    loadNetwork()

    return () => {
      cancelled = true
    }
  }, [])

  async function copyText(value, type) {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(type)
      setShareMessage('')
    } catch {
      setShareMessage('Copy failed. Please copy the link manually.')
    }
  }

  async function shareReferral() {
    const text =
      `Join MILLIONAIRE HUB with my referral link: ${referralLink}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join MILLIONAIRE HUB',
          text,
          url: referralLink,
        })
      } catch {
        // User share sheet band kar sakta hai.
      }
    } else {
      await copyText(referralLink, 'link')
      setShareMessage('Referral link copied. You can share it now.')
    }
  }

  const statCards = [
    { label: 'Total Referrals', value: referralStats.totalReferrals },
    { label: 'Successful', value: referralStats.successful },
    { label: 'Pending', value: referralStats.pending },
    { label: 'Total Earned Coins', value: referralStats.totalEarnedCoins },
  ]

  return (
    <div className="space-y-3 pb-4">
      <section className="relative overflow-hidden rounded-3xl border border-yellow-400/40 bg-[linear-gradient(120deg,#3b0764_0%,#6b21a8_40%,#1a0b2e_100%)] p-5 shadow-[0_12px_32px_rgba(88,28,135,0.4)]">
        <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-yellow-400/20 blur-2xl" />
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-yellow-300">Rewards · Referral</p>
        <h2 className="mt-2 text-2xl font-black">
          Invite Friends
          <span className="mt-1 block text-yellow-300">Earn Coins</span>
        </h2>
        <p className="mt-2 text-sm font-bold text-fuchsia-200">Share your link and earn coins on eligible signups.</p>
      </section>

      <section className="space-y-3 rounded-3xl border border-yellow-400/25 bg-[#0d0d1c] p-4">
        <div>
          <label className="mb-1 block text-sm font-bold text-slate-300">Your Referral Code</label>
          <div className="flex gap-2">
            <div className="min-w-0 flex-1 break-all rounded-2xl border border-yellow-400/30 bg-[#080817] p-3 font-black text-yellow-300">
              {referralCode || 'Login to see code'}
            </div>
            <button
              type="button"
              onClick={() => copyText(referralCode, 'code')}
              className="rounded-2xl border border-yellow-200 bg-gradient-to-b from-yellow-300 to-amber-500 px-4 font-black text-black shadow-[0_4px_0_#92400e] active:translate-y-0.5 active:shadow-[0_2px_0_#92400e]"
            >
              {copied === 'code' ? '✓ Copied' : '📋 Copy'}
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold text-slate-300">Your Referral Link</label>
          <div className="flex gap-2">
            <div className="min-w-0 flex-1 break-all rounded-2xl border border-yellow-400/30 bg-[#080817] p-3 text-xs text-slate-200">
              {referralLink}
            </div>
            <button
              type="button"
              onClick={() => copyText(referralLink, 'link')}
              className="rounded-2xl border border-yellow-200 bg-gradient-to-b from-yellow-300 to-amber-500 px-4 font-black text-black shadow-[0_4px_0_#92400e] active:translate-y-0.5 active:shadow-[0_2px_0_#92400e]"
            >
              {copied === 'link' ? '✓ Copied' : '📋 Copy'}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={shareReferral}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-300 to-green-700 py-3.5 font-black text-white shadow-[0_4px_0_#14532d,0_0_16px_rgba(16,185,129,0.35)] active:translate-y-0.5 active:shadow-[0_2px_0_#14532d]"
        >
          🎁 Share Referral Link
        </button>

        {shareMessage && (
          <p role="status" className="text-sm text-yellow-300">{shareMessage}</p>
        )}
      </section>

      <section className="rounded-3xl border border-yellow-400/30 bg-[#0d0d1c] p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg font-black">Referral Reward</h3>
          <span className="rounded-2xl border border-yellow-300/70 bg-gradient-to-b from-[#2a1d12] to-[#120b24] px-3 py-1 text-[10px] font-black text-yellow-300 shadow-[0_3px_0_#6b4a00]">Per signup</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-emerald-400/40 bg-gradient-to-b from-[#102418] to-[#0b0b18] p-3 shadow-[0_3px_0_#14532d]">
            <p className="text-sm font-bold text-emerald-200">You Get</p>
            <p className="mt-1 text-xl font-black text-emerald-300">
              {referralSettingsLoading ? 'Loading...' : referralSettings ? `💰 ${referralSettings.referrerReward}` : 'Unavailable'}
            </p>
            <p className="mt-1 text-xs text-slate-400">Coins per eligible friend</p>
          </div>
          <div className="rounded-2xl border border-yellow-400/40 bg-gradient-to-b from-[#2a1d12] to-[#0b0b18] p-3 shadow-[0_3px_0_#6b4a00]">
            <p className="text-sm font-bold text-yellow-200">Friend Gets</p>
            <p className="mt-1 text-xl font-black text-yellow-300">
              {referralSettingsLoading ? 'Loading...' : referralSettings ? `🎁 ${referralSettings.referredUserReward}` : 'Unavailable'}
            </p>
            <p className="mt-1 text-xs text-slate-400">Welcome coins</p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-yellow-400/25 bg-[#0d0d1c] p-4">
        <h3 className="text-lg font-black">Your Referral Stats</h3>
        {statsLoading && <p className="mt-2 text-sm text-slate-400">Loading stats...</p>}
        {statsError && <p role="alert" className="mt-2 text-sm text-red-400">{statsError}</p>}
        <div className="mt-3 grid grid-cols-2 gap-2">
          {statCards.map(({ label, value }) => (
            <div key={label} className="rounded-2xl border border-yellow-400/20 bg-gradient-to-b from-[#1a1430] to-[#0b0b18] p-3 shadow-[0_3px_0_#3b0764]">
              <p className="text-xs font-bold text-slate-400">{label}</p>
              <p className="mt-1 text-lg font-black text-yellow-300">{statsLoading ? '...' : value.toLocaleString('en-IN')}</p>
            </div>
          ))}
        </div>
        {referralSettingsError && <p className="mt-2 text-sm text-red-400">Could not load referral settings.</p>}
        {referralSettings && !referralSettings.enabled && <p className="mt-2 text-sm text-yellow-400">Referral program is currently disabled.</p>}
      </section>

      <section className="rounded-3xl border border-yellow-400/30 bg-[linear-gradient(180deg,#15102a_0%,#0d0d1c_100%)] p-4 shadow-[0_0_24px_rgba(250,204,21,0.08)]">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg font-black">Your Referrals</h3>
          <span className="rounded-full border border-yellow-400/40 bg-yellow-400/10 px-2.5 py-0.5 text-[10px] font-black text-yellow-300">
            {network.length} people
          </span>
        </div>
        {networkLoading && <p className="mt-3 text-sm text-slate-400">Loading referrals...</p>}
        {!networkLoading && network.length === 0 && (
          <p className="mt-3 rounded-2xl border border-dashed border-yellow-400/25 bg-[#101020] p-4 text-center text-sm text-slate-400">
            No referrals yet. Share your link to invite friends.
          </p>
        )}
        {!networkLoading && network.length > 0 && (
          <ul className="mt-3 space-y-2">
            {network.map((row) => (
              <li
                key={row.username}
                className="flex items-center justify-between gap-3 rounded-2xl border border-yellow-400/20 bg-gradient-to-r from-[#1f1538] to-[#0b0b18] px-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-black text-white">{row.displayName || row.username}</p>
                  <p className="text-xs text-slate-400">@{row.username}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-black text-yellow-300">{Number(row.betsCount || 0).toLocaleString('en-IN')} bets</p>
                  <p className="text-[10px] font-bold text-slate-400">{row.verified ? 'Verified' : 'Pending'}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-3xl border border-yellow-400/25 bg-[#0d0d1c] p-4">
        <h3 className="text-lg font-black">How It Works</h3>
        <ol className="mt-3 space-y-2 text-sm font-bold text-slate-300">
          <li className="rounded-2xl border border-yellow-400/20 bg-[#101020] px-3 py-2">1. Share your code or link</li>
          <li className="rounded-2xl border border-yellow-400/20 bg-[#101020] px-3 py-2">2. Friend signs up with your link</li>
          <li className="rounded-2xl border border-yellow-400/20 bg-[#101020] px-3 py-2">3. Coins credit when the referral qualifies</li>
        </ol>
      </section>
    </div>
  )
}








function WalletPage({ currentUser, onDeposit, onWithdraw, onViewAll }) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadRecentTransactions() {
      try {
        setLoading(true)
        setError('')
        const savedToken = localStorage.getItem('colorwin_token')
        const response = await fetch(`${API}/user/transactions`, {
          headers: savedToken ? { Authorization: `Bearer ${savedToken}` } : {},
          cache: 'no-store',
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.message || 'Could not load transactions')
        if (!cancelled) setTransactions(Array.isArray(data) ? data.slice(0, 3) : [])
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load transactions')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadRecentTransactions()
    return () => { cancelled = true }
  }, [])

  const balance = Number(currentUser?.virtualPoints ?? 0).toLocaleString('en-IN')

  return (
    <section className="space-y-3 pb-4">
      <div className="relative overflow-hidden rounded-3xl border border-yellow-400/40 bg-[linear-gradient(120deg,#3b0764_0%,#6b21a8_40%,#1a0b2e_100%)] p-5 shadow-[0_12px_32px_rgba(88,28,135,0.4)]">
        <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-yellow-400/20 blur-2xl" />
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-yellow-300">My Wallet</p>
          <span className="rounded-2xl border border-yellow-300/70 bg-gradient-to-b from-yellow-300 to-amber-500 px-3 py-1 text-[10px] font-black text-black shadow-[0_3px_0_#92400e]">LIVE</span>
        </div>
        <p className="mt-5 text-sm font-bold text-fuchsia-200">Available Balance</p>
        <div className="mt-1 flex flex-wrap items-baseline gap-2">
          <h2 className="text-4xl font-black tracking-tight text-yellow-300 drop-shadow-[0_0_18px_rgba(250,204,21,0.35)]">{balance}</h2>
          <span className="text-sm font-black text-amber-100">Coins</span>
        </div>
        <p className="mt-1 text-xs text-slate-300">Your current virtual points</p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button type="button" onClick={onDeposit} className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-300 to-green-700 px-3 py-3.5 font-black text-white shadow-[0_4px_0_#14532d,0_0_16px_rgba(16,185,129,0.4)] active:translate-y-0.5 active:shadow-[0_2px_0_#14532d]">
            💰 Deposit
          </button>
          <button type="button" onClick={onWithdraw} className="flex items-center justify-center gap-1.5 rounded-2xl border border-red-900/60 bg-gradient-to-b from-[#3a1518] to-[#1a0a0c] px-3 py-3.5 font-black text-red-300/80 shadow-[0_4px_0_#450a0a] active:translate-y-0.5 active:shadow-[0_2px_0_#450a0a]">
            🔻 Withdraw
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-yellow-400/25 bg-[#0d0d1c] p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h3 className="font-black text-white">Recent Transactions</h3>
            <p className="mt-1 text-xs text-slate-400">Latest wallet activity</p>
          </div>
          <button type="button" onClick={onViewAll} className="shrink-0 rounded-2xl border border-yellow-300/70 bg-gradient-to-b from-[#2a1d12] to-[#120b24] px-3 py-2 text-xs font-black text-yellow-300 shadow-[0_3px_0_#6b4a00] active:translate-y-0.5 active:shadow-[0_1px_0_#6b4a00]">View All</button>
        </div>

        {loading && <p className="py-5 text-center text-sm text-slate-400">Loading transactions...</p>}
        {!loading && error && <p className="rounded-2xl border border-red-900 bg-red-950/30 p-3 text-sm text-red-300">{error}</p>}
        {!loading && !error && transactions.length === 0 && <p className="py-5 text-center text-sm text-slate-400">No transactions yet.</p>}
        {!loading && !error && transactions.map((row) => (
          <button type="button" key={row.id} onClick={onViewAll} className="mb-2 flex w-full items-center justify-between gap-3 rounded-2xl border border-yellow-400/20 bg-gradient-to-b from-[#1a1430] to-[#0b0b18] px-3 py-3 text-left shadow-[0_3px_0_#3b0764] active:translate-y-0.5 active:shadow-[0_1px_0_#3b0764]">
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-white">{row.title || row.kind || 'Transaction'}</p>
              <p className="mt-1 truncate text-xs text-slate-400">{row.detail || (row.createdAt ? new Date(row.createdAt).toLocaleString() : '')}</p>
              <p className="mt-1 text-[11px] uppercase text-slate-500">{row.status || '—'}</p>
            </div>
            <p className={`shrink-0 text-sm font-black ${row.direction === 'IN' ? 'text-emerald-300' : 'text-amber-300'}`}>
              {row.direction === 'IN' ? '+' : '−'}{Number(row.amount ?? 0).toLocaleString('en-IN')}
            </p>
          </button>
        ))}
      </div>
    </section>
  )
}


function NavIcon({ name }) {
  const props = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className: 'h-6 w-6',
    'aria-hidden': true,
  }
  if (name === 'Home') {
    return (
      <svg {...props}>
        <path d="M4 10.5 12 4l8 6.5" />
        <path d="M6.5 9.8V20h11V9.8" />
        <path d="M10 20v-5h4v5" />
      </svg>
    )
  }
  if (name === 'Results') {
    return (
      <svg {...props}>
        <path d="M5 19V10" />
        <path d="M12 19V5" />
        <path d="M19 19v-7" />
        <path d="M4 19h16" />
      </svg>
    )
  }
  if (name === 'Rewards') {
    return (
      <svg {...props}>
        <circle cx="12" cy="9" r="4.5" />
        <path d="M8.2 12.6 6.5 20l5.5-2.4L17.5 20l-1.7-7.4" />
      </svg>
    )
  }
  if (name === 'XpinR') {
    return (
      <svg {...props}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 5.5v13" />
        <path d="M5.5 12h13" />
        <path d="M7.8 7.8 16.2 16.2" />
      </svg>
    )
  }
  return (
    <svg {...props}>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 19.5c1.2-3 3.4-4.5 6.5-4.5s5.3 1.5 6.5 4.5" />
    </svg>
  )
}

function GameApp() {

  const [selectedColor, setSelectedColor] = useState('')
  const [heroSlide, setHeroSlide] = useState(0)
  const [hubBlink, setHubBlink] = useState(false)
  const [angerCount, setAngerCount] = useState(() => {
    const saved = Number(localStorage.getItem('mh_anger_count'))
    return Number.isFinite(saved) && saved > 0 ? saved : 0
  })
  const [angerHit, setAngerHit] = useState(0)
  const [angerLabel, setAngerLabel] = useState('LET IT OUT')
  const [amount, setAmount] = useState(5)
  const [selectedChipId, setSelectedChipId] = useState('5')
  const [gameMuted, setGameMuted] = useState(() => isGameSfxMuted())
  const [flyingCoins, setFlyingCoins] = useState([])
  const resultSoundRef = useRef(null)
  const colorBtnRefs = useRef({})
  const chipBtnRefs = useRef({})
  const flyLayerRef = useRef(null)
  useEffect(() => {
    let clearBlink
    const blink = () => {
      setHubBlink(true)
      clearBlink = window.setTimeout(() => setHubBlink(false), 480)
    }
    const id = window.setInterval(blink, 10000)
    return () => {
      window.clearInterval(id)
      window.clearTimeout(clearBlink)
    }
  }, [])

  const [page, setPage] = useState(() =>
  new URLSearchParams(window.location.search).get('ref')
    ? 'Login'
    : 'Home'
)
  const [currentUser, setCurrentUser] = useState(null)
  const [currentRound, setCurrentRound] = useState(null)
  const [results, setResults] = useState([])
  const [myBets, setMyBets] = useState([])
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [apiError, setApiError] = useState('')
  const [betMessage, setBetMessage] = useState('')
  const [betError, setBetError] = useState(false)
  const [submittingBet, setSubmittingBet] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  // Notifications page state
const [allNotifications, setAllNotifications] = useState([])
const [notificationPage, setNotificationPage] = useState(0)
const [notificationTotalPages, setNotificationTotalPages] = useState(0)
    // Notifications state
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [notificationError, setNotificationError] = useState('')
  const notificationPanelRef = useRef(null)
  const profileFileRef = useRef(null)
  const [profileName, setProfileName] = useState('')
  const [profileBusy, setProfileBusy] = useState(false)
  const [profileNotice, setProfileNotice] = useState('')

  useEffect(() => {
    const timer = setInterval(() => {
      setHeroSlide((current) => (current + 1) % HERO_SLIDES.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [])

  const [pendingBetId, setPendingBetId] = useState(null)
  const [resultPopup, setResultPopup] = useState(null)
  const playFocusRef = useRef(null)
  const waitFocusRef = useRef(null)
  const currentPendingBet =
    myBets.find(
      (bet) => String(bet.betId) === String(pendingBetId)
    ) ||
    myBets.find((bet) => bet.status === 'PENDING') ||
    null
  const lockedColor = currentPendingBet?.color || selectedColor

  useEffect(() => {
    if (!resultPopup) {
      resultSoundRef.current = null
      return
    }
    const key = `${resultPopup.betId}-${resultPopup.status}`
    if (resultSoundRef.current === key) return
    resultSoundRef.current = key
    if (resultPopup.status === 'WON') playWinChime()
    else playLoseTone()
  }, [resultPopup])

  const [isAuthenticated, setIsAuthenticated] = useState(
    () => Boolean(localStorage.getItem('colorwin_token'))
  )

const token = () => localStorage.getItem('colorwin_token')

useEffect(() => {
  if (!isAuthenticated) {
    setAngerLabel('LET IT OUT')
    return
  }
  let cancelled = false
  async function loadAngerLabel() {
    try {
      const response = await fetch(`${API}/user/anger-button`, {
        headers: { Authorization: `Bearer ${token()}` },
        cache: 'no-store',
      })
      if (!response.ok) return
      const data = await response.json()
      if (!cancelled && data.label) setAngerLabel(String(data.label))
    } catch {
      // Keep the last label if the setting request fails.
    }
  }
  loadAngerLabel()
  return () => {
    cancelled = true
  }
}, [isAuthenticated])

const authHeaders = () => ({
  Authorization: `Bearer ${token()}`,
})

// Load unread notification count
const loadUnreadCount = useCallback(async () => {
  const savedToken = token()

  if (!savedToken) {
    setUnreadCount(0)
    return
  }

  try {
    const response = await fetch(
      `${API}/user/notifications/unread-count`,
      {
        headers: { Authorization: `Bearer ${savedToken}` },
        cache: 'no-store',
      }
    )

    if (!response.ok) {
      throw new Error(`Unread count API: ${response.status}`)
    }

    const data = await response.json()
    setUnreadCount(Number(data.unreadCount ?? 0))
    setNotificationError('')
  } catch (error) {
    console.error('Unread notification count failed:', error)
    setNotificationError('Could not load notifications.')
  }
}, [])

// Load notification history
const loadNotifications = useCallback(async () => {
  const savedToken = token()

  if (!savedToken) {
    setNotifications([])
    return
  }

  setNotificationsLoading(true)

  try {
    const response = await fetch(
      `${API}/user/notifications?page=0&size=15`,
      {
        headers: { Authorization: `Bearer ${savedToken}` },
        cache: 'no-store',
      }
    )

    if (!response.ok) {
      throw new Error(`Notifications API: ${response.status}`)
    }

    const data = await response.json()

    setNotifications(
      Array.isArray(data.content) ? data.content : []
    )
    setNotificationError('')
  } catch (error) {
    console.error('Notifications loading failed:', error)
    setNotificationError('Could not load notifications. Please try again.')
    
  } finally {
    setNotificationsLoading(false)
  }
}, [])

// Load all notifications with pagination
const loadAllNotifications = useCallback(async (pageNumber = 0) => {
  const savedToken = token()

  if (!savedToken) {
    setAllNotifications([])
    return
  }

  setNotificationsLoading(true)

  try {
    const response = await fetch(
      `${API}/user/notifications?page=${pageNumber}&size=15`,
      {
        headers: { Authorization: `Bearer ${savedToken}` },
        cache: 'no-store',
      }
    )

    if (!response.ok) {
      throw new Error(`Notifications API: ${response.status}`)
    }

    const data = await response.json()

    setAllNotifications(
      Array.isArray(data.content) ? data.content : []
    )
    setNotificationPage(data.number ?? pageNumber)
    setNotificationTotalPages(data.totalPages ?? 0)
    setNotificationError('')
  } catch (error) {
    console.error('All notifications loading failed:', error)
    setNotificationError('Could not load notifications.')
  } finally {
    setNotificationsLoading(false)
  }
}, [])
// Mark one notification as read
const handleMarkNotificationRead = useCallback(async (notificationId) => {
  const savedToken = token()

  if (!savedToken) return

  try {
    const response = await fetch(
      `${API}/user/notifications/${notificationId}/read`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${savedToken}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Mark as read API: ${response.status}`)
    }

    await Promise.all([
      loadNotifications(),
      loadUnreadCount(),
      loadAllNotifications(notificationPage),
    ])
  } catch (error) {
    console.error('Mark notification read failed:', error)
    setNotificationError('Could not update notification.')
  }
}, [loadNotifications, loadUnreadCount, loadAllNotifications, notificationPage])

// Mark all notifications as read
const handleMarkAllNotificationsRead = useCallback(async () => {
  const savedToken = token()

  if (!savedToken) return

  try {
    const response = await fetch(
      `${API}/user/notifications/read-all`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${savedToken}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Mark all read API: ${response.status}`)
    }

    await Promise.all([
  loadNotifications(),
  loadUnreadCount(),
  loadAllNotifications(notificationPage),
])
  } catch (error) {
    console.error('Mark all notifications read failed:', error)
    setNotificationError('Could not update notifications.')
  }
}, [loadNotifications, loadUnreadCount, loadAllNotifications, notificationPage])


// Load user profile
const loadUserProfile = useCallback(async () => {
  const savedToken = token()

  if (!savedToken) {
    setCurrentUser(null)
    return
  }

  try {
    const response = await fetch(`${API}/user/me`, {
      headers: { Authorization: `Bearer ${savedToken}` },
      cache: 'no-store',
    })

    if (response.status === 401) {
      setCurrentUser(null)
      return
    }

    if (!response.ok) {
      throw new Error(`Profile API: ${response.status}`)
    }

    const profile = await response.json()
    setCurrentUser(profile)
    setProfileName(profile.displayName || profile.username || '')
  } catch (error) {
    console.error('Profile loading failed:', error)
  }
}, [])

  async function saveProfile(payload) {
    const savedToken = token()
    if (!savedToken) {
      setPage('Login')
      return
    }
    setProfileBusy(true)
    setProfileNotice('')
    try {
      const response = await fetch(`${API}/user/profile`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${savedToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Could not save profile')
      setCurrentUser(data)
      setProfileName(data.displayName || data.username || '')
      setProfileNotice('Profile saved')
    } catch (error) {
      setProfileNotice(error.message)
    } finally {
      setProfileBusy(false)
    }
  }

  async function onProfilePhotoPicked(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const profileImage = await compressProfilePhoto(file)
      await saveProfile({ profileImage })
    } catch (error) {
      setProfileNotice(error.message)
    }
  }


  useEffect(() => {
    if (isAuthenticated) {
      loadUserProfile()
    } else {
      setCurrentUser(null)
      setMyBets([])
      setPendingBetId(null)
      setResultPopup(null)
    }
  }, [isAuthenticated, loadUserProfile])
  
// Notification unread count refresh
// Close notification dropdown when clicking outside
useEffect(() => {
  if (!notificationsOpen) return

  const handleOutsideClick = (event) => {
    if (
      notificationPanelRef.current &&
      !notificationPanelRef.current.contains(event.target)
    ) {
      setNotificationsOpen(false)
    }
  }

  document.addEventListener('mousedown', handleOutsideClick)
  document.addEventListener('touchstart', handleOutsideClick)

  return () => {
    document.removeEventListener('mousedown', handleOutsideClick)
    document.removeEventListener('touchstart', handleOutsideClick)
  }
}, [notificationsOpen])
useEffect(() => {
  if (!isAuthenticated) {
    setUnreadCount(0)
    setNotifications([])
    return
  }

  loadUnreadCount()

  const interval = setInterval(() => {
    loadUnreadCount()
  }, 12000)

  return () => clearInterval(interval)
}, [isAuthenticated, loadUnreadCount])
// Load notifications when Notifications page opens
useEffect(() => {
  if (page === 'Notifications' && isAuthenticated) {
    loadAllNotifications(0)
  }
}, [page, isAuthenticated, loadAllNotifications])

useEffect(() => {
  window.scrollTo(0, 0)
}, [page])

  const loadGameData = useCallback(async () => {
    try {
      const [roundResponse, resultsResponse] = await Promise.all([
        fetch(`${API}/game/current`, { cache: 'no-store' }),
        fetch(`${API}/game/results`, { cache: 'no-store' }),
      ])

      if (!roundResponse.ok && roundResponse.status !== 204) {
        throw new Error(`Current round API: ${roundResponse.status}`)
      }

      if (!resultsResponse.ok) {
        throw new Error(`Results API: ${resultsResponse.status}`)
      }

      const round = roundResponse.status === 204
        ? null
        : await roundResponse.json()

      const recentResults = await resultsResponse.json()

      setCurrentRound(round)
      setResults(Array.isArray(recentResults) ? recentResults : [])
      setApiError('')
    } catch (error) {
      setApiError('Could not connect to the game server.')
      console.error('Game API error:', error)
    }
  }, [])

  useEffect(() => {
    loadGameData()

    const tick = () => {
      if (typeof document !== 'undefined' && document.hidden) return
      loadGameData()
    }
    const interval = setInterval(tick, 4000)
    const onVis = () => {
      if (!document.hidden) loadGameData()
    }
    document.addEventListener('visibilitychange', onVis)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [loadGameData])

  useEffect(() => {
    function updateCountdown() {
      if (!currentRound?.endsAt) {
        setSecondsLeft(0)
        return
      }

      const endTime = new Date(currentRound.endsAt).getTime()

      if (!Number.isFinite(endTime)) {
        setSecondsLeft(0)
        return
      }

      setSecondsLeft(
        Math.max(0, Math.ceil((endTime - Date.now()) / 1000))
      )
    }

    updateCountdown()

    const interval = setInterval(updateCountdown, 250)

    return () => clearInterval(interval)
  }, [currentRound])

  const loadMyBets = useCallback(async () => {
    const savedToken = token()

    if (!savedToken) {
      setMyBets([])
      return []
    }

    setHistoryLoading(true)

    try {
      const response = await fetch(`${API}/bets/my`, {
        headers: { Authorization: `Bearer ${savedToken}` },
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error(`Bet history API: ${response.status}`)
      }

      const data = await response.json()
      const bets = Array.isArray(data) ? data : []

      setMyBets(bets)
      return bets
    } catch (error) {
      console.error('Bet history loading failed:', error)
      setBetMessage(error.message)
      setBetError(true)
      return []
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
  if (!isAuthenticated) return

  let cancelled = false

  async function restoreMyBets() {
    const bets = await loadMyBets()

    if (cancelled) return

    const pendingBet = bets.find(
      (bet) => bet.status === 'PENDING'
    )

    if (pendingBet) {
      setPendingBetId(pendingBet.betId)
    }
  }

  restoreMyBets()

  return () => {
    cancelled = true
  }
}, [isAuthenticated, loadMyBets])

  // Automatically check the newly placed bet until it is settled.
  useEffect(() => {
    if (pendingBetId == null || !isAuthenticated) return

    let cancelled = false
    let checking = false

    async function checkBetResult() {
      if (checking) return
      checking = true

      try {
        const savedToken = token()
        if (!savedToken) return

        const response = await fetch(`${API}/bets/my`, {
          headers: { Authorization: `Bearer ${savedToken}` },
          cache: 'no-store',
        })

        if (!response.ok) return

        const data = await response.json()
        const bets = Array.isArray(data) ? data : []

        if (cancelled) return

        setMyBets(bets)

        const bet = bets.find(
          (item) => String(item.betId) === String(pendingBetId)
        )

        if (!bet || !['WON', 'LOST', 'REFUNDED'].includes(bet.status)) return

        const profileResponse = await fetch(`${API}/user/me`, {
          headers: { Authorization: `Bearer ${savedToken}` },
          cache: 'no-store',
        })

        if (!profileResponse.ok) return

        const profile = await profileResponse.json()

        if (cancelled) return

        setCurrentUser(profile)

        const resultsResponse = await fetch(`${API}/game/results`, {
  headers: { Authorization: `Bearer ${savedToken}` },
  cache: 'no-store',
})

let winningColor = null

if (resultsResponse.ok) {
  const resultsData = await resultsResponse.json()
  const roundResult = (Array.isArray(resultsData) ? resultsData : []).find(
    (item) => String(item.periodNumber) === String(bet.periodNumber)
  )

  winningColor = roundResult?.resultColor ?? null
}

setResultPopup({
  ...bet,
  resultColor: winningColor,
  updatedBalance: profile.virtualPoints,
})
        setPendingBetId(null)
        setBetMessage('')
        setBetError(false)
      } catch (error) {
        console.error('Bet result check failed:', error)
      } finally {
        checking = false
      }
    }

    checkBetResult()
    const interval = setInterval(checkBetResult, 2000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [pendingBetId, isAuthenticated])

  async function handlePlaceBet() {
    if (submittingBet) return

    setBetMessage('')
    setBetError(false)

    if (!isAuthenticated || !token()) {
      setBetMessage('Please log in to place a bet.')
      setBetError(true)
      setPage('Login')
      return
    }

    if (!selectedColor) {
      setBetMessage('Please select a color first.')
      setBetError(true)
      return
    }

    if (!currentRound?.periodNumber || currentRound.status !== 'OPEN') {
      setBetMessage('No open round right now. Please wait.')
      setBetError(true)
      return
    }

    if (secondsLeft <= 0) {
      setBetMessage('This round has ended. Please wait for the next round.')
      setBetError(true)
      return
    }

    const parsedAmount = Math.trunc(Number(amount))
    if (!Number.isFinite(parsedAmount) || parsedAmount < 5) {
      setBetMessage('Minimum bet is 5 points.')
      setBetError(true)
      return
    }

    if (parsedAmount > (currentUser?.virtualPoints ?? 0)) {
      setBetMessage('You do not have enough virtual points.')
      setBetError(true)
      return
    }

    if (pendingBetId != null) {
      setBetMessage('Please wait for your previous bet result.')
      setBetError(true)
      return
    }

    setSubmittingBet(true)

    try {
      const response = await fetch(`${API}/bets`, {
        method: 'POST',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          periodNumber: currentRound.periodNumber,
          color: selectedColor,
          amount: parsedAmount,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          data.message || `Bet failed: HTTP ${response.status}`
        )
      }

      if (data.betId == null) {
        throw new Error('Bet placed, but response did not include a bet ID.')
      }

      setBetMessage(
        `Bet successful! ${data.amount} points on ${data.color}. Waiting for result...`
      )

      setBetError(false)
      setSelectedColor(data.color || selectedColor)
      setPendingBetId(data.betId)
      setPage('Home')
      startGameMusic()
      playPlace()
      // Bring WAIT / Locked Color / Tap Pad in front immediately after bet
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          const target = playFocusRef.current || waitFocusRef.current
          target?.scrollIntoView({ behavior: 'auto', block: 'start' })
        })
      })

      await Promise.all([
        loadUserProfile(),
        loadMyBets(),
      ])
    } catch (error) {
      setBetMessage(error.message || 'Could not place the bet.')
      setBetError(true)
    } finally {
      setSubmittingBet(false)
    }
  }

  function handleLogout() {
    localStorage.removeItem('colorwin_token')
    setIsAuthenticated(false)
    setCurrentUser(null)
    setMyBets([])
    setPendingBetId(null)
    setResultPopup(null)
    setPage('Login')
  }

  function handleLogin(newToken) {
    if (newToken) {
      localStorage.setItem('colorwin_token', newToken)
    }

    setIsAuthenticated(Boolean(token()))
    setPage('Home')
  }

  function formatTime(seconds) {
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(
      seconds % 60
    ).padStart(2, '0')}`
  }

  function colorTextClass(color) {
    if (color === 'RED') return 'text-red-500'
    if (color === 'GREEN') return 'text-emerald-400'
    if (color === 'BLUE') return 'text-blue-400'
    return 'text-purple-400'
  }

  function colorBadgeClass(color) {
    if (color === 'RED') return 'bg-red-600'
    if (color === 'GREEN') return 'bg-emerald-600'
    if (color === 'BLUE' ) return 'bg-blue-600'
    return 'bg-purple-600'
  }

  function releaseAnger() {
    setAngerCount((count) => {
      const next = count + 1
      localStorage.setItem('mh_anger_count', String(next))
      return next
    })
    setAngerHit((hit) => hit + 1)
    playHit()
  }

  function flyCoinToColor(fromEl, colorValue, chipValue) {
    const target = colorBtnRefs.current[colorValue]
    if (!fromEl || !target || !colorValue) return
    const from = fromEl.getBoundingClientRect()
    const to = target.getBoundingClientRect()
    const id = `coin-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const startX = from.left + from.width / 2
    const startY = from.top + from.height / 2
    const endX = to.left + to.width / 2
    const endY = to.top + to.height / 2
    setFlyingCoins((list) => [...list, {
      id,
      value: chipValue,
      color: colorValue,
      x: startX,
      y: startY,
    }])
    window.requestAnimationFrame(() => {
      const node = document.getElementById(id)
      if (!node) return
      gsap.fromTo(node, {
        left: startX,
        top: startY,
        scale: 1,
        opacity: 1,
        rotate: 0,
      }, {
        left: endX,
        top: endY,
        scale: 0.5,
        opacity: 0.12,
        rotate: 480,
        duration: 0.58,
        ease: 'power2.in',
        onComplete: () => {
          setFlyingCoins((list) => list.filter((c) => c.id !== id))
          gsap.fromTo(target, { scale: 1 }, { scale: 1.07, yoyo: true, repeat: 1, duration: 0.12, overwrite: 'auto' })
        },
      })
    })
  }

  function resolveChipAmount(chip) {
    if (!chip) return 50
    if (chip.value === 'ALL') {
      return Math.max(0, Number(currentUser?.virtualPoints || 0))
    }
    return Number(chip.value)
  }

  function pickChip(chip, chipEl) {
    const nextAmount = resolveChipAmount(chip)
    setSelectedChipId(chip.id)
    setAmount(nextAmount)
    startGameMusic()
    playChip()
    const color = selectedColor || lockedColor
    if (color && chipEl) flyCoinToColor(chipEl, color, chip.label)
  }

  function pickColor(colorValue) {
    if (pendingBetId != null) return
    setSelectedColor(colorValue)
    startGameMusic()
    playClick()
    const chipEl = chipBtnRefs.current[selectedChipId]
    if (chipEl) flyCoinToColor(chipEl, colorValue, selectedChipId === 'ALL' ? 'ALL' : amount)
  }

  function toggleGameMute() {
    const next = !gameMuted
    setGameMuted(next)
    setGameSfxMuted(next)
    if (!next) {
      startGameMusic()
      playClick()
    }
  }

  const showAnger = pendingBetId != null && !resultPopup
  const won = resultPopup?.status === 'WON'
  const isRefunded = resultPopup?.status === 'REFUNDED'
  const popupColor = won ? 'emerald' : 'red'

  useEffect(() => {
    if (!showAnger) return undefined
    const jump = () => {
      const target = playFocusRef.current || waitFocusRef.current
      target?.scrollIntoView({ behavior: 'auto', block: 'start' })
    }
    jump()
    const t1 = window.setTimeout(jump, 16)
    const t2 = window.setTimeout(jump, 100)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [showAnger, pendingBetId])

  return (
    <div className="min-h-screen bg-[#03030c] text-white">
      <div ref={flyLayerRef} className="mh-fly-layer" aria-hidden="true">
        {flyingCoins.map((coin) => (
          <div
            key={coin.id}
            id={coin.id}
            className={`mh-fly-coin mh-fly-coin-${String(coin.color || '').toLowerCase()}`}
            style={{ left: coin.x, top: coin.y }}
          >
            <span>{coin.value}</span>
          </div>
        ))}
      </div>
      <div className="mx-auto min-h-screen w-full border-x border-purple-950 pb-24">
       
<header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between gap-2 border-b border-yellow-400/30 bg-[linear-gradient(180deg,#1c1433_0%,#080817_100%)] px-2 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.45)] sm:px-3 sm:py-2.5">
  <button
    type="button"
    onClick={() => setPage('Home')}
    className="flex min-w-0 max-w-[48%] flex-1 items-center gap-1.5 overflow-hidden rounded-2xl border border-yellow-300/70 bg-gradient-to-b from-[#2a1d12] to-[#120b24] px-1.5 py-1 shadow-[0_4px_0_#6b4a00,0_0_18px_rgba(250,204,21,0.28)] active:translate-y-0.5 active:shadow-[0_2px_0_#6b4a00] sm:max-w-none sm:flex-none sm:gap-2 sm:px-2 sm:py-1.5"
  >
    <img
      src="/millionaire-hub-logo.svg"
      alt=""
      className="h-8 w-8 shrink-0 rounded-full object-contain ring-2 ring-yellow-300 sm:h-11 sm:w-11"
    />
    <h1 className="min-w-0 flex-1 overflow-hidden text-left font-black leading-[1.05] tracking-wide text-yellow-300 text-[clamp(10px,3.1vw,13px)] sm:text-lg sm:leading-tight">
      <span className="block truncate sm:inline sm:overflow-visible">MILLIONAIRE</span>
      <span className={`mh-hub block truncate sm:ml-1 sm:inline sm:overflow-visible${hubBlink ? ' is-blinking' : ''}`}>HUB</span>
    </h1>
  </button>

<button
  type="button"
  aria-label={gameMuted ? 'Unmute sounds' : 'Mute sounds'}
  onClick={toggleGameMute}
  className="rounded-2xl border border-yellow-400/40 bg-gradient-to-b from-[#2a1a08] to-[#151027] px-2.5 py-2 text-sm font-black text-yellow-200 shadow-[0_4px_0_#3b0764] active:translate-y-0.5 active:shadow-[0_2px_0_#3b0764]"
>
  {gameMuted ? '🔇' : '🔊'}
</button>

 {isAuthenticated && (
  <div ref={notificationPanelRef} className="relative">
      <button
        aria-label="Notifications"
        onClick={() => {
          const opening = !notificationsOpen
          setNotificationsOpen(opening)

          if (opening) {
            loadNotifications()
            loadUnreadCount()
          }
        }}
        className={`relative rounded-2xl border px-3 py-2 text-xl shadow-[0_4px_0_#3b0764] active:translate-y-0.5 active:shadow-[0_2px_0_#3b0764] ${
          unreadCount > 0
            ? 'border-yellow-400/70 bg-gradient-to-b from-[#2a1a08] to-[#1a1230] shadow-[0_4px_0_#6b4a00,0_0_16px_rgba(250,204,21,0.35)]'
            : 'border-purple-500/60 bg-gradient-to-b from-[#2a1a4a] to-[#151027]'
        }`}
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-b from-yellow-300 to-amber-500 px-1 text-xs font-black text-black">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {notificationsOpen && (
        <div className="fixed left-1/2 top-24 z-[80] w-[min(92vw,380px)] isolate -translate-x-1/2 overflow-hidden rounded-2xl border border-yellow-400/25 bg-[#0b0b18] shadow-[0_24px_60px_rgba(0,0,0,0.9)] sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-80 sm:translate-x-0">
          <div className="flex items-center justify-between border-b border-yellow-400/20 bg-[linear-gradient(90deg,#2a1a08_0%,#151027_100%)] p-3">
            <div>
              <p className="text-[10px] font-black tracking-[0.2em] text-yellow-400/90">INBOX</p>
              <h3 className="font-black text-white">Notifications</h3>
            </div>
            <button
              onClick={handleMarkAllNotificationsRead}
              disabled={unreadCount === 0}
              className="text-xs font-semibold text-yellow-300 disabled:opacity-40"
            >
              Mark all read
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notificationsLoading ? (
              <p className="p-4 text-center text-sm text-slate-400">
                Loading notifications...
              </p>
            ) : notificationError ? (
              <p className="p-4 text-center text-sm text-red-400">
                {notificationError}
              </p>
            ) : notifications.length === 0 ? (
              <p className="p-4 text-center text-sm text-slate-400">
                No notifications available.
              </p>
            ) : (
              notifications.slice(0, 7).map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => {
                    if (!notification.isRead) {
                      handleMarkNotificationRead(notification.id)
                    }
                  }}
                  className={`block w-full border-b border-white/5 p-3 text-left ${
                    notification.isRead
                      ? 'bg-[#0b0b18]'
                      : 'bg-gradient-to-r from-yellow-400/10 to-[#1a1630]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-white">
                      {notification.title}
                    </p>

                    {!notification.isRead && (
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-fuchsia-400" />
                    )}
                  </div>

                  <p className="mt-1 text-xs leading-5 text-slate-300">
                    {notification.message}
                  </p>

                  {notification.publishedAt && (
                    <p className="mt-2 text-[10px] text-slate-500">
                      {new Date(notification.publishedAt).toLocaleString()}
                    </p>
                  )}
                </button>
              ))
                        )}
          </div>

          <button
            onClick={() => {
  setNotificationsOpen(false)
  setPage('Notifications')
  
}}
            className="w-full border-t border-yellow-400/20 bg-[#151027] p-3 text-center text-sm font-black text-yellow-300 hover:bg-yellow-400/10"
          >
            See All Notifications
          </button>
        </div>
      )}
    </div>
  )}

  <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
    <button
      type="button"
      onClick={() => setPage(isAuthenticated ? 'Wallet' : 'Login')}
      className="mh-soft rounded-2xl border border-yellow-400/70 bg-gradient-to-b from-[#2a1d12] to-[#101020] px-2.5 py-2 text-xs font-black text-yellow-300 shadow-[0_4px_0_#6b4a00,0_0_12px_rgba(250,204,21,0.25)] active:translate-y-0.5 active:shadow-[0_2px_0_#6b4a00]" style={{ animationDelay: '-1.4s' }}
    >
      🪙 {(currentUser?.virtualPoints ?? 0).toLocaleString('en-IN')}
    </button>
    <button
      type="button"
      onClick={() => isAuthenticated ? setPage('Add Funds') : setPage('Login')}
      className="mh-soft shrink-0 rounded-2xl border border-yellow-200 bg-gradient-to-b from-yellow-300 to-amber-500 px-2.5 py-2 text-[11px] font-black text-black shadow-[0_4px_0_#92400e,0_0_14px_rgba(250,204,21,0.35)] active:translate-y-0.5 active:shadow-[0_2px_0_#92400e] sm:px-4 sm:text-sm" style={{ animationDelay: '-2.8s' }}
    >
      + Add Funds
    </button>
  </div>

  {!isAuthenticated && (
    <button
      type="button"
      onClick={() => setPage('Login')}
      className="mh-soft rounded-2xl border border-fuchsia-300/70 bg-gradient-to-b from-fuchsia-500 to-purple-700 px-3 py-2 text-sm font-black shadow-[0_4px_0_#4a044e] active:translate-y-0.5 active:shadow-[0_2px_0_#4a044e]" style={{ animationDelay: '-4s' }}
    >
      Login
    </button>
  )}
</header>
        <div className="mh-header-spacer" aria-hidden="true" />

        <main key={page} className="mh-rise mx-auto w-full max-w-5xl space-y-2 p-2 pb-4">
          {page === 'Login' && <Auth onLogin={handleLogin} />}

          {page === 'Home' && (
            <>
<section className="mh-hero-slim relative overflow-hidden rounded-2xl border border-yellow-400/35 bg-[linear-gradient(120deg,#3b0764_0%,#6b21a8_28%,#9d174d_58%,#1a0b2e_100%)] px-3 py-2.5 shadow-[0_12px_28px_rgba(88,28,135,0.4)] sm:px-4 sm:py-3">
                <div className="mh-orb pointer-events-none absolute -left-10 -top-16 h-28 w-28 rounded-full bg-yellow-400/25 blur-3xl" />
                <div className="mh-orb mh-orb-late pointer-events-none absolute -right-8 bottom-[-24px] h-24 w-24 rounded-full bg-fuchsia-500/30 blur-3xl" />
                <div className="mh-sheen pointer-events-none absolute inset-y-0 left-0" />
                <div className="relative z-10 flex items-center justify-between gap-3">
                  <div className="relative min-h-[3.4rem] min-w-0 flex-1 sm:min-h-[3.8rem]">
                    {HERO_SLIDES.map((slide, index) => (
                      <div
                        key={slide.title}
                        className={`${index === heroSlide ? 'relative' : 'pointer-events-none absolute inset-0'} transition-[opacity,transform] duration-500 ease-out ${index === heroSlide ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'}`}
                        aria-hidden={index !== heroSlide}
                      >
                        <p className="text-[9px] font-black uppercase tracking-[0.24em] text-yellow-300 sm:text-[10px]">
                          {slide.kicker}
                        </p>
                        <h2 className="mt-0.5 bg-gradient-to-r from-white via-yellow-100 to-fuchsia-200 bg-clip-text text-[1.05rem] font-black leading-tight text-transparent sm:text-xl">
                          {slide.title}
                        </h2>
                      </div>
                    ))}
                  </div>
                  <div className="relative flex shrink-0 flex-col items-center gap-1">
                    <span className="mh-logo-halo absolute -inset-1 rounded-full bg-yellow-400/45 blur-xl" />
                    <img src="/millionaire-hub-logo.svg" alt="Millionaire Hub" className="mh-logo-glow relative h-11 w-11 rounded-full object-contain ring-2 ring-yellow-300/80 sm:h-12 sm:w-12" />
                    <AccountRibbon name={currentUser?.displayName || currentUser?.username} />
                  </div>
                </div>
              </section>

              {apiError && (
                <div className="rounded-lg border border-red-700 bg-red-950/40 p-3 text-sm text-red-300">
                  {apiError} Check that the backend is running.
                </div>
              )}

              <div ref={playFocusRef} className="mh-lux-table mh-play-anchor">
                <section className={`mh-lux-stats grid grid-cols-[1.05fr_1.2fr_0.95fr] gap-2 ${showAnger ? 'is-sticky' : ''}`}>
                  <div className="mh-lux-card flex flex-col justify-between">
                    <p className="mh-lux-kicker">📅 Period</p>
                    <p className="mh-lux-period">{currentRound?.periodNumber ?? '...'}</p>
                  </div>
                  <div className={`mh-lux-card mh-lux-timer ${secondsLeft > 0 && secondsLeft <= 10 ? 'is-hot' : ''}`}>
                    <p className="mh-lux-kicker">⏱ Timer</p>
                    <p className={`mh-lux-time ${secondsLeft > 0 && secondsLeft <= 10 ? 'mh-urgent' : ''}`}>
                      {formatTime(secondsLeft)}
                    </p>
                  </div>
                  <div className="mh-lux-card flex flex-col justify-between">
                    <p className="mh-lux-kicker">📡 Status</p>
                    <span className={`mh-lux-status ${showAnger ? 'is-wait' : 'is-open'}`}>
                      {showAnger ? 'WAIT' : (currentRound?.status ?? '...')}
                    </span>
                  </div>
                </section>

                <section className="mh-lux-card mh-lux-colors">
                  <h3 className="mh-lux-title">
                    <span>◆</span> {showAnger ? 'Locked Color' : 'Pick Color'} <span>◆</span>
                  </h3>
                  <div className="grid grid-cols-3 gap-2.5">
                    {colors.map((color) => {
                      const on = lockedColor === color.value
                      const waiting = showAnger
                      return (
                        <button
                          key={color.value}
                          type="button"
                          disabled={waiting}
                          ref={(el) => { colorBtnRefs.current[color.value] = el }}
                          onClick={() => pickColor(color.value)}
                          className={`mh-lux-color mh-lux-color-${color.value.toLowerCase()} ${on ? 'is-on' : ''} ${waiting && !on ? 'is-dim' : ''}`}
                        >
                          <span className="mh-lux-chip" aria-hidden="true">
                            <span className="mh-lux-chip-core">{color.value === 'GREEN' ? '♣' : '♠'}</span>
                          </span>
                          <span className="mh-lux-color-name">{color.name}</span>
                        </button>
                      )
                    })}
                  </div>
                </section>

                {showAnger ? (
                  <section ref={waitFocusRef} className="mh-fight-panel mh-wait-enter">
                    <div className="mh-fight-head">
                      <div>
                        <p className="mh-lux-kicker text-red-300/80">Tap Pad</p>
                        <h3 className="text-sm font-black text-red-50">Build your hits</h3>
                      </div>
                      <div className="mh-fight-side">
                        <div className="mh-fight-timer" title="Time left this round">
                          <span className="mh-fight-count-label">TIMER</span>
                          <strong className={`mh-fight-timer-value ${secondsLeft > 0 && secondsLeft <= 10 ? 'is-hot' : ''}`}>
                            {formatTime(secondsLeft)}
                          </strong>
                        </div>
                        <div key={angerCount} className="mh-fight-count" title="Saved on this device only">
                          <span className="mh-fight-count-label">HITS</span>
                          <strong className="mh-fight-count-value">{angerCount}</strong>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`mh-tap-pad ${angerHit ? 'is-hit' : ''}`}
                      onClick={releaseAnger}
                      aria-label="Tap to build hits"
                      autoFocus
                    >
                      <span className="mh-tap-pad-glow" aria-hidden="true" />
                      <span className="mh-tap-pad-label">{angerLabel || 'LET IT OUT'}</span>
                      <span className="mh-tap-pad-hint">Keep tapping till the result</span>
                    </button>
                  </section>
                ) : (
                  <section className="mh-chip-tray">
                    <p className="mh-chip-bet-label">BET: {selectedChipId === 'ALL' ? 'ALL' : amount}</p>
                    <div className="mh-coin-row">
                      {BET_CHIPS.map((chip) => {
                        const on = selectedChipId === chip.id
                        return (
                          <button
                            key={chip.id}
                            type="button"
                            ref={(el) => { chipBtnRefs.current[chip.id] = el }}
                            onClick={(e) => pickChip(chip, e.currentTarget)}
                            className={`mh-coin mh-coin-${chip.tone} ${on ? 'is-on' : ''}`}
                            aria-label={`${chip.label} chip`}
                          >
                            <span className="mh-coin-ring" aria-hidden="true" />
                            <span className="mh-coin-value">{chip.label}</span>
                          </button>
                        )
                      })}
                    </div>
                    <div className="mh-chip-footer">
                      <label className="mh-chip-custom">
                        <span className="mh-chip-custom-label">✎ Custom amount</span>
                        <input
                          type="number"
                          min="5"
                          step="1"
                          inputMode="numeric"
                          value={amount}
                          onChange={(event) => {
                            setAmount(event.target.value)
                            setSelectedChipId('')
                          }}
                          className="mh-lux-input"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          if (!isAuthenticated) {
                            playClick()
                            setPage('Login')
                            return
                          }
                          startGameMusic()
                          handlePlaceBet()
                        }}
                        disabled={
                          isAuthenticated && (
                            submittingBet ||
                            pendingBetId != null ||
                            !currentRound ||
                            currentRound.status !== 'OPEN' ||
                            secondsLeft <= 0
                          )
                        }
                        className={`mh-lux-place ${!isAuthenticated ? 'mh-login' : ''}`}
                      >
                        <span className="mh-lux-place-ico" aria-hidden="true">🪙</span>
                        <span>
                          {submittingBet
                            ? 'PLACING BET...'
                            : pendingBetId != null
                              ? 'WAITING FOR RESULT...'
                              : !isAuthenticated
                                ? 'LOGIN TO PLAY'
                                : secondsLeft <= 0 || currentRound?.status !== 'OPEN'
                                  ? 'WAIT FOR NEXT ROUND'
                                  : 'PLACE BET'}
                        </span>
                      </button>
                    </div>
                  </section>
                )}

                {currentPendingBet && (
                  <section className="mh-lux-card border-fuchsia-500/50">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h3 className="text-sm font-black text-white">Your Current Bet</h3>
                      <span className="rounded-full border border-yellow-500/60 bg-yellow-500/15 px-2 py-0.5 text-[10px] font-black text-yellow-300">
                        {currentPendingBet.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div>
                        <p className="text-slate-400">Period</p>
                        <p className="mt-1 break-all font-bold text-white">{currentPendingBet.periodNumber}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Color</p>
                        <p className="mt-1 font-black text-white">{currentPendingBet.color}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Amount</p>
                        <p className="mt-1 font-black text-yellow-300">{currentPendingBet.amount}</p>
                      </div>
                    </div>
                  </section>
                )}

                <section className="mh-lux-card mh-lux-results">
                  <div className="mb-2.5 flex items-center justify-between gap-2">
                    <h3 className="mh-lux-title !m-0 !justify-start">
                      <span>◆</span> Recent Results
                    </h3>
                    {results[0] && (
                      <span className={`mh-lux-latest mh-lux-latest-${String(results[0].resultColor || '').toLowerCase()}`}>
                        LAST {results[0].resultNumber}
                      </span>
                    )}
                  </div>
                  <div className="mh-lux-result-rail">
                    {results.slice(0, 6).map((result, index) => (
                      <div
                        key={result.periodNumber}
                        title={`${result.periodNumber}: ${result.resultColor}`}
                        className={`mh-lux-result mh-lux-result-${String(result.resultColor || '').toLowerCase()} ${index === 0 ? 'is-latest' : ''}`}
                      >
                        <span className="mh-lux-result-num">{result.resultNumber}</span>
                        <span className="mh-lux-result-color">{result.resultColor?.[0] || '?'}</span>
                      </div>
                    ))}
                    {results.length === 0 && (
                      <p className="w-full py-2 text-center text-sm font-bold text-slate-400">
                        No results yet. Play the next round.
                      </p>
                    )}
                  </div>
                </section>

                {betMessage && (
                  <div
                    role="status"
                    className={`rounded-lg border p-3 text-sm ${
                      betError
                        ? 'border-red-700 bg-red-950/40 text-red-300'
                        : 'border-emerald-700 bg-emerald-950/40 text-emerald-300'
                    }`}
                  >
                    {betMessage}
                  </div>
                )}
              </div>

              <button
                type="button"
                className="mh-xpinr-entry"
                onClick={() => {
                  playClick()
                  setPage(isAuthenticated ? 'XpinR' : 'Login')
                }}
              >
                <div className="mh-xpinr-entry-copy">
                  <p>New Game</p>
                  <strong>XpinR Spin</strong>
                  <span>Bet coins · spin the wheel · win multipliers</span>
                </div>
                <span className="mh-xpinr-entry-cta">Play</span>
              </button>

              <LeaderboardBoard />
            </>
          )}

          {page === 'XpinR' && (
            <SpinPage
              balance={currentUser?.virtualPoints ?? 0}
              isAuthenticated={isAuthenticated}
              onLogin={() => setPage('Login')}
              onAddFunds={() => setPage(isAuthenticated ? 'Add Funds' : 'Login')}
              onBalanceChange={(next) => {
                if (typeof next === 'number') {
                  setCurrentUser((user) => (user ? { ...user, virtualPoints: next } : user))
                } else {
                  loadUserProfile()
                }
              }}
            />
          )}

          {page === 'Notifications' && (
            <section className="space-y-3 pb-4">
              <button type="button" onClick={() => setPage('Home')} className="mh-back rounded-2xl border border-yellow-300/70 bg-gradient-to-b from-[#2a1d12] to-[#120b24] px-4 py-2 text-sm font-black text-yellow-300 shadow-[0_3px_0_#6b4a00]">
                ‹ Back
              </button>
              <div className="relative overflow-hidden rounded-3xl border border-yellow-400/40 bg-[linear-gradient(120deg,#3b0764_0%,#6b21a8_40%,#1a0b2e_100%)] p-5 shadow-[0_12px_32px_rgba(88,28,135,0.4)]">
                <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-yellow-400/20 blur-2xl" />
                <p className="text-[11px] font-black tracking-[0.22em] text-yellow-300">INBOX</p>
                <h2 className="mt-1 text-2xl font-black text-white">All Notifications</h2>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={handleMarkAllNotificationsRead}
                    disabled={unreadCount === 0}
                    className="rounded-2xl border border-yellow-200 bg-gradient-to-b from-yellow-300 to-amber-500 px-3 py-2 text-xs font-black text-black shadow-[0_3px_0_#92400e] disabled:opacity-40"
                  >
                    Mark All Read
                  </button>
                </div>
              </div>

              {notificationsLoading ? (
                <p className="p-4 text-center text-slate-400">
                  Loading notifications...
                </p>
              ) : notificationError ? (
                <p className="p-4 text-center text-red-400">
                  {notificationError}
                </p>
              ) : allNotifications.length === 0 ? (
                <p className="p-4 text-center text-slate-400">
                  No notifications available.
                </p>
              ) : (
                <div className="space-y-2">
                  {allNotifications.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => {
                        if (!notification.isRead) {
                          handleMarkNotificationRead(notification.id)
                        }
                      }}
                      className={`w-full rounded-2xl border p-3 text-left shadow-[0_3px_0_#3b0764] active:translate-y-0.5 ${
                        notification.isRead
                          ? 'border-yellow-400/15 bg-gradient-to-b from-[#1a1430] to-[#0b0b18]'
                          : 'border-yellow-300/50 bg-gradient-to-b from-[#2a1d12] to-[#1a1430]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-white">
                          {notification.title}
                        </p>
                        {!notification.isRead && (
                          <span className="h-2 w-2 rounded-full bg-fuchsia-400" />
                        )}
                      </div>

                      <p className="mt-1 text-sm text-slate-300">
                        {notification.message}
                      </p>

                      {notification.publishedAt && (
                        <p className="mt-2 text-xs text-slate-500">
                          {new Date(notification.publishedAt).toLocaleString()}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-4 flex items-center justify-between">
                <button
                  disabled={notificationPage <= 0 || notificationsLoading}
                  onClick={() => loadAllNotifications(notificationPage - 1)}
                  className="rounded-2xl border border-yellow-300/70 bg-gradient-to-b from-[#2a1d12] to-[#120b24] px-4 py-2 text-sm font-black text-yellow-300 shadow-[0_3px_0_#6b4a00] disabled:opacity-40"
                >
                  Previous
                </button>

                <span className="text-xs text-slate-400">
                  Page {notificationTotalPages === 0 ? 0 : notificationPage + 1}
                  {' / '}
                  {notificationTotalPages}
                </span>

                <button
                  disabled={
                    notificationPage >= notificationTotalPages - 1 ||
                    notificationsLoading
                  }
                  onClick={() => loadAllNotifications(notificationPage + 1)}
                  className="rounded-2xl border border-yellow-300/70 bg-gradient-to-b from-[#2a1d12] to-[#120b24] px-4 py-2 text-sm font-black text-yellow-300 shadow-[0_3px_0_#6b4a00] disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </section>
          )}
          {page === 'Results' && (
            <section className="space-y-3 pb-4">
              <div className="relative overflow-hidden rounded-3xl border border-yellow-400/40 bg-[linear-gradient(120deg,#3b0764_0%,#6b21a8_40%,#1a0b2e_100%)] p-5 shadow-[0_12px_32px_rgba(88,28,135,0.4)]">
                <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-yellow-400/20 blur-2xl" />
                <p className="flex items-center gap-3.5 text-[11px] font-black uppercase tracking-[0.22em] text-yellow-300">
                  Live Arena
                  <span className="live-dot inline-block h-2.5 w-2.5 rounded-full bg-[#5a040c]" />
                </p>
                <h2 className="mt-1 text-2xl font-black text-white">Results &amp; History</h2>
                <p className="mt-1 text-sm font-bold text-fuchsia-200">Latest rounds and your bets</p>
              </div>

              <h3 className="px-1 font-black text-white">Recent Game Results</h3>
              {results.length === 0 && (
                <p className="rounded-2xl border border-yellow-400/20 bg-[#101020] p-4 text-sm text-slate-400">No results yet.</p>
              )}
              {results.map((result) => (
                <div
                  key={result.periodNumber}
                  className="grid grid-cols-3 items-center gap-2 rounded-2xl border border-yellow-400/25 bg-gradient-to-b from-[#1a1430] to-[#0b0b18] p-3 shadow-[0_3px_0_#3b0764]"
                >
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Period</p>
                    <p className="mt-1 break-all text-xs font-black text-white">{result.periodNumber}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Number</p>
                    <p className={`mt-1 text-3xl font-black ${colorTextClass(result.resultColor)}`}>{result.resultNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Color</p>
                    <span className={`mt-1 inline-block rounded-xl px-2.5 py-1 text-xs font-black shadow-[0_2px_0_rgba(0,0,0,0.35)] ${colorBadgeClass(result.resultColor)}`}>
                      {result.resultColor}
                    </span>
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-between gap-2">
                <h3 className="font-black text-white">My Bet History</h3>
                <button
                  type="button"
                  onClick={loadMyBets}
                  disabled={historyLoading || !isAuthenticated}
                  className="rounded-2xl border border-yellow-200 bg-gradient-to-b from-yellow-300 to-amber-500 px-4 py-2 text-sm font-black text-black shadow-[0_4px_0_#92400e] active:translate-y-0.5 active:shadow-[0_2px_0_#92400e] disabled:opacity-50"
                >
                  {historyLoading ? 'Loading...' : '↻ Refresh'}
                </button>
              </div>

              {!isAuthenticated && (
                <p className="rounded-2xl border border-yellow-400/20 bg-[#101020] p-4 text-sm text-slate-400">Login to view your bet history.</p>
              )}
              {isAuthenticated && myBets.length === 0 && !historyLoading && (
                <p className="rounded-2xl border border-yellow-400/20 bg-[#101020] p-4 text-sm text-slate-400">No bets found.</p>
              )}

              {myBets.map((bet) => {
                const won = bet.status === 'WON'
                const lost = bet.status === 'LOST'
                return (
                  <div
                    key={bet.betId}
                    className={`rounded-2xl border p-3 shadow-[0_3px_0_#3b0764] ${
                      won
                        ? 'border-emerald-400/50 bg-gradient-to-b from-[#102418] to-[#0b0b18]'
                        : lost
                          ? 'border-red-900/50 bg-gradient-to-b from-[#3a1518] to-[#0b0b18]'
                          : 'border-yellow-400/25 bg-gradient-to-b from-[#1a1430] to-[#0b0b18]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`font-black ${colorTextClass(bet.color)}`}>{bet.color}</span>
                      <span className={`rounded-xl px-2 py-0.5 text-xs font-black ${won ? 'bg-emerald-500/20 text-emerald-300' : lost ? 'bg-red-950 text-red-300/80' : 'bg-yellow-400/15 text-yellow-300'}`}>
                        {won ? '💰 ' : lost ? '🔻 ' : ''}{bet.status}
                      </span>
                    </div>
                    <p className="mt-2 break-all text-xs font-bold text-slate-400">Period: {bet.periodNumber}</p>
                    <div className="mt-2 flex justify-between text-sm font-black">
                      <span>Stake: {bet.amount}</span>
                      <span className={won ? 'text-emerald-300' : 'text-yellow-300'}>Payout: {bet.pointsPayout ?? 0}</span>
                    </div>
                  </div>
                )
              })}
            </section>
          )}

          {page === 'Rewards' && (
  <ReferralPage currentUser={currentUser} />
)}

          
{page === 'Wallet' && (
  <WalletPage
    currentUser={currentUser}
    onDeposit={() => isAuthenticated ? setPage('Add Funds') : setPage('Login')}
    onWithdraw={() => isAuthenticated ? setPage('Transaction History') : setPage('Login')}
    onViewAll={() => isAuthenticated ? setPage('Transaction History') : setPage('Login')}
  />
)}

{page === 'Add Funds' && (
  <AddFunds onBack={() => { setPage('Profile'); loadUserProfile() }} onBalanceChange={loadUserProfile} />
)}

{page === 'Transaction History' && (
  <TransactionHistory onBack={() => { setPage('Profile'); loadUserProfile() }} onBalanceChange={loadUserProfile} />
)}

{page === 'Profile' && (
  <section className="mh-profile space-y-3 pb-3">
    <div className="mh-profile-hero">
      <div className="mh-profile-hero-glow" aria-hidden="true" />
      <p className="mh-profile-brand">Millionaire Hub</p>

      <button
        type="button"
        onClick={() => (isAuthenticated ? profileFileRef.current?.click() : setPage('Login'))}
        className="mh-profile-avatar"
        aria-label="Change profile photo"
      >
        <span className="mh-profile-avatar-ring">
          <img
            src={currentUser?.profileImage || DEFAULT_AVATAR}
            alt=""
            className={currentUser?.profileImage ? 'h-full w-full object-cover' : 'h-[72%] w-[72%] object-contain'}
          />
        </span>
        <span className="mh-profile-avatar-edit">✎</span>
      </button>
      <input
        ref={profileFileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onProfilePhotoPicked}
      />
      <p className="mh-profile-hint">Tap photo to update</p>

      {isAuthenticated ? (
        <>
          <p className="mh-profile-user">@{currentUser?.username || 'player'}</p>
          <label className="mh-profile-label">Display name</label>
          <div className="mh-profile-name-row">
            <input
              value={profileName}
              maxLength={40}
              onChange={(event) => setProfileName(event.target.value)}
              className="mh-profile-input"
              placeholder="Your name"
            />
            <button
              type="button"
              disabled={profileBusy}
              onClick={() => saveProfile({ displayName: profileName })}
              className="mh-profile-save"
            >
              {profileBusy ? '…' : 'Save'}
            </button>
          </div>
        </>
      ) : (
        <h2 className="mh-profile-guest">Guest Player</h2>
      )}
      {profileNotice && <p className="mh-profile-notice">{profileNotice}</p>}

      <button
        type="button"
        onClick={() => setPage(isAuthenticated ? 'Wallet' : 'Login')}
        className="mh-profile-wallet"
      >
        <span className="mh-profile-wallet-ico" aria-hidden="true">🪙</span>
        <span className="min-w-0 flex-1 text-left">
          <span className="mh-profile-label">Wallet balance</span>
          <strong className="mh-profile-balance">
            {(currentUser?.virtualPoints ?? 0).toLocaleString('en-IN')}
            <span> pts</span>
          </strong>
        </span>
        <span className="mh-profile-chevron">›</span>
      </button>

      <div className="mh-profile-meta">
        <div>
          <p className="mh-profile-label">Email</p>
          <p className="mh-profile-meta-value">{currentUser?.email || 'Not available'}</p>
        </div>
        <div>
          <p className="mh-profile-label">Phone</p>
          <p className="mh-profile-meta-value">{currentUser?.phoneNumber || currentUser?.phone || 'Not available'}</p>
        </div>
      </div>
    </div>

    <div className="mh-profile-actions">
      <button
        type="button"
        className="mh-profile-action is-spin"
        onClick={() => setPage(isAuthenticated ? 'XpinR' : 'Login')}
      >
        <span className="mh-profile-action-ico">🎡</span>
        <span className="mh-profile-action-copy">
          <strong>XpinR Spin</strong>
          <span>Play the wheel with your coins</span>
        </span>
        <span className="mh-profile-chevron">›</span>
      </button>

      <button
        type="button"
        className="mh-profile-action is-funds"
        onClick={() => (isAuthenticated ? setPage('Add Funds') : setPage('Login'))}
      >
        <span className="mh-profile-action-ico">💰</span>
        <span className="mh-profile-action-copy">
          <strong>Add Funds</strong>
          <span>UPI top-up · 1 rupee = 1 coin</span>
        </span>
        <span className="mh-profile-chevron">›</span>
      </button>

      <button
        type="button"
        className="mh-profile-action"
        onClick={() => (isAuthenticated ? setPage('Transaction History') : setPage('Login'))}
      >
        <span className="mh-profile-action-ico">📜</span>
        <span className="mh-profile-action-copy">
          <strong>Transaction History</strong>
          <span>Deposits, withdrawals, game coins</span>
        </span>
        <span className="mh-profile-chevron">›</span>
      </button>

      <button
        type="button"
        className="mh-profile-action"
        onClick={() => setPage('Help & Support')}
      >
        <span className="mh-profile-action-ico">💬</span>
        <span className="mh-profile-action-copy">
          <strong>Help &amp; Support</strong>
          <span>Get help and contact us</span>
        </span>
        <span className="mh-profile-chevron">›</span>
      </button>

      <button
        type="button"
        className="mh-profile-action"
        onClick={() => setPage('Terms & Conditions')}
      >
        <span className="mh-profile-action-ico">📋</span>
        <span className="mh-profile-action-copy">
          <strong>Terms &amp; Conditions</strong>
          <span>Rules and conditions</span>
        </span>
        <span className="mh-profile-chevron">›</span>
      </button>
    </div>

    {isAuthenticated && (
      <button type="button" onClick={handleLogout} className="mh-profile-logout">
        Logout
      </button>
    )}
  </section>
)}






{page === 'Help & Support' && (
  <section className="space-y-3 pb-4">
    <button type="button" onClick={() => setPage('Profile')} className="mh-back rounded-2xl border border-yellow-300/70 bg-gradient-to-b from-[#2a1d12] to-[#120b24] px-4 py-2 text-sm font-black text-yellow-300 shadow-[0_3px_0_#6b4a00] active:translate-y-0.5">‹ Back</button>
    <div className="relative overflow-hidden rounded-3xl border border-yellow-400/40 bg-[linear-gradient(120deg,#3b0764_0%,#6b21a8_40%,#1a0b2e_100%)] p-5">
      <h2 className="text-2xl font-black text-white">💬 Help &amp; Support</h2>
      <p className="mt-1 text-sm font-bold text-fuchsia-200">Choose a support channel</p>
    </div>

    <a
      href="https://t.me/millionairehub_group"
      target="_blank"
      rel="noopener noreferrer"
      className="flex w-full items-center gap-3 rounded-2xl border border-fuchsia-300/60 bg-gradient-to-b from-fuchsia-600 to-purple-800 p-4 font-black text-white shadow-[0_4px_0_#4a044e] active:translate-y-0.5"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-sky-300">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true"><path d="M21.7 4.3 18.5 20c-.2 1.1-.9 1.4-1.8.9l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5.1 9.3-8.4c.4-.4-.1-.6-.6-.2L6 13.5l-4.9-1.5c-1.1-.3-1.1-1 .2-1.5L20 3.2c.9-.3 1.9.2 1.7 1.1Z"/></svg>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold text-white">Join Telegram Group</span>
        <span className="mt-1 block text-xs text-slate-400">Community updates, announcements and offers</span>
      </span>
      <span className="text-lg text-sky-300">↗</span>
    </a>

    <a
      href="https://t.me/MillionaireHub_support"
      target="_blank"
      rel="noopener noreferrer"
      className="flex w-full items-center gap-3 rounded-2xl border border-fuchsia-300/60 bg-gradient-to-b from-fuchsia-600 to-purple-800 p-4 font-black text-white shadow-[0_4px_0_#4a044e] active:translate-y-0.5"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-sky-300">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true"><path d="M21.7 4.3 18.5 20c-.2 1.1-.9 1.4-1.8.9l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5.1 9.3-8.4c.4-.4-.1-.6-.6-.2L6 13.5l-4.9-1.5c-1.1-.3-1.1-1 .2-1.5L20 3.2c.9-.3 1.9.2 1.7 1.1Z"/></svg>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold text-white">Telegram Support</span>
        <span className="mt-1 block break-all text-xs text-slate-400">@MillionaireHub_support</span>
      </span>
      <span className="text-lg text-sky-300">↗</span>
    </a>

    <a
      href="https://wa.me/918292216726"
      target="_blank"
      rel="noopener noreferrer"
      className="flex w-full items-center gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-300 to-green-700 p-4 font-black text-white shadow-[0_4px_0_#14532d] active:translate-y-0.5"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true"><path d="M20.5 3.5A11.8 11.8 0 0 0 2 17.7L.5 23.5l6-1.6A11.8 11.8 0 0 0 20.5 3.5ZM12 21a9.7 9.7 0 0 1-4.9-1.3l-.4-.2-3.6 1 1-3.5-.2-.4A9.7 9.7 0 1 1 12 21Zm5.3-7.3c-.3-.1-1.6-.8-1.9-.9-.3-.1-.4-.1-.6.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1a7.9 7.9 0 0 1-2.3-1.4 8.6 8.6 0 0 1-1.6-2c-.2-.3 0-.4.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.1c-.2-.5-.5-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.3.3-1 1-1 2.4s1 2.8 1.1 3c.1.2 2 3.1 4.8 4.3 2.4 1 2.9.8 3.4.8.5-.1 1.6-.7 1.8-1.3.2-.6.2-1.1.2-1.3-.1-.2-.3-.3-.5-.4Z"/></svg>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold text-white">WhatsApp Support</span>
        <span className="mt-1 block text-xs text-slate-400">Chat with our support team</span>
      </span>
      <span className="text-lg text-emerald-300">↗</span>
    </a>

    <div className="rounded-2xl border border-yellow-400/25 bg-[#101020] p-4">
      <div className="flex items-center gap-2">
        <img src="/millionaire-hub-logo.svg" alt="" aria-hidden="true" className="h-7 w-7 rounded-full object-contain" />
        <p className="font-bold text-white">Frequently Asked Questions</p>
      </div>
      <p className="mt-2 text-sm text-slate-300">
        For account, deposit, withdrawal or game-related issues, contact us through Telegram or WhatsApp support.
      </p>
    </div>
  </section>
)}

{page === 'Terms & Conditions' && (
  <section className="space-y-3 pb-4">
    <button type="button" onClick={() => setPage('Profile')} className="mh-back rounded-2xl border border-yellow-300/70 bg-gradient-to-b from-[#2a1d12] to-[#120b24] px-4 py-2 text-sm font-black text-yellow-300 shadow-[0_3px_0_#6b4a00] active:translate-y-0.5">‹ Back</button>
    <div className="relative overflow-hidden rounded-3xl border border-yellow-400/40 bg-[linear-gradient(120deg,#3b0764_0%,#6b21a8_40%,#1a0b2e_100%)] p-5">
      <h2 className="text-2xl font-black text-white">📋 Terms &amp; Conditions</h2>
      <p className="mt-1 text-sm font-bold text-fuchsia-200">Rules for using MILLIONAIRE HUB</p>
    </div>
    <div className="space-y-3 text-sm leading-6 text-slate-300">
      {[
        ['1. Use of the App', 'Users must follow the applicable rules and instructions of MILLIONAIRE HUB.'],
        ['2. Account Responsibility', 'Keep your account credentials private and report unauthorized access.'],
        ['3. Virtual Points', "Virtual points are displayed according to the app's account records. Their use is subject to the applicable game rules."],
        ['4. Fair Use', 'Do not exploit bugs, manipulate results, or interfere with other users.'],
        ['5. Updates', 'Applicable terms may be updated. Review this page for the latest version.'],
      ].map(([title, body]) => (
        <div key={title} className="rounded-2xl border border-yellow-400/20 bg-gradient-to-b from-[#1a1430] to-[#0b0b18] p-4 shadow-[0_3px_0_#3b0764]">
          <h3 className="font-black text-yellow-300">{title}</h3>
          <p className="mt-1 font-bold">{body}</p>
        </div>
      ))}
    </div>
  </section>
)}











        </main>

<nav className="fixed bottom-0 left-0 z-20 grid w-full grid-cols-5 border-t border-yellow-400/30 bg-[linear-gradient(180deg,#1c1433_0%,#080817_100%)]">
  {['Home', 'Results', 'XpinR', 'Rewards', 'Profile'].map((name) => (
    <button
      key={name}
      onClick={() => {
        if (name === 'XpinR' && !isAuthenticated) {
          setPage('Login')
          return
        }
        setPage(name)
      }}
      className={`mh-nav m-1 flex flex-col items-center justify-center gap-1 rounded-2xl py-2 text-xs font-black ${
        name === 'XpinR' ? 'mh-nav-xpinr' : ''
      } ${
        page === name
          ? 'is-on border border-yellow-200 bg-gradient-to-b from-yellow-300 to-amber-500 text-black shadow-[0_3px_0_#92400e]'
          : 'text-slate-400'
      }`}
      style={{ animationDelay: name === 'Results' ? '-1.5s' : name === 'XpinR' ? '-3s' : undefined }}
    >
      <span
        className={
          name === 'XpinR'
            ? 'mh-xpinr-orb'
            : 'text-xl'
        }
      >
        {name === 'XpinR' ? '🎡' : <NavIcon name={name} />}
      </span>
      {name === 'XpinR' ? 'XpinR' : name}
    </button>
  ))}
</nav>
      </div>

      {/* WIN / LOST result popup */}
      {resultPopup && (
        <div
          className={`mh-result-overlay fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 ${won ? 'is-win' : isRefunded ? 'is-refund' : 'is-lose'}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="result-popup-title"
        >
          <div
            className={`mh-result-card relative my-auto w-full max-w-md overflow-hidden rounded-3xl border p-5 shadow-2xl ${
              won
                ? 'border-yellow-300/80 bg-gradient-to-b from-emerald-900 via-[#06241c] to-[#030c0a]'
                : isRefunded
                  ? 'border-amber-500 bg-gradient-to-b from-amber-950 via-[#211707] to-[#0d0903]'
                  : 'border-red-600 bg-gradient-to-b from-red-950 via-[#210b0d] to-[#0d0506]'
            }`}
          >
            {won && (
              <div className="mh-win-fx" aria-hidden="true">
                <div className="mh-win-rays" />
                {Array.from({ length: 28 }, (_, i) => (
                  <span
                    key={`c-${i}`}
                    className="mh-confetti"
                    style={{
                      '--i': i,
                      '--x': `${((i * 37) % 100)}%`,
                      '--delay': `${(i % 10) * 0.05}s`,
                      '--rot': `${(i * 47) % 360}deg`,
                      '--c': ['#fde68a', '#34d399', '#fbbf24', '#a7f3d0', '#f472b6', '#60a5fa'][i % 6],
                    }}
                  />
                ))}
                {Array.from({ length: 10 }, (_, i) => (
                  <span
                    key={`coin-${i}`}
                    className="mh-win-coin"
                    style={{
                      '--i': i,
                      '--x': `${8 + ((i * 9) % 84)}%`,
                      '--delay': `${0.12 + i * 0.08}s`,
                    }}
                  >
                    🪙
                  </span>
                ))}
              </div>
            )}

            <button
              onClick={() => setResultPopup(null)}
              aria-label="Close result popup"
              className="absolute right-4 top-3 z-10 p-2 text-2xl text-slate-300 hover:text-white"
            >
              ×
            </button>

            <div className="relative z-[1] pt-3 text-center">
              <div
                className={`mh-result-badge mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 text-5xl shadow-lg ${
                  won
                    ? 'is-win border-yellow-300 bg-emerald-600 text-yellow-100 shadow-yellow-400/40'
                    : isRefunded
                      ? 'border-amber-300 bg-amber-700 text-white shadow-amber-500/30'
                      : 'border-red-400 bg-red-700 text-white shadow-red-500/30'
                }`}
              >
                {won ? '🏆' : isRefunded ? '↩️' : '✕'}
              </div>

              <h2
                id="result-popup-title"
                className={`mh-result-title mt-4 text-3xl font-black tracking-wide ${
                  won
                    ? 'is-win text-yellow-300'
                    : isRefunded
                      ? 'text-amber-300'
                      : 'text-white'
                }`}
              >
                {won ? 'YOU WON!' : isRefunded ? 'BET REFUNDED' : 'YOU LOST'}
              </h2>

              <div
                className={`mh-result-points mt-4 rounded-xl border px-3 py-3 text-3xl font-black ${
                  won
                    ? 'is-win border-yellow-300/70 bg-emerald-950/80 text-yellow-200'
                    : isRefunded
                      ? 'border-amber-500 bg-amber-950/60 text-amber-300'
                      : 'border-red-500 bg-red-950/60 text-[#f5e6c8]'
                }`}
              >
                {won || isRefunded ? '+' : '-'}
                {Number(won ? resultPopup.pointsPayout ?? 0 : resultPopup.amount ?? 0).toLocaleString('en-IN')}
                <span className="ml-2 text-lg">Points</span>
              </div>
              {isRefunded && (
                <p className="mt-3 rounded-xl border border-amber-500/40 bg-amber-950/40 p-3 text-sm text-amber-200">
                  This round was cancelled. Your bet points were returned to your wallet.
                </p>
              )}

              <div className="mt-4 space-y-3 rounded-xl border border-white/10 bg-black/30 p-4 text-left">
                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-slate-400">Your Bet</span>
                  <span className={`font-bold ${colorTextClass(resultPopup.color)}`}>
                    {resultPopup.color}
                  </span>
                </div>
                {!isRefunded && resultPopup.resultColor && (
                  <div className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-3 shadow-lg ${
                    won
                      ? 'mh-win-color-row border-yellow-300/50 bg-emerald-950/50 shadow-yellow-500/10'
                      : 'border-emerald-500/70 bg-emerald-950/40 shadow-emerald-500/10'
                  }`}
                  >
                    <span className="font-bold text-white">
                      🏆 Winning Color
                    </span>
                    <span className={`flex items-center gap-2 font-black ${colorTextClass(resultPopup.resultColor)}`}>
                      <span className={`h-3 w-3 rounded-full ${
                        resultPopup.resultColor === 'RED'
                          ? 'bg-red-500'
                          : resultPopup.resultColor === 'GREEN'
                            ? 'bg-emerald-500'
                            : 'bg-blue-500'
                      }`}
                      />
                      {resultPopup.resultColor}
                    </span>
                  </div>
                )}

                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-slate-400">Bet Amount</span>
                  <span className="font-bold">
                    {Number(resultPopup.amount ?? 0).toLocaleString('en-IN')} Points
                  </span>
                </div>

                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-slate-400">Bet Status</span>
                  <span className={`font-bold ${
                    won
                      ? 'text-emerald-300'
                      : isRefunded
                        ? 'text-amber-300'
                        : 'text-red-300'
                  }`}
                  >
                    {resultPopup.status}
                  </span>
                </div>

                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-slate-400">
                    {isRefunded ? 'Refunded Amount' : 'Payout'}
                  </span>
                  <span className={`font-bold ${won ? 'text-yellow-300' : ''}`}>
                    {Number(resultPopup.pointsPayout ?? 0).toLocaleString('en-IN')} Points
                  </span>
                </div>

                <div className="break-all border-t border-white/10 pt-3 text-xs text-slate-400">
                  Period: {resultPopup.periodNumber}
                </div>
              </div>

              <div className={`mt-4 flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 p-3 text-left ${won ? 'mh-win-balance' : ''}`}>
                <span className={`text-3xl ${won ? 'mh-win-balance-coin' : ''}`}>🪙</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-400">Updated Balance</p>
                  <p className={`mt-1 break-words text-xl font-black text-yellow-300 ${won ? 'mh-win-balance-value' : ''}`}>
                    {Number(resultPopup.updatedBalance ?? 0).toLocaleString('en-IN')} Points
                  </p>
                </div>
                <span className={`text-2xl ${
                  won
                    ? 'text-emerald-400'
                    : isRefunded
                      ? 'text-amber-400'
                      : 'text-red-400'
                }`}
                >
                  {won || isRefunded ? '↑' : '↓'}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  onClick={() => setResultPopup(null)}
                  className="rounded-2xl border border-yellow-400/25 bg-gradient-to-b from-[#1a1430] to-[#0b0b18] px-3 py-3 font-black text-white shadow-[0_3px_0_#3b0764]"
                >
                  Close
                </button>

                <button
                  onClick={() => {
                    setResultPopup(null)
                    setPage('Results')
                    loadMyBets()
                  }}
                  className="rounded-2xl border border-yellow-200 bg-gradient-to-b from-yellow-300 to-amber-500 px-3 py-3 font-black text-black shadow-[0_4px_0_#92400e]"
                >
                  View Results
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function App() {
  if (window.location.pathname === '/admin') {
    return <AdminDashboard />
  }
  if (window.location.pathname === '/approval-agent') {
    return <AgentDesk panel="approval" />
  }
  if (window.location.pathname === '/withdraw-agent') {
    return <AgentDesk panel="withdraw" />
  }
  if (window.location.pathname === '/referral-agent') {
    return <ReferralAgentPanel />
  }

  return <GameApp />
}

export default App
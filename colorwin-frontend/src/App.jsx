import { useState, useEffect, useCallback, useRef } from 'react'
import Auth from './Auth.jsx'
import AdminDashboard from './admin/AdminDashboard.jsx'
import AgentDesk from './agent/AgentDesk.jsx'
import AddFunds from './AddFunds.jsx'
import TransactionHistory from './TransactionHistory.jsx'
import LeaderboardBoard from './LeaderboardBoard.jsx'
import { API } from './api.js'

const colors = [
  { name: 'RED', value: 'RED', gem: 'from-red-300 via-red-500 to-red-900', glow: 'shadow-[0_10px_28px_rgba(239,68,68,0.45)]' },
  { name: 'GREEN', value: 'GREEN', gem: 'from-emerald-200 via-emerald-500 to-emerald-900', glow: 'shadow-[0_10px_28px_rgba(16,185,129,0.45)]' },
  { name: 'BLUE', value: 'BLUE', gem: 'from-sky-200 via-blue-500 to-blue-900', glow: 'shadow-[0_10px_28px_rgba(59,130,246,0.45)]' },
]

const amounts = [10, 20, 30, 40, 50, 100, 1000, 10000]
const DEFAULT_AVATAR = '/millionaire-hub-logo.svg'

function AccountRibbon({ name }) {
  const label = (name && String(name).trim()) || 'Guest'
  return (
    <span className="pointer-events-none absolute bottom-2 right-2 z-20 max-w-[72%] truncate rounded-full border border-yellow-300/80 bg-gradient-to-r from-amber-100 via-yellow-300 to-amber-400 px-3 py-1 font-serif text-[17px] italic tracking-wide text-amber-950 shadow-[0_0_12px_rgba(250,204,21,0.5)]">
      Welcome, {label}
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
          throw new Error('Login session nahi mila. Dobara login karein.')
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
            `Referral stats load nahi hue (HTTP ${response.status}).`
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
            error.message || 'Referral stats load nahi ho sake.'
          )
        }
      } finally {
        if (!cancelled) {
          setStatsLoading(false)
        }
      }
    }

    loadReferralStats()

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
      setShareMessage('Copy nahi hua. Link ko manually copy karein.')
    }
  }

  async function shareReferral() {
    const text =
      `MILLIONAIRE HUB join karein! Mere referral link se signup karein: ${referralLink}`

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
      setShareMessage('Referral link copy ho gaya. Ab share kar sakte hain.')
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
        {referralSettingsError && <p className="mt-2 text-sm text-red-400">Referral settings load nahi hui.</p>}
        {referralSettings && !referralSettings.enabled && <p className="mt-2 text-sm text-yellow-400">Referral program is currently disabled.</p>}
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
  const [amount, setAmount] = useState(50)
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
const currentPendingBet =
  myBets.find(
    (bet) => String(bet.betId) === String(pendingBetId)
  ) ||
  myBets.find((bet) => bet.status === 'PENDING') ||
  null

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
    setNotificationError('Notifications load nahi ho sake.')
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
    setNotificationError('Please wait for Notifications? load nahi ho sake.')
    
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
    setNotificationError('Notifications load nahi ho sake.')
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
    setNotificationError('Notification update nahi ho saka.')
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
    setNotificationError('Notifications update nahi ho sake.')
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
  }, 30000)

  return () => clearInterval(interval)
}, [isAuthenticated, loadUnreadCount])
// Load notifications when Notifications page opens
useEffect(() => {
  if (page === 'Notifications' && isAuthenticated) {
    loadAllNotifications(0)
  }
}, [page, isAuthenticated, loadAllNotifications])

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
      setApiError('Game server se connection nahi ho raha.')
      console.error('Game API error:', error)
    }
  }, [])

  useEffect(() => {
    loadGameData()

    const interval = setInterval(loadGameData, 3000)

    return () => clearInterval(interval)
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
      setBetMessage('Bet place karne ke liye pehle login karo.')
      setBetError(true)
      setPage('Login')
      return
    }

    if (!selectedColor) {
      setBetMessage('Pehle ek color select karo.')
      setBetError(true)
      return
    }

    if (!currentRound?.periodNumber || currentRound.status !== 'OPEN') {
      setBetMessage('Abhi koi open round available nahi hai.')
      setBetError(true)
      return
    }

    if (secondsLeft <= 0) {
      setBetMessage('Round ka time khatam ho gaya. Agle round ka wait karo.')
      setBetError(true)
      return
    }

    const parsedAmount = Number(amount)
    if (!Number.isInteger(parsedAmount) || parsedAmount <= 5) {
      setBetMessage('Please enter above 5')
      setBetError(true)
      return
    }

    if (Number(amount) > (currentUser?.virtualPoints ?? 0)) {
      setBetMessage('Tumhare paas itne virtual points nahi hain.')
      setBetError(true)
      return
    }

    if (pendingBetId != null) {
      setBetMessage('Pichhli bet ka result aane ka wait karo.')
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
          amount: Number(amount),
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
      setSelectedColor('')
      setPendingBetId(data.betId)

      await Promise.all([
        loadUserProfile(),
        loadMyBets(),
      ])
    } catch (error) {
      setBetMessage(error.message || 'Bet place nahi ho saki.')
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
  }

  const showAnger = pendingBetId != null && !resultPopup
  const won = resultPopup?.status === 'WON'
  const isRefunded = resultPopup?.status === 'REFUNDED'
  const popupColor = won ? 'emerald' : 'red'

  return (
    <div className="min-h-screen bg-[#03030c] text-white">
      <div className="mx-auto min-h-screen w-full border-x border-purple-950 pb-24">
       
<header className="sticky top-0 isolate z-40 flex items-center justify-between gap-2 border-b border-yellow-400/30 bg-[linear-gradient(180deg,#1c1433_0%,#080817_100%)] px-2 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.45)] sm:px-3 sm:py-2.5">
  <button
    type="button"
    onClick={() => setPage('Home')}
    className="flex min-w-0 items-center gap-2 rounded-2xl border border-yellow-300/70 bg-gradient-to-b from-[#2a1d12] to-[#120b24] px-2 py-1.5 shadow-[0_4px_0_#6b4a00,0_0_18px_rgba(250,204,21,0.28)] active:translate-y-0.5 active:shadow-[0_2px_0_#6b4a00]"
  >
    <img
      src="/millionaire-hub-logo.svg"
      alt=""
      className="h-10 w-10 shrink-0 rounded-full object-contain ring-2 ring-yellow-300 sm:h-11 sm:w-11"
    />
    <h1 className="min-w-0 text-left text-[13px] font-black leading-tight tracking-wide text-yellow-300 sm:text-lg">
      MILLIONAIRE<br className="sm:hidden" />{' '}
      <span className={`mh-hub${hubBlink ? ' is-blinking' : ''}`}>HUB</span>
    </h1>
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


        <main key={page} className="mh-rise mx-auto w-full max-w-5xl space-y-2 p-2 pb-4">
          {page === 'Login' && <Auth onLogin={handleLogin} />}

          {page === 'Home' && (
            <>
<section className="relative overflow-hidden rounded-3xl border border-yellow-400/35 bg-[linear-gradient(120deg,#3b0764_0%,#6b21a8_28%,#9d174d_58%,#1a0b2e_100%)] px-4 py-4 pb-8 shadow-[0_18px_40px_rgba(88,28,135,0.45)] sm:px-5 sm:py-5 sm:pb-8">
                <div className="mh-orb pointer-events-none absolute -left-10 -top-16 h-40 w-40 rounded-full bg-yellow-400/25 blur-3xl" />
                <div className="mh-orb mh-orb-late pointer-events-none absolute -right-8 bottom-[-30px] h-36 w-36 rounded-full bg-fuchsia-500/35 blur-3xl" />
                <div className="mh-sheen pointer-events-none absolute inset-y-0 left-0" />
                <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-yellow-200/80 to-transparent" />
                <div className="relative z-10 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="relative h-[168px] overflow-hidden sm:h-[176px]">
                      {HERO_SLIDES.map((slide, index) => (
                        <div
                          key={slide.title}
                          className={`absolute inset-0 transition-[opacity,transform] duration-500 ease-out ${index === heroSlide ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-1 opacity-0'}`}
                          aria-hidden={index !== heroSlide}
                        >
                          <p className="truncate text-[10px] font-black uppercase tracking-[0.28em] text-yellow-300 sm:text-xs">
                            {slide.kicker}
                          </p>
                          <h2 className="mt-1 line-clamp-2 min-h-[3.6rem] bg-gradient-to-r from-white via-yellow-100 to-fuchsia-200 bg-clip-text text-2xl font-black leading-tight text-transparent sm:min-h-[4.5rem] sm:text-3xl">
                            {slide.title}
                          </h2>
                          <p className="mt-1.5 line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-snug text-fuchsia-200">
                            {slide.line}
                          </p>
                          <p className="mt-2 inline-flex max-w-full truncate rounded-full border border-yellow-400/40 bg-black/25 px-3 py-1 text-[10px] font-bold text-yellow-200 sm:text-xs">
                            {slide.chip}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex gap-1.5">
                      {HERO_SLIDES.map((_, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setHeroSlide(index)}
                          className={`h-1.5 rounded-full ${index === heroSlide ? 'w-6 bg-yellow-300' : 'w-1.5 bg-white/30'}`}
                          aria-label={`Slide ${index + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="relative shrink-0 pt-1">
                    <span className="absolute inset-0 rounded-full bg-yellow-400/40 blur-xl" />
                    <img src="/millionaire-hub-logo.svg" alt="Millionaire Hub" className="mh-logo-glow relative h-[72px] w-[72px] rounded-full object-contain ring-2 ring-yellow-300/80 sm:h-28 sm:w-28" />
                  </div>
                </div>
                <AccountRibbon name={currentUser?.displayName || currentUser?.username} />
              </section>

              {apiError && (
                <div className="rounded-lg border border-red-700 bg-red-950/40 p-3 text-sm text-red-300">
                  {apiError} Check that the backend is running.
                </div>
              )}

              <section className="grid grid-cols-3 gap-2 text-center">
                <div className="min-w-0 rounded-2xl border border-yellow-400/20 bg-[#101020] p-2 shadow-[inset_0_0_18px_rgba(250,204,21,0.06)]">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400">Current Period</p>
                  <p className="mt-2 break-all text-[11px] font-bold text-white">
                    {currentRound?.periodNumber ?? 'Loading...'}
                  </p>
                </div>
                <div className={`relative overflow-hidden rounded-2xl border p-2 ${
                  secondsLeft > 0 && secondsLeft <= 10
                    ? 'border-amber-300/70 bg-[#2a1520] shadow-[0_0_24px_rgba(251,191,36,0.28)]'
                    : 'border-fuchsia-400/45 bg-[#1a102d] shadow-[0_0_22px_rgba(232,121,249,0.28)]'
                }`}>
                  <span className="pointer-events-none absolute inset-x-4 top-0 h-6 rounded-full bg-white/10 blur-md" />
                  <p className="relative text-[10px] uppercase tracking-widest text-slate-400">Time Left</p>
                  <p className={`relative mt-1 text-2xl font-black tabular-nums ${
                    secondsLeft > 0 && secondsLeft <= 10 ? 'mh-urgent text-amber-300' : 'text-fuchsia-300'
                  }`}>
                    {formatTime(secondsLeft)}
                  </p>
                </div>
                <div className="min-w-0 rounded-2xl border border-emerald-400/25 bg-[#101020] p-2">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400">Round Status</p>
                  <p className="mt-2 text-sm font-black text-emerald-400">
                    {currentRound?.status ?? 'Loading...'}
                  </p>
                </div>
              </section>

              <section>
                <h3 className="mb-2 text-sm font-black tracking-wide text-white">Select Your Color</h3>
                <div className="grid grid-cols-3 gap-2">
                  {colors.map((color) => {
                    const on = selectedColor === color.value
                    return (
                      <button
                        key={color.value}
                        onClick={() => setSelectedColor(color.value)}
                        className={`mh-gem mh-gem-${color.value.toLowerCase()} ${on ? 'is-on' : ''} relative overflow-hidden rounded-2xl border p-3 text-center font-black text-white transition-transform duration-200 ${
                          on
                            ? '-translate-y-1 border-yellow-300 ring-2 ring-yellow-300/80'
                            : 'border-white/15'
                        } bg-gradient-to-b ${color.gem}`}
                      >
                        <span className="mh-gem-sheen" />
                        <span className="pointer-events-none absolute inset-x-3 top-0 h-8 rounded-full bg-white/25 blur-md" />
                        <span className={`mh-gem-orb relative mx-auto mt-1 block h-8 w-8 rounded-full bg-gradient-to-br ${color.gem} ring-2 ${on ? 'ring-yellow-200' : 'ring-white/50'}`} />
                        <span className="relative mt-2 block tracking-wide">{color.name}</span>
                      </button>
                    )
                  })}
                </div>
              </section>

              <section className={`overflow-hidden rounded-2xl p-3 ${showAnger ? 'border border-red-900/80 bg-[radial-gradient(circle_at_top,#3b0a0f_0%,#120608_55%,#050203_100%)]' : 'border border-yellow-400/20 bg-[#0d0d1c]'}`}>
                {showAnger ? (
                  <div key="anger" className="mh-swap-in mh-anger-panel relative overflow-hidden">
                    <div className="mh-anger-fog pointer-events-none absolute inset-0" aria-hidden="true">
                      <span className="mh-anger-emoji e1">😈</span>
                      <span className="mh-anger-emoji e2">💀</span>
                      <span className="mh-anger-emoji e3">🔥</span>
                      <span className="mh-anger-emoji e4">👁️</span>
                      <span className="mh-anger-emoji e5">👹</span>
                      <span className="mh-anger-emoji e6">🩸</span>
                    </div>
                    <div className="relative mb-3 flex items-center justify-between gap-2">
                      <h3 className="font-black tracking-wide text-red-100 drop-shadow-[0_0_10px_rgba(248,113,113,0.45)]">Let it out</h3>
                      <span key={angerCount} className="mh-pop rounded-full border border-red-500/40 bg-red-950/80 px-2 py-0.5 text-sm font-black text-red-300">
                        {angerCount}
                      </span>
                    </div>
                    <button
                      type="button"
                      key={angerHit}
                      onClick={releaseAnger}
                      className="mh-anger relative z-[1] flex h-24 w-full items-center justify-center rounded-2xl border border-red-400/50 bg-gradient-to-b from-[#9f1239] via-[#7f1d1d] to-[#2a0609] px-3 text-center text-lg font-black leading-tight tracking-[0.08em] text-red-50 shadow-[0_4px_0_#2a0508,0_0_24px_rgba(220,38,38,0.35)] active:translate-y-0.5 active:shadow-[0_2px_0_#2a0508]"
                    >
                      {angerLabel}
                    </button>
                    <p className="relative z-[1] mt-2 text-center text-xs font-bold text-red-300/70">
                      Tap until the result lands.
                    </p>
                  </div>
                ) : (
                  <div key="points" className="mh-swap-in">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h3 className="font-black text-white">Virtual Points</h3>
                      <span key={amount} className="mh-pop rounded-full bg-yellow-400/15 px-2 py-0.5 text-sm font-black text-yellow-300">
                        {amount} points
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {amounts.map((value, index) => (
                        <button
                          key={value}
                          onClick={() => setAmount(value)}
                          style={{ animationDelay: `${index * -0.55}s` }}
                          className={`mh-amt rounded-xl border py-2 font-black ${
                            Number(amount) === value
                              ? 'is-on border-yellow-300 bg-fuchsia-600 text-white'
                              : 'border-white/10 bg-slate-900 text-slate-200'
                          }`}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                    <label className="mt-2 block text-xs text-slate-400">
                      Custom amount
                      <input
                        type="number"
                        min="6"
                        step="1"
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                        className="mt-1 w-full rounded-xl border border-purple-900 bg-[#050510] p-2.5 text-white outline-none focus:border-yellow-400"
                      />
                    </label>
                  </div>
                )}
              </section>

              <section className="mh-results relative overflow-hidden rounded-xl border border-purple-900 p-2">
                {currentPendingBet && (
  <section className="rounded-2xl border-2 border-fuchsia-500 bg-gradient-to-br from-[#21102d] to-[#0d0d1c] p-3 shadow-lg shadow-fuchsia-500/20">

    <div className="mb-3 flex items-center justify-between border-b border-purple-800 pb-2">
      <h3 className="text-lg font-black text-white">
        🎯 Your Current Bet
      </h3>

      <span className="rounded-full border border-yellow-500 bg-yellow-500/20 px-3 py-1 text-xs font-black text-yellow-300">
        {currentPendingBet.status}
      </span>
    </div>

    <div className="grid grid-cols-3 divide-x divide-purple-700 text-center">

      <div className="px-1">
        <p className="text-xs text-slate-400">Period</p>
        <p className="mt-2 break-all text-xs font-bold text-white">
          {currentPendingBet.periodNumber}
        </p>
      </div>

      <div className="px-1">
        <p className="text-xs text-slate-400">Selected Color</p>
        <p className="mt-2 font-black text-white">
          <span className={`mr-1 inline-block h-3 w-3 rounded-full ${
            currentPendingBet.color === 'RED'
              ? 'bg-red-500'
              : currentPendingBet.color === 'GREEN'
                ? 'bg-emerald-500'
                : 'bg-blue-500'
          }`} />
          {currentPendingBet.color}
        </p>
      </div>

      <div className="px-1">
        <p className="text-xs text-slate-400">Bet Amount</p>
        <p className="mt-2 font-black text-yellow-300">
          {currentPendingBet.amount} points
        </p>
      </div>

    </div>
  </section>
)}
                <h3 className="font-bold">Recent Results</h3>

                <div className="mt-2 flex flex-wrap gap-2">
                  {results.slice(0, 10).map((result) => (
                    <div
                      key={result.periodNumber}
                      title={`${result.periodNumber}: ${result.resultColor}`}
                      className={`mh-pop flex h-10 w-10 items-center justify-center rounded-full text-sm font-black ${colorBadgeClass(result.resultColor)}`}
                    >
                      {result.resultNumber}
                    </div>
                  ))}

                  {results.length === 0 && (
                    <p className="text-sm text-slate-400">
                      No results available yet.
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

              <button
                onClick={handlePlaceBet}
                disabled={
                  isAuthenticated && (
                    submittingBet ||
                    pendingBetId != null ||
                    !currentRound ||
                    currentRound.status !== 'OPEN' ||
                    secondsLeft <= 0
                  )
                }
                className={`mh-cta w-full rounded-2xl border border-yellow-200 bg-gradient-to-b from-yellow-300 to-amber-500 py-3.5 font-black text-black shadow-[0_4px_0_#92400e,0_0_16px_rgba(250,204,21,0.3)] active:translate-y-0.5 active:shadow-[0_2px_0_#92400e] disabled:cursor-not-allowed disabled:border-slate-600 disabled:bg-slate-700 disabled:from-slate-600 disabled:to-slate-800 disabled:text-slate-300 disabled:shadow-none ${!isAuthenticated ? 'mh-login' : ''}`}
              >
                {submittingBet
                  ? 'PLACING BET...'
                  : pendingBetId != null
                    ? 'WAITING FOR BET RESULT...'
                    : !isAuthenticated
                      ? 'LOGIN TO PLAY'
                      : secondsLeft <= 0 || currentRound?.status !== 'OPEN'
                        ? 'WAIT FOR NEXT ROUND'
                        : `PLAY ${selectedColor || 'SELECT COLOR'} · ${amount} POINTS`}
              </button>

              <LeaderboardBoard />
            </>
          )}
          {page === 'Notifications' && (
            <section className="space-y-3 pb-4">
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
                  <button type="button" onClick={() => setPage('Home')} className="rounded-2xl border border-yellow-300/70 bg-gradient-to-b from-[#2a1d12] to-[#120b24] px-3 py-2 text-sm font-black text-yellow-300 shadow-[0_3px_0_#6b4a00]">
                    Back
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
  <section className="space-y-3 pb-3">
    <div className="relative overflow-hidden rounded-3xl border border-yellow-400/40 bg-[linear-gradient(120deg,#3b0764_0%,#6b21a8_40%,#1a0b2e_100%)] p-5 text-center shadow-[0_12px_32px_rgba(88,28,135,0.4)]">
      <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-yellow-400/20 blur-2xl" />
      <button
        type="button"
        onClick={() => isAuthenticated ? profileFileRef.current?.click() : setPage('Login')}
        className="mx-auto block rounded-full p-[3px] shadow-[0_4px_0_#6b4a00,0_0_28px_rgba(250,204,21,0.45)] active:translate-y-0.5"
        aria-label="Change profile photo"
      >
        <span className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-[#120b24] ring-2 ring-yellow-300">
          <img
            src={currentUser?.profileImage || DEFAULT_AVATAR}
            alt=""
            className={currentUser?.profileImage ? 'h-full w-full object-cover' : 'h-[72%] w-[72%] object-contain'}
          />
        </span>
      </button>
      <input
        ref={profileFileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onProfilePhotoPicked}
      />
      <p className="mt-2 text-xs font-bold text-fuchsia-200">Tap the circle to set your photo</p>
      <p className="mt-2 text-[11px] font-black tracking-[0.28em] text-yellow-300">MILLIONAIRE HUB</p>
      {isAuthenticated ? (
        <div className="mt-3 text-left">
          <label className="text-[11px] font-black uppercase tracking-[0.16em] text-yellow-200/80">Name</label>
          <div className="mt-1 flex gap-2">
            <input
              value={profileName}
              maxLength={40}
              onChange={(event) => setProfileName(event.target.value)}
              className="min-w-0 flex-1 rounded-2xl border border-yellow-400/30 bg-black/30 px-3 py-2 text-lg font-black text-white outline-none focus:border-yellow-300"
            />
            <button
              type="button"
              disabled={profileBusy}
              onClick={() => saveProfile({ displayName: profileName })}
              className="rounded-2xl border border-yellow-200 bg-gradient-to-b from-yellow-300 to-amber-500 px-4 py-2 text-sm font-black text-black shadow-[0_4px_0_#92400e] active:translate-y-0.5 active:shadow-[0_2px_0_#92400e] disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <h2 className="mt-1 text-2xl font-black tracking-wide text-white">Guest user</h2>
      )}
      {profileNotice && <p className="mt-2 text-sm text-yellow-200">{profileNotice}</p>}

      <button
        type="button"
        onClick={() => setPage(isAuthenticated ? 'Wallet' : 'Login')}
        className="mt-4 w-full rounded-2xl border border-yellow-300/70 bg-gradient-to-b from-[#2a1d12] to-[#101020] px-4 py-3 text-left shadow-[0_4px_0_#6b4a00] active:translate-y-0.5 active:shadow-[0_2px_0_#6b4a00]"
      >
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-yellow-200/80">Virtual Points</p>
        <p className="mt-1 text-3xl font-black text-yellow-300">
          {(currentUser?.virtualPoints ?? 0).toLocaleString('en-IN')}
          <span className="ml-1 text-sm font-semibold text-yellow-500/80">pts</span>
        </p>
      </button>

      <div className="mt-4 divide-y divide-yellow-400/15 overflow-hidden rounded-2xl border border-yellow-400/25 bg-[#0b0b19]/80 text-left">
        <div className="px-4 py-3">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Email ID</p>
          <p className="mt-1 break-all font-bold text-white">{currentUser?.email || 'Not available'}</p>
        </div>
        <div className="px-4 py-3">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Phone Number</p>
          <p className="mt-1 font-bold text-white">{currentUser?.phoneNumber || currentUser?.phone || 'Not available'}</p>
        </div>
      </div>
    </div>

    <button
      type="button"
      onClick={() => isAuthenticated ? setPage('Add Funds') : setPage('Login')}
      className="flex w-full items-center gap-4 rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-300 to-green-700 p-4 text-left font-black text-white shadow-[0_4px_0_#14532d,0_0_14px_rgba(16,185,129,0.3)] active:translate-y-0.5 active:shadow-[0_2px_0_#14532d]"
    >
      <span className="text-2xl">💰</span>
      <span className="flex-1">
        <span className="block">Add Funds</span>
        <span className="text-sm font-bold text-emerald-100">Pay by UPI. 1 rupee = 1 coin</span>
      </span>
    </button>

    <button
      type="button"
      onClick={() => isAuthenticated ? setPage('Transaction History') : setPage('Login')}
      className="flex w-full items-center gap-4 rounded-2xl border border-yellow-300/70 bg-gradient-to-b from-[#2a1d12] to-[#120b24] p-4 text-left shadow-[0_4px_0_#6b4a00] active:translate-y-0.5 active:shadow-[0_2px_0_#6b4a00]"
    >
      <span className="text-2xl">📜</span>
      <span className="flex-1">
        <span className="block font-black text-white">Transaction History</span>
        <span className="text-sm font-bold text-yellow-100/70">Deposits, withdrawals, and game coins</span>
      </span>
    </button>

    <button
      type="button"
      onClick={() => window.open('https://t.me/millionairehub_group', '_blank', 'noopener,noreferrer')}
      className="flex w-full items-center gap-4 rounded-2xl border border-fuchsia-300/60 bg-gradient-to-b from-fuchsia-600 to-purple-800 p-4 text-left font-black text-white shadow-[0_4px_0_#4a044e] active:translate-y-0.5 active:shadow-[0_2px_0_#4a044e]"
    >
      <span className="text-2xl">💬</span>
      <span className="flex-1">
        <span className="block">Help &amp; Support</span>
        <span className="text-sm font-bold text-fuchsia-100">Get help and contact us</span>
      </span>
    </button>

    <button
      type="button"
      onClick={() => setPage('Terms & Conditions')}
      className="flex w-full items-center gap-4 rounded-2xl border border-yellow-400/25 bg-gradient-to-b from-[#1a1430] to-[#0b0b18] p-4 text-left shadow-[0_4px_0_#3b0764] active:translate-y-0.5 active:shadow-[0_2px_0_#3b0764]"
    >
      <span className="text-2xl">📋</span>
      <span className="flex-1">
        <span className="block font-black text-white">Terms &amp; Conditions</span>
        <span className="text-sm font-bold text-slate-400">Read rules and conditions</span>
      </span>
    </button>

    {isAuthenticated && (
      <button
        type="button"
        onClick={handleLogout}
        className="w-full rounded-2xl border border-red-900/60 bg-gradient-to-b from-[#3a1518] to-[#1a0a0c] py-3.5 font-black text-red-300/80 shadow-[0_4px_0_#450a0a] active:translate-y-0.5 active:shadow-[0_2px_0_#450a0a]"
      >
        🔻 Logout
      </button>
    )}
  </section>
)}






{page === 'Help & Support' && (
  <section className="space-y-3 pb-4">
    <button type="button" onClick={() => setPage('Profile')} className="rounded-2xl border border-yellow-300/70 bg-gradient-to-b from-[#2a1d12] to-[#120b24] px-4 py-2 text-sm font-black text-yellow-300 shadow-[0_3px_0_#6b4a00] active:translate-y-0.5">‹ Back</button>
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
    <button type="button" onClick={() => setPage('Profile')} className="rounded-2xl border border-yellow-300/70 bg-gradient-to-b from-[#2a1d12] to-[#120b24] px-4 py-2 text-sm font-black text-yellow-300 shadow-[0_3px_0_#6b4a00] active:translate-y-0.5">‹ Back</button>
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
  {['Home', 'Results', 'Wallet', 'Rewards', 'Profile'].map((name) => (
    <button
      key={name}
      onClick={() => setPage(name)}
      className={`mh-nav m-1 flex flex-col items-center justify-center gap-1 rounded-2xl py-2 text-xs font-black ${
        page === name
          ? 'is-on border border-yellow-200 bg-gradient-to-b from-yellow-300 to-amber-500 text-black shadow-[0_3px_0_#92400e]'
          : 'text-slate-400'
      }`}
      style={{ animationDelay: name === 'Results' ? '-1.5s' : name === 'Wallet' ? '-3s' : undefined }}
    >
      <span
        className={
          name === 'Wallet'
            ? 'mh-wallet -mt-5 flex h-12 w-12 items-center justify-center rounded-full border-2 border-purple-400 bg-purple-700 text-[2.35rem] font-black leading-none text-white'
            : 'text-xl'
        }
      >
        {name === 'Wallet' ? <span className="mh-dollar-roll">$</span> : <NavIcon name={name} />}
      </span>
      {name}
    </button>
  ))}
</nav>
      </div>

      {/* WIN / LOST result popup */}
      {resultPopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-3 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="result-popup-title"
        >
          <div
            className={`relative my-auto w-full max-w-md overflow-hidden rounded-3xl border ${
              won
  ? 'border-emerald-500 bg-gradient-to-b from-emerald-950 via-[#061a16] to-[#030c0a]'
  : isRefunded
    ? 'border-amber-500 bg-gradient-to-b from-amber-950 via-[#211707] to-[#0d0903]'
    : 'border-red-600 bg-gradient-to-b from-red-950 via-[#210b0d] to-[#0d0506]'
            } p-5 shadow-2xl`}
          >
            <button
              onClick={() => setResultPopup(null)}
              aria-label="Close result popup"
              className="absolute right-4 top-3 z-10 p-2 text-2xl text-slate-300 hover:text-white"
            >
              ×
            </button>

            <div className="pt-3 text-center">
              <div
                className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 text-5xl shadow-lg ${
                  won
  ? 'border-yellow-300 bg-emerald-700 text-yellow-200 shadow-emerald-500/30'
  : isRefunded
    ? 'border-amber-300 bg-amber-700 text-white shadow-amber-500/30'
    : 'border-red-400 bg-red-700 text-white shadow-red-500/30'
                }`}
              >
                {won ? '🏆' : isRefunded ? '↩️' : '✕'}
              </div>

              <h2
                id="result-popup-title"
                className={`mt-4 text-3xl font-black tracking-wide ${
                  won
  ? 'text-yellow-300'
  : isRefunded
    ? 'text-amber-300'
    : 'text-red-300'
                }`}
              >
                {won ? 'YOU WON!' : isRefunded ? 'BET REFUNDED' : 'YOU LOST'}
              </h2>

              <div
                className={`mt-4 rounded-xl border px-3 py-3 text-3xl font-black ${
                  won
  ? 'border-emerald-500 bg-emerald-950/70 text-emerald-300'
  : isRefunded
    ? 'border-amber-500 bg-amber-950/60 text-amber-300'
    : 'border-red-500 bg-red-950/60 text-red-300'
                }`}
              >
                {won || isRefunded ? '+' : '-'}
                {Number(won ? resultPopup.pointsPayout ?? 0 : resultPopup.amount ?? 0).toLocaleString('en-IN')}
                <span className="ml-2 text-lg">Points</span>
              </div>
              {isRefunded && (
  <p className="mt-3 rounded-xl border border-amber-500/40 bg-amber-950/40 p-3 text-sm text-amber-200">
    Round cancel ho gaya. Aapki bet ke points wallet mein wapas kar diye gaye hain.
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
  <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/70 bg-emerald-950/40 px-3 py-3 shadow-lg shadow-emerald-500/10">
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
      }`} />
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
}`}>
                    {resultPopup.status}
                  </span>
                </div>

                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-slate-400">
  {isRefunded ? 'Refunded Amount' : 'Payout'}
</span>
                  <span className="font-bold">
                    {Number(resultPopup.pointsPayout ?? 0).toLocaleString('en-IN')} Points
                  </span>
                </div>

                <div className="break-all border-t border-white/10 pt-3 text-xs text-slate-400">
                  Period: {resultPopup.periodNumber}
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 p-3 text-left">
                <span className="text-3xl">🪙</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-400">Updated Balance</p>
                  <p className="mt-1 break-words text-xl font-black text-yellow-300">
                    {Number(resultPopup.updatedBalance ?? 0).toLocaleString('en-IN')} Points
                  </p>
                </div>
                <span className={`text-2xl ${
  won
    ? 'text-emerald-400'
    : isRefunded
      ? 'text-amber-400'
      : 'text-red-400'
}`}>
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

  return <GameApp />
}

export default App
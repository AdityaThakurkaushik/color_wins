import { useState, useEffect, useCallback } from 'react'
import Auth from './Auth.jsx'

const API = 'https://color-wins.onrender.com/api'

const colors = [
  { name: 'RED', value: 'RED', style: 'bg-red-600' },
  { name: 'GREEN', value: 'GREEN', style: 'bg-emerald-600' },
  { name: 'VIOLET', value: 'VIOLET', style: 'bg-purple-600' },
]

const amounts = [10, 50, 100, 500, 1000]




const REFERRAL_CODE = 'ADITYA123'
const REFERRAL_LINK = `https://color-wins.vercel.app/register?ref=${REFERRAL_CODE}`
const REFERRAL_REWARD = 20

function ReferralPage({ currentUser }) {
  const [copied, setCopied] = useState('')
  const [shareMessage, setShareMessage] = useState('')

  const referralCode =
    currentUser?.referralCode || REFERRAL_CODE

 const referralLink =
  `https://color-wins.vercel.app/register?ref=${referralCode}`

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
    const text = `ColorWin join karein! Mere referral link se signup karein: ${referralLink}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join ColorWin',
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

  return (
    <div className="space-y-3 pb-4">
      <section className="overflow-hidden rounded-2xl border border-purple-700 bg-gradient-to-r from-purple-950 via-[#180b38] to-[#080817] p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-purple-300">
          Rewards · Referral
        </p>
        <h2 className="mt-2 text-2xl font-black">
          Invite Friends &amp;
          <span className="block text-yellow-300">Earn Coins</span>
        </h2>
        <p className="mt-2 text-sm text-slate-300">
          Apna referral link share karein aur eligible signup par
          coins earn karein.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-purple-900 bg-[#0d0d1c] p-3">
        <div>
          <label className="mb-1 block text-sm text-slate-300">
            Your Referral Code
          </label>
          <div className="flex gap-2">
            <div className="min-w-0 flex-1 break-all rounded-lg border border-slate-700 bg-[#080817] p-3 font-bold">
              {referralCode}
            </div>
            <button
              onClick={() => copyText(referralCode, 'code')}
              className="rounded-lg bg-purple-600 px-4 font-bold"
            >
              {copied === 'code' ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-300">
            Your Referral Link
          </label>
          <div className="flex gap-2">
            <div className="min-w-0 flex-1 break-all rounded-lg border border-slate-700 bg-[#080817] p-3 text-xs">
              {referralLink}
            </div>
            <button
              onClick={() => copyText(referralLink, 'link')}
              className="rounded-lg bg-purple-600 px-4 font-bold"
            >
              {copied === 'link' ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        <button
          onClick={shareReferral}
          className="w-full rounded-xl bg-gradient-to-r from-purple-700 to-fuchsia-600 p-3 font-bold"
        >
          Share Referral Link
        </button>

        {shareMessage && (
          <p role="status" className="text-sm text-yellow-300">
            {shareMessage}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-yellow-600 bg-gradient-to-br from-[#211333] to-[#0d0d1c] p-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg font-black">Referral Reward</h3>
          <span className="rounded-full bg-purple-800 px-3 py-1 text-xs">
            Per successful referral
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-purple-800 bg-[#101020] p-3">
            <p className="text-sm text-slate-300">You Get</p>
            <p className="mt-1 text-xl font-black text-yellow-300">
              {REFERRAL_REWARD} Coins
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Eligible friend signup par.
            </p>
          </div>

          <div className="rounded-xl border border-purple-800 bg-[#101020] p-3">
            <p className="text-sm text-slate-300">Your Friend Gets</p>
            <p className="mt-1 text-xl font-black text-yellow-300">
              {REFERRAL_REWARD} Coins
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Referral code se eligible signup par.
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Reward amounts are design examples until backend reward
          settings are connected.
        </p>
      </section>

      <section className="rounded-2xl border border-purple-900 bg-[#0d0d1c] p-3">
        <h3 className="text-lg font-black">Your Referral Stats</h3>
        <p className="mt-2 text-sm text-slate-400">
          Referral statistics backend connect hone ke baad yahan dikhenge.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {['Total Referrals', 'Successful', 'Pending', 'Total Earned Coins'].map(
            (label) => (
              <div
                key={label}
                className="rounded-lg border border-slate-800 bg-[#101020] p-3"
              >
                <p className="text-xs text-slate-400">{label}</p>
                <p className="mt-1 text-lg font-bold">—</p>
              </div>
            )
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-purple-900 bg-[#0d0d1c] p-3">
        <h3 className="text-lg font-black">How It Works</h3>
        <ol className="mt-3 space-y-3 text-sm text-slate-300">
          <li>1. Apna referral code ya link share karein.</li>
          <li>2. Friend aapke link se account banaye.</li>
          <li>3. Eligibility verify hone par applicable rewards credit hon.</li>
        </ol>
      </section>
    </div>
  )
}









function App() {
  const [selectedColor, setSelectedColor] = useState('')
  const [amount, setAmount] = useState(50)
  const [page, setPage] = useState('Home')
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

  const [pendingBetId, setPendingBetId] = useState(null)
  const [resultPopup, setResultPopup] = useState(null)

  const [isAuthenticated, setIsAuthenticated] = useState(
    () => Boolean(localStorage.getItem('colorwin_token'))
  )

  const token = () => localStorage.getItem('colorwin_token')

  const authHeaders = () => ({
    Authorization: `Bearer ${token()}`,
  })

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

      setCurrentUser(await response.json())
    } catch (error) {
      console.error('Profile loading failed:', error)
    }
  }, [])

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
    if (page === 'Results' && isAuthenticated) {
      loadMyBets()
    }
  }, [page, isAuthenticated, loadMyBets])

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

        if (!bet || !['WON', 'LOST'].includes(bet.status)) return

        const profileResponse = await fetch(`${API}/user/me`, {
          headers: { Authorization: `Bearer ${savedToken}` },
          cache: 'no-store',
        })

        if (!profileResponse.ok) return

        const profile = await profileResponse.json()

        if (cancelled) return

        setCurrentUser(profile)

        setResultPopup({
          ...bet,
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

    if (!Number.isSafeInteger(Number(amount)) || Number(amount) < 1) {
      setBetMessage('Valid points amount enter karo.')
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
    return 'text-purple-400'
  }

  function colorBadgeClass(color) {
    if (color === 'RED') return 'bg-red-600'
    if (color === 'GREEN') return 'bg-emerald-600'
    return 'bg-purple-600'
  }

  const won = resultPopup?.status === 'WON'
  const popupColor = won ? 'emerald' : 'red'

  return (
    <div className="min-h-screen bg-[#03030c] text-white">
      <div className="mx-auto min-h-screen w-full border-x border-purple-950 pb-24">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-purple-900 bg-[#080817] px-3 py-3">
          <button
            aria-label="Menu"
            onClick={() => setPage('Home')}
            className="text-2xl"
          >
            ☰
          </button>

          <h1 className="text-xl font-black">
            👑 Color<span className="text-fuchsia-400">Win</span>
          </h1>

          <div className="rounded-full border border-yellow-500/50 bg-slate-900 px-3 py-2 text-sm text-yellow-300">
            🪙 {(currentUser?.virtualPoints ?? 0).toLocaleString('en-IN')}
          </div>

          {!isAuthenticated && (
            <button
              onClick={() => setPage('Login')}
              className="rounded-lg bg-purple-600 px-3 py-2 text-sm font-bold"
            >
              Login
            </button>
          )}
        </header>

        <main className="mx-auto w-full max-w-5xl space-y-2 p-2 pb-4">
          {page === 'Login' && <Auth onLogin={handleLogin} />}

          {page === 'Home' && (
            <>
<section className="rounded-2xl border border-purple-700 bg-gradient-to-r from-purple-950 via-fuchsia-950 to-[#080817] px-3 py-2">                <p className="text-xs font-bold uppercase tracking-[0.25em] text-yellow-300">
                  ColorWin presents
                </p>
                <h2 className="mt-1 text-xl font-black">PREDICT COLORSS</h2>
                <p className="text-sm font-bold text-fuchsia-300">FREE-TO-PLAY</p>
                <p className="mt-1 text-xs text-slate-300">
                  Virtual points only · No real-money betting
                </p>
              </section>

              {apiError && (
                <div className="rounded-lg border border-red-700 bg-red-950/40 p-3 text-sm text-red-300">
                  {apiError} Check that the backend is running.
                </div>
              )}

              <section className="grid grid-cols-3 gap-2 text-center">
                <div className="min-w-0 rounded-xl border border-purple-900 bg-[#101020] p-1">
                  <p className="text-xs text-slate-400">Current Period</p>
                  <p className="mt-2 break-all text-xs font-bold">
                    {currentRound?.periodNumber ?? 'Loading...'}
                  </p>
                </div>

                <div className="rounded-xl border border-fuchsia-700 bg-[#151027] p-1.5">
                  <p className="text-xs text-slate-400">Time Left</p>
                  <p className="mt-1 text-xl font-black text-fuchsia-300">
                    {formatTime(secondsLeft)}
                  </p>
                </div>

                <div className="rounded-xl border border-purple-900 bg-[#101020] p-1.5">
                  <p className="text-xs text-slate-400">Round Status</p>
                  <p className="mt-2 text-sm font-bold text-emerald-400">
                    {currentRound?.status ?? 'Loading...'}
                  </p>
                </div>
              </section>

              <section>
                <h3 className="mb-3 font-bold">Select Your Color</h3>
                <div className="grid grid-cols-3 gap-2">
                  {colors.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setSelectedColor(color.value)}
                      className={`${color.style} rounded-xl p-0.5 text-center font-black ${
                        selectedColor === color.value
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-[#03030c]'
                          : 'opacity-90'
                      }`}
                    >
                      <span className="block text-2xl">
                        {color.value === 'RED'
                          ? '🔴'
                          : color.value === 'GREEN'
                            ? '🟢'
                            : '🟣'}
                      </span>
                      <span className="mt-1 block">{color.name}</span>
                      <span className="text-xs">Virtual play</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-xl border border-purple-900 bg-[#0d0d1c] p-1.5">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <h3 className="font-bold">Virtual Points</h3>
                  <span className="text-sm text-yellow-300">
                    {amount} points
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1">
                  {amounts.map((value) => (
                    <button
                      key={value}
                      onClick={() => setAmount(value)}
                      className={`rounded-lg border px-2 py-1 font-bold ${
                        amount === value
                          ? 'border-fuchsia-400 bg-fuchsia-600'
                          : 'border-slate-700 bg-slate-900'
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>

                <label className="mt-1 block text-sm text-slate-300">
                  Custom amount
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={amount}
                    onChange={(event) =>
                      setAmount(Math.max(1, Number(event.target.value) || 1))
                    }
className="mt-1 w-full rounded-lg border border-purple-900 bg-[#050510] p-2 text-white outline-none focus:border-fuchsia-500"                  />
                </label>
              </section>

              <section className="rounded-xl border border-purple-900 bg-[#0d0d1c] p-2">
                <h3 className="font-bold">Recent Results</h3>

                <div className="mt-2 flex flex-wrap gap-2">
                  {results.slice(0, 10).map((result) => (
                    <div
                      key={result.periodNumber}
                      title={`${result.periodNumber}: ${result.resultColor}`}
                      className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-black ${colorBadgeClass(result.resultColor)}`}
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
                  submittingBet ||
                  pendingBetId != null ||
                  !currentRound ||
                  currentRound.status !== 'OPEN' ||
                  secondsLeft <= 0
                }
                className="w-full rounded-xl bg-fuchsia-600 py-2 font-black disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
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

              <p className="text-center text-xs text-slate-500">
                Virtual points only. No deposits, withdrawals, or cash rewards.
              </p>
            </>
          )}

          {page === 'Results' && (
            <section className="space-y-4">
              <h2 className="text-xl font-black">Results &amp; History</h2>

              <h3 className="font-bold">Recent Game Results</h3>

              {results.map((result) => (
                <div
                  key={result.periodNumber}
                  className="grid grid-cols-3 items-center gap-2 rounded-xl border border-purple-900 bg-[#101020] p-3"
                >
                  <div>
                    <p className="text-xs text-slate-400">Period</p>
                    <p className="mt-1 break-all text-xs font-bold">
                      {result.periodNumber}
                    </p>
                  </div>

                  <div className="text-center">
                    <p className="text-xs text-slate-400">Number</p>
                    <p className={`mt-1 text-2xl font-black ${colorTextClass(result.resultColor)}`}>
                      {result.resultNumber}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-slate-400">Color</p>
                    <span className={`mt-1 inline-block rounded-md px-2 py-1 text-xs font-bold ${colorBadgeClass(result.resultColor)}`}>
                      {result.resultColor}
                    </span>
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold">My Bet History</h3>
                <button
                  onClick={loadMyBets}
                  disabled={historyLoading || !isAuthenticated}
                  className="rounded-lg border border-purple-700 px-3 py-2 text-sm disabled:opacity-50"
                >
                  {historyLoading ? 'Loading...' : 'Refresh'}
                </button>
              </div>

              {!isAuthenticated && (
                <p className="text-sm text-slate-400">
                  Login to view your bet history.
                </p>
              )}

              {isAuthenticated && myBets.length === 0 && !historyLoading && (
                <p className="rounded-xl border border-purple-900 p-4 text-sm text-slate-400">
                  No bets found.
                </p>
              )}

              {myBets.map((bet) => (
                <div
                  key={bet.betId}
                  className="rounded-xl border border-purple-900 bg-[#101020] p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`font-bold ${colorTextClass(bet.color)}`}>
                      {bet.color}
                    </span>
                    <span className="text-sm font-bold">{bet.status}</span>
                  </div>

                  <p className="mt-2 break-all text-xs text-slate-400">
                    Period: {bet.periodNumber}
                  </p>

                  <div className="mt-2 flex justify-between text-sm">
                    <span>Stake: {bet.amount} points</span>
                    <span>Payout: {bet.pointsPayout ?? 0} points</span>
                  </div>
                </div>
              ))}
            </section>
          )}

          {page === 'Rewards' && (
  <ReferralPage currentUser={currentUser} />
)}

          {page === 'Profile' && (
            <section className="rounded-xl border border-purple-900 bg-[#0d0d1c] p-4">
              <h2 className="text-xl font-black">Profile</h2>
              <p className="mt-2 text-sm text-slate-400">
                {currentUser?.username || 'Guest user'}
              </p>

              {currentUser?.email && (
                <p className="mt-1 text-sm text-slate-400">
                  {currentUser.email}
                </p>
              )}

              <div className="mt-4 rounded-lg bg-[#101020] p-3">
                <p className="text-sm text-slate-400">
                  Virtual points balance
                </p>
                <p className="mt-1 text-xl font-bold text-yellow-300">
                  {(currentUser?.virtualPoints ?? 0).toLocaleString('en-IN')} points
                </p>
              </div>

              {isAuthenticated && (
                <button
                  onClick={handleLogout}
                  className="mt-5 w-full rounded-xl border border-red-700 bg-red-950/40 py-3 font-bold text-red-300"
                >
                  Logout
                </button>
              )}
            </section>
          )}
        </main>

        <nav className="fixed bottom-0 left-0 z-20 grid w-full grid-cols-4 border-t border-purple-900 bg-[#080817]">
          {[
            ['Home', '⌂'],
            ['Results', '▤'],
            ['Rewards', '♔'],
            ['Profile', '♙'],
          ].map(([name, icon]) => (
            <button
              key={name}
              onClick={() => setPage(name)}
              className={`flex flex-col items-center gap-1 py-3 text-xs ${
                page === name ? 'text-fuchsia-400' : 'text-slate-400'
              }`}
            >
              <span className="text-xl">{icon}</span>
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
                    : 'border-red-400 bg-red-700 text-white shadow-red-500/30'
                }`}
              >
                {won ? '🏆' : '✕'}
              </div>

              <h2
                id="result-popup-title"
                className={`mt-4 text-3xl font-black tracking-wide ${
                  won ? 'text-yellow-300' : 'text-red-300'
                }`}
              >
                {won ? 'YOU WON!' : 'YOU LOST'}
              </h2>

              <div
                className={`mt-4 rounded-xl border px-3 py-3 text-3xl font-black ${
                  won
                    ? 'border-emerald-500 bg-emerald-950/70 text-emerald-300'
                    : 'border-red-500 bg-red-950/60 text-red-300'
                }`}
              >
                {won ? '+' : '-'}
                {Number(won ? resultPopup.pointsPayout ?? 0 : resultPopup.amount ?? 0).toLocaleString('en-IN')}
                <span className="ml-2 text-lg">Points</span>
              </div>

              <div className="mt-4 space-y-3 rounded-xl border border-white/10 bg-black/30 p-4 text-left">
                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-slate-400">Your Bet</span>
                  <span className={`font-bold ${colorTextClass(resultPopup.color)}`}>
                    {resultPopup.color}
                  </span>
                </div>

                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-slate-400">Bet Amount</span>
                  <span className="font-bold">
                    {Number(resultPopup.amount ?? 0).toLocaleString('en-IN')} Points
                  </span>
                </div>

                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-slate-400">Bet Status</span>
                  <span className={`font-bold ${won ? 'text-emerald-300' : 'text-red-300'}`}>
                    {resultPopup.status}
                  </span>
                </div>

                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-slate-400">Payout</span>
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
                <span className={`text-2xl ${won ? 'text-emerald-400' : 'text-red-400'}`}>
                  {won ? '↑' : '↓'}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  onClick={() => setResultPopup(null)}
                  className="rounded-xl border border-slate-600 bg-slate-800 px-3 py-3 font-bold hover:bg-slate-700"
                >
                  Close
                </button>

                <button
                  onClick={() => {
                    setResultPopup(null)
                    setPage('Results')
                    loadMyBets()
                  }}
                  className="rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 px-3 py-3 font-black text-black hover:brightness-110"
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

export default App
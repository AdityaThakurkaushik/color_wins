

import React from 'react'

const API = 'https://color-wins.onrender.com/api'

const menuItems = [
  'Dashboard',
  'Game Management',
  'Rounds & Results',
  'Users',
  'Bets History',
  'Wallet & Transactions',
  'Referral Management',
  'Rewards & Offers',
  'Live Activity Messages',
  'Announcements',
  'Settings',
]

function StatCard({ item }) {
  const colors = {
    purple: 'border-purple-700 bg-purple-950/40',
    gold: 'border-amber-700 bg-amber-950/30',
    green: 'border-emerald-700 bg-emerald-950/30',
    pink: 'border-fuchsia-700 bg-fuchsia-950/30',
  }

  return (
    <div className={`rounded-xl border p-4 ${colors[item.color]}`}>
      <div className="text-2xl">{item.icon}</div>
      <p className="mt-3 text-sm text-slate-400">{item.label}</p>
      <p className="mt-1 break-words text-xl font-bold text-white">
        {item.value}
      </p>
    </div>
  )
}

export default function AdminDashboard() {
  const [activePage, setActivePage] = React.useState('Dashboard')
  const [activeRound, setActiveRound] = React.useState(null)
  const [roundLoading, setRoundLoading] = React.useState(true)
  const [roundError, setRoundError] = React.useState(false)

  const [totalUsers, setTotalUsers] = React.useState(null)
  const [totalVirtualPoints, setTotalVirtualPoints] = React.useState(null)
  const [totalBets, setTotalBets] = React.useState(null)
  const [statsLoading, setStatsLoading] = React.useState(false)
  const [statsError, setStatsError] = React.useState('')
  const [lastUpdated, setLastUpdated] = React.useState(null)

  const [gameState, setGameState] = React.useState(null)
  const [controlLoading, setControlLoading] = React.useState(false)
  const [controlError, setControlError] = React.useState('')
  const [controlMessage, setControlMessage] = React.useState('')
  const [referralSettings, setReferralSettings] = React.useState(null)

const [referralForm, setReferralForm] = React.useState({
  enabled: true,
  referrerReward: '20',
  referredUserReward: '10',
  rewardCondition: 'REGISTRATION',
})

const [referralLoading, setReferralLoading] = React.useState(false)
const [referralSaving, setReferralSaving] = React.useState(false)
const [referralError, setReferralError] = React.useState('')
const [referralMessage, setReferralMessage] = React.useState('')

  const logout = () => {
    localStorage.removeItem('colorwin_token')
    window.location.href = '/'
  }

  const getAuthHeaders = () => {
    const token = localStorage.getItem('colorwin_token')
    return token
      ? { Authorization: `Bearer ${token}` }
      : null
  }

  const loadActiveRound = React.useCallback(async () => {
    setRoundLoading(true)
    setRoundError(false)

    try {
      const response = await fetch(`${API}/game/current`, {
        cache: 'no-store',
      })

      if (response.status === 204) {
        setActiveRound(null)
      } else if (!response.ok) {
        throw new Error(`Round API failed: ${response.status}`)
      } else {
        setActiveRound(await response.json())
      }
    } catch (error) {
      console.error('Unable to load active round:', error)
      setRoundError(true)
    } finally {
      setRoundLoading(false)
    }
  }, [])

  const loadDashboardStats = React.useCallback(async () => {
    setStatsLoading(true)
    setStatsError('')

    const headers = getAuthHeaders()

    if (!headers) {
      setTotalUsers(null)
      setTotalVirtualPoints(null)
      setTotalBets(null)
      setStatsError('Login required. Please sign in again.')
      setStatsLoading(false)
      return
    }

    try {
      const endpoints = [
        { key: 'users', url: `${API}/admin/stats/users` },
        { key: 'points', url: `${API}/admin/stats/virtual-points` },
        { key: 'bets', url: `${API}/admin/stats/bets` },
      ]

      const responses = await Promise.all(
        endpoints.map(async (endpoint) => {
          const response = await fetch(endpoint.url, {
            headers,
            cache: 'no-store',
          })

          if (!response.ok) {
            throw new Error(
              `${endpoint.key} API failed: ${response.status}`,
            )
          }

          return [endpoint.key, await response.json()]
        }),
      )

      const values = Object.fromEntries(responses)

      setTotalUsers(Number(values.users.totalUsers))
      setTotalVirtualPoints(Number(values.points.totalVirtualPoints))
      setTotalBets(Number(values.bets.totalBets))
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Dashboard stats API error:', error)

      if (error.message.includes('401')) {
        setStatsError(
          '401: Login token invalid or expired. Please sign in again.',
        )
      } else if (error.message.includes('403')) {
        setStatsError(
          '403: Admin access required. Check your ADMIN role.',
        )
      } else {
        setStatsError(`Statistics could not load. ${error.message}`)
      }
    } finally {
      setStatsLoading(false)
    }
  }, [])

  const loadGameControl = React.useCallback(async () => {
    const headers = getAuthHeaders()

    if (!headers) {
      setGameState(null)
      setControlError('Login required. Please sign in again.')
      return
    }

    try {
      const response = await fetch(`${API}/admin/game-control`, {
        headers,
        cache: 'no-store',
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          data.error || `Game control API failed: ${response.status}`,
        )
      }

      setGameState(data)
      setControlError('')
    } catch (error) {
      console.error('Game control API error:', error)
      setControlError(error.message || 'Unable to load game state.')
    }
  }, [])
const loadReferralSettings = async () => {
  setReferralLoading(true)
  setReferralError('')
  setReferralMessage('')

  const headers = getAuthHeaders()

  if (!headers) {
    setReferralError('Login required. Please sign in again.')
    setReferralLoading(false)
    return
  }

  try {
    const response = await fetch(`${API}/admin/referral-settings`, {
      method: 'GET',
      headers,
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`Settings load nahi hui. Status: ${response.status}`)
    }

    const data = await response.json()

    setReferralSettings(data)
    setReferralForm({
      enabled: data.enabled ?? true,
      referrerReward: String(data.referrerReward ?? 20),
      referredUserReward: String(data.referredUserReward ?? 10),
      rewardCondition: data.rewardCondition ?? 'REGISTRATION',
    })
  } catch (error) {
    setReferralError(error.message || 'Settings load nahi hui.')
  } finally {
    setReferralLoading(false)
  }
}
  const saveReferralSettings = async () => {
    setReferralSaving(true)
    setReferralError('')
    setReferralMessage('')

    const referrerReward = Number(referralForm.referrerReward)
    const referredUserReward = Number(referralForm.referredUserReward)

    if (
      !Number.isInteger(referrerReward) ||
      referrerReward < 0 ||
      !Number.isInteger(referredUserReward) ||
      referredUserReward < 0
    ) {
      setReferralError('Rewards must be non-negative whole numbers.')
      setReferralSaving(false)
      return
    }

    const headers = getAuthHeaders()

    if (!headers) {
      setReferralError('Login required. Please sign in again.')
      setReferralSaving(false)
      return
    }

    try {
      const response = await fetch(`${API}/admin/referral-settings`, {
        method: 'PUT',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enabled: referralForm.enabled,
          referrerReward,
          referredUserReward,
          rewardCondition: referralForm.rewardCondition,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          data.error || `Settings save failed: ${response.status}`,
        )
      }

      setReferralSettings(data)
      setReferralForm({
        enabled: data.enabled ?? referralForm.enabled,
        referrerReward: String(data.referrerReward ?? referrerReward),
        referredUserReward: String(
          data.referredUserReward ?? referredUserReward,
        ),
        rewardCondition:
          data.rewardCondition ?? referralForm.rewardCondition,
      })
      setReferralMessage('Referral settings saved successfully.')
    } catch (error) {
      setReferralError(
        error.message || 'Referral settings could not be saved.',
      )
    } finally {
      setReferralSaving(false)
    }
  }

  const refreshDashboard = React.useCallback(() => {
    loadActiveRound()
    loadDashboardStats()
    loadGameControl()
  }, [loadActiveRound, loadDashboardStats, loadGameControl])

  const performGameAction = React.useCallback(async (action) => {
    const headers = getAuthHeaders()

    if (!headers) {
      setControlError('Login required. Please sign in again.')
      return
    }

    setControlLoading(true)
    setControlError('')
    setControlMessage('')

    try {
      const response = await fetch(
        `${API}/admin/game-control/${action}`,
        {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
        },
      )

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          data.error || `Request failed: ${response.status}`,
        )
      }

      setGameState(data)

      if (action === 'start') {
        setControlMessage('Game started.')
      } else if (action === 'pause') {
        setControlMessage('Game paused.')
      } else if (action === 'resume') {
        setControlMessage('Game resumed.')
      } else if (data.state === 'STOPPED') {
        setControlMessage('Game stopped.')
      } else {
        setControlMessage(
          'Stop requested. Waiting for the current round to finish.',
        )
      }

      await Promise.all([
        loadActiveRound(),
        loadDashboardStats(),
        loadGameControl(),
      ])
    } catch (error) {
      console.error('Game control action failed:', error)
      setControlError(error.message || 'Game control request failed.')
      await loadGameControl()
    } finally {
      setControlLoading(false)
    }
  }, [loadActiveRound, loadDashboardStats, loadGameControl])

  React.useEffect(() => {
    refreshDashboard()
  }, [refreshDashboard])

  React.useEffect(() => {
    const intervalId = window.setInterval(() => {
      loadGameControl()
    }, 5000)

    return () => window.clearInterval(intervalId)
  }, [loadGameControl])

  React.useEffect(() => {
  if (activePage === 'Referral Management') {
    loadReferralSettings()
  }
}, [activePage])
  const state = gameState?.state

  const stats = [
    {
      label: 'Total Users',
      value: totalUsers === null
        ? '—'
        : totalUsers.toLocaleString('en-IN'),
      icon: '♟',
      color: 'purple',
    },
    {
      label: 'Total Virtual Points',
      value: totalVirtualPoints === null
        ? '—'
        : totalVirtualPoints.toLocaleString('en-IN'),
      icon: '◉',
      color: 'gold',
    },
    {
      label: 'Active Round',
      value: roundLoading
        ? 'Loading...'
        : roundError
          ? 'Unavailable'
          : activeRound?.periodNumber || 'No active round',
      icon: '🎮',
      color: 'green',
    },
    {
      label: 'Total Bets',
      value: totalBets === null
        ? '—'
        : totalBets.toLocaleString('en-IN'),
      icon: '▥',
      color: 'pink',
    },
  ]

  const stateColors = {
    RUNNING: 'bg-emerald-950 text-emerald-300',
    PAUSED: 'bg-amber-950 text-amber-300',
    STOPPING: 'bg-orange-950 text-orange-300',
    STOPPED: 'bg-red-950 text-red-300',
  }

  return (
    <div className="min-h-screen bg-[#050817] text-white md:flex">
      <aside className="border-b border-purple-900 bg-[#080d20] p-4 md:min-h-screen md:w-64 md:border-b-0 md:border-r">
        <h1 className="text-2xl font-black">
          <span className="text-yellow-400">♛</span> Color
          <span className="text-fuchsia-400">Win</span>
        </h1>

        <p className="mb-5 text-xs text-slate-500">ADMIN PANEL</p>

        <nav className="flex gap-2 overflow-x-auto md:flex-col">
          {menuItems.map((item, index) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setActivePage(item)
                if (item === 'Dashboard') {
                  refreshDashboard()
                }
              }}
              className={`shrink-0 rounded-lg px-3 py-2 text-left text-sm ${
                activePage === item
                  ? 'bg-purple-700 font-bold text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`} 
            >
              {item}
            </button>
          ))}
        </nav>

        <button
          type="button"
          onClick={logout}
          className="mt-6 rounded-lg px-3 py-2 text-left text-sm font-bold text-red-400 hover:bg-red-950/40"
        >
          Logout
        </button>
      </aside>

      <main className="min-w-0 flex-1 p-4 md:p-6">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-2xl font-black">{activePage}</h2>
            <p className="mt-1 text-sm text-slate-400">
              {activePage === 'Referral Management'
                ? 'Manage referral rewards and registration rules.'
                : 'Welcome to ColorWin Admin Panel'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={refreshDashboard}
              disabled={roundLoading || statsLoading || controlLoading}
              className="rounded-lg border border-purple-700 px-3 py-2 text-sm hover:bg-purple-900/50 disabled:opacity-50"
            >
              {roundLoading || statsLoading || controlLoading
                ? 'Loading...'
                : '↻ Refresh'}
            </button>

            <button
              type="button"
              onClick={logout}
              className="rounded-lg border border-purple-700 px-3 py-2 text-sm hover:bg-purple-900/50"
            >
              Login again
            </button>
          </div>
        </header>

        {activePage === 'Referral Management' ? (
          <section className="mx-auto max-w-3xl rounded-xl border border-purple-900 bg-[#091126] p-4 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold">Referral Program Settings</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Rewards use virtual points and apply to successful registration.
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  referralForm.enabled
                    ? 'bg-emerald-950 text-emerald-300'
                    : 'bg-red-950 text-red-300'
                }`}
              >
                {referralForm.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>

            {referralLoading && (
              <p className="mt-4 text-sm text-slate-400">
                Loading referral settings...
              </p>
            )}

            {referralError && (
              <p className="mt-4 break-words rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
                {referralError}
              </p>
            )}

            {referralMessage && (
              <p className="mt-4 rounded-lg border border-emerald-800 bg-emerald-950/30 p-3 text-sm text-emerald-300">
                {referralMessage}
              </p>
            )}

            <div className="mt-6 flex items-center justify-between gap-4 rounded-lg border border-slate-800 p-4">
              <div>
                <p className="font-semibold">Referral program</p>
                <p className="mt-1 text-xs text-slate-400">
                  Turn referral rewards on or off for new registrations.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={referralForm.enabled}
                onClick={() =>
                  setReferralForm((current) => ({
                    ...current,
                    enabled: !current.enabled,
                  }))
                }
                disabled={referralLoading || referralSaving}
                className={`rounded-lg px-4 py-2 text-sm font-bold disabled:opacity-50 ${
                  referralForm.enabled
                    ? 'bg-emerald-700 hover:bg-emerald-600'
                    : 'bg-slate-700 hover:bg-slate-600'
                }`}
              >
                {referralForm.enabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold">Referrer reward</span>
                <span className="mt-1 block text-xs text-slate-400">
                  Points given to the person who referred a new user.
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={referralForm.referrerReward}
                  onChange={(event) =>
                    setReferralForm((current) => ({
                      ...current,
                      referrerReward: event.target.value,
                    }))
                  }
                  disabled={referralLoading || referralSaving}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-[#050817] px-3 py-2 text-white outline-none focus:border-purple-500 disabled:opacity-50"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold">New user reward</span>
                <span className="mt-1 block text-xs text-slate-400">
                  Points given to the referred user after registration.
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={referralForm.referredUserReward}
                  onChange={(event) =>
                    setReferralForm((current) => ({
                      ...current,
                      referredUserReward: event.target.value,
                    }))
                  }
                  disabled={referralLoading || referralSaving}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-[#050817] px-3 py-2 text-white outline-none focus:border-purple-500 disabled:opacity-50"
                />
              </label>
            </div>

            <label className="mt-5 block">
              <span className="text-sm font-semibold">Reward condition</span>
              <select
                value={referralForm.rewardCondition}
                onChange={(event) =>
                  setReferralForm((current) => ({
                    ...current,
                    rewardCondition: event.target.value,
                  }))
                }
                disabled={referralLoading || referralSaving}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-[#050817] px-3 py-2 text-white outline-none focus:border-purple-500 disabled:opacity-50"
              >
                <option value="REGISTRATION">Successful registration</option>
              </select>
            </label>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={saveReferralSettings}
                disabled={referralLoading || referralSaving}
                className="rounded-lg bg-purple-700 px-5 py-3 font-bold text-white hover:bg-purple-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {referralSaving ? 'Saving...' : 'Save Settings'}
              </button>
              <button
                type="button"
                onClick={loadReferralSettings}
                disabled={referralLoading || referralSaving}
                className="rounded-lg border border-slate-700 px-5 py-3 font-semibold hover:bg-slate-800 disabled:opacity-50"
              >
                Reload Settings
              </button>
            </div>

            {referralSettings && (
              <p className="mt-4 text-xs text-slate-500">
                Settings loaded from the backend. Changes take effect only after a successful save.
              </p>
            )}
          </section>
        ) : activePage === 'Dashboard' ? (
          <>
        <p className="mb-4 text-xs text-slate-500">
          Last refreshed:{' '}
          {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Not yet'}
        </p>

        {statsError && (
          <p className="mb-4 rounded-lg border border-amber-700 bg-amber-950/30 p-3 text-sm text-amber-200">
            {statsError}
          </p>
        )}

        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {stats.map((item) => (
            <StatCard key={item.label} item={item} />
          ))}
        </section>

        <section className="mt-5 grid gap-4 xl:grid-cols-2">
          <div className="rounded-xl border border-purple-900 bg-[#091126] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold">Game Control</h3>

              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  stateColors[state] || 'bg-slate-800 text-slate-300'
                }`}
              >
                {state || 'Loading state...'}
              </span>
            </div>

            <p className="mt-2 text-xs text-slate-400">
              Control the game using secured admin APIs.
            </p>

            {state === 'PAUSED' && (
              <p className="mt-2 text-sm text-amber-300">
                Remaining time:{' '}
                {gameState?.pausedRemainingSeconds ?? 0} seconds
              </p>
            )}

            {controlError && (
              <p className="mt-3 break-words rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
                {controlError}
              </p>
            )}

            {controlMessage && (
              <p className="mt-3 rounded-lg border border-emerald-800 bg-emerald-950/30 p-3 text-sm text-emerald-300">
                {controlMessage}
              </p>
            )}

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                disabled={controlLoading || state !== 'STOPPED'}
                onClick={() => performGameAction('start')}
                className="rounded-lg bg-emerald-700 p-3 font-bold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Start Game
              </button>

              <button
                type="button"
                disabled={controlLoading || state !== 'RUNNING'}
                onClick={() => performGameAction('pause')}
                className="rounded-lg bg-amber-700 p-3 font-bold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Pause Game
              </button>

              <button
                type="button"
                disabled={controlLoading || state !== 'PAUSED'}
                onClick={() => performGameAction('resume')}
                className="rounded-lg bg-blue-700 p-3 font-bold text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Resume Game
              </button>

              <button
                type="button"
                disabled={
                  controlLoading ||
                  !['RUNNING', 'PAUSED'].includes(state)
                }
                onClick={() => {
                  if (
                    window.confirm(
                      'Stop the game after the current round finishes?',
                    )
                  ) {
                    performGameAction('stop')
                  }
                }}
                className="rounded-lg bg-red-700 p-3 font-bold text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Stop Game
              </button>
            </div>

            {controlLoading && (
              <p className="mt-3 text-xs text-slate-400">
                Processing request...
              </p>
            )}

            <button
              type="button"
              onClick={loadGameControl}
              disabled={controlLoading}
              className="mt-3 w-full rounded-lg border border-slate-700 p-2 text-sm hover:bg-slate-800 disabled:opacity-50"
            >
              Refresh Game State
            </button>
          </div>

          <div className="rounded-xl border border-purple-900 bg-[#091126] p-4">
            <h3 className="font-bold">Game Settings</h3>

            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <div className="flex justify-between gap-3">
                <span>Round Duration</span>
                <span className="font-bold">60 seconds</span>
              </div>

              <div className="flex justify-between gap-3">
                <span>Allowed Colors</span>
                <span>Red · Green · Violet</span>
              </div>

              <div className="flex justify-between gap-3">
                <span>Mode</span>
                <span className="text-emerald-300">Virtual Points</span>
              </div>
            </div>

            <p className="mt-4 text-xs text-slate-500">
              These are reference values, not live editable settings.
            </p>
          </div>
        </section>

        <section className="mt-5 grid gap-4 xl:grid-cols-2">
          <div className="rounded-xl border border-purple-900 bg-[#091126] p-4">
            <h3 className="font-bold">Current Round Information</h3>

            <p className="mt-3 text-sm text-slate-400">Round Number</p>

            <p className="mt-1 break-words font-bold">
              {roundLoading
                ? 'Loading...'
                : roundError
                  ? 'Unable to load'
                  : activeRound?.periodNumber || 'No active round'}
            </p>

            <div className="mt-4 flex justify-between gap-3 text-sm">
              <span className="text-slate-400">Round Status</span>
              <span className="font-bold text-fuchsia-300">
                {activeRound?.status || '—'}
              </span>
            </div>

            <div className="mt-3 flex justify-between gap-3 text-sm">
              <span className="text-slate-400">Ends At</span>
              <span className="text-right font-bold">
                {activeRound?.endsAt
                  ? new Date(activeRound.endsAt).toLocaleTimeString()
                  : '—'}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-purple-900 bg-[#091126] p-4">
            <h3 className="font-bold">System Status</h3>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-slate-400">Backend API</span>
                <span
                  className={
                    roundLoading
                      ? 'text-amber-300'
                      : roundError
                        ? 'text-red-300'
                        : 'text-emerald-300'
                  }
                >
                  {roundLoading
                    ? 'Checking...'
                    : roundError
                      ? 'Unavailable'
                      : 'Responding'}
                </span>
              </div>

              <div className="flex justify-between gap-3">
                <span className="text-slate-400">Game Control</span>
                <span
                  className={
                    controlError
                      ? 'text-red-300'
                      : state
                        ? 'text-emerald-300'
                        : 'text-amber-300'
                  }
                >
                  {controlError
                    ? 'Check required'
                    : state
                      ? 'Connected'
                      : 'Checking...'}
                </span>
              </div>

              <div className="flex justify-between gap-3">
                <span className="text-slate-400">Admin statistics</span>
                <span
                  className={
                    statsLoading
                      ? 'text-amber-300'
                      : statsError
                        ? 'text-red-300'
                        : 'text-emerald-300'
                  }
                >
                  {statsLoading
                    ? 'Checking...'
                    : statsError
                      ? 'Check required'
                      : 'Loaded'}
                </span>
              </div>
            </div>
          </div>
        </section>

        <p className="mt-6 text-center text-xs text-slate-500">
          ColorWin Admin • Virtual points only
        </p>

          </>
        ) : (
          <section className="rounded-xl border border-purple-900 bg-[#091126] p-5">
            <h3 className="text-lg font-bold">{activePage}</h3>
            <p className="mt-2 text-sm text-slate-400">
              This module is not connected yet.
            </p>
          </section>
        )}
      </main>
    </div>
  )
}














































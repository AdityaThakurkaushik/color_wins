
import React from 'react'

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
    purple: 'border-purple-700 bg-purple-950/40 text-purple-300',
    gold: 'border-amber-700 bg-amber-950/30 text-amber-300',
    green: 'border-emerald-700 bg-emerald-950/30 text-emerald-300',
    pink: 'border-fuchsia-700 bg-fuchsia-950/30 text-fuchsia-300',
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
  const [activeRound, setActiveRound] = React.useState(null)
  const [roundLoading, setRoundLoading] = React.useState(true)
  const [roundError, setRoundError] = React.useState(false)
  const [lastUpdated, setLastUpdated] = React.useState(null)

  const loadActiveRound = React.useCallback(async () => {
    setRoundLoading(true)
    setRoundError(false)

    try {
      const response = await fetch(
        'https://color-wins.onrender.com/api/game/current'
      )

      if (response.status === 204) {
        setActiveRound(null)
      } else if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`)
      } else {
        const data = await response.json()
        setActiveRound(data)
      }

      setLastUpdated(new Date())
    } catch (error) {
      console.error('Unable to load active round:', error)
      setRoundError(true)
    } finally {
      setRoundLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadActiveRound()
  }, [loadActiveRound])

  const stats = [
    {
      label: 'Total Users',
      value: '—',
      icon: '♟',
      color: 'purple',
    },
    {
      label: 'Total Virtual Points',
      value: '—',
      icon: '◉',
      color: 'gold',
    },
    {
      label: 'Active Round',
      value: roundLoading
        ? 'Loading...'
        : roundError
          ? 'Unavailable'
          : activeRound
            ? activeRound.periodNumber
            : 'No active round',
      icon: '🎮',
      color: 'green',
    },
    {
      label: 'Total Bets',
      value: '—',
      icon: '▥',
      color: 'pink',
    },
  ]

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
              className={`shrink-0 rounded-lg px-3 py-2 text-left text-sm ${
                index === 0
                  ? 'bg-purple-700 font-bold text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              {item}
            </button>
          ))}
        </nav>

        <p className="mt-6 text-sm font-bold text-red-400">Logout</p>
      </aside>

      <main className="min-w-0 flex-1 p-4 md:p-6">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-2xl font-black">Dashboard</h2>
            <p className="mt-1 text-sm text-slate-400">
              Welcome to ColorWin Admin Panel
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadActiveRound}
              disabled={roundLoading}
              className="rounded-lg border border-purple-700 px-3 py-2 text-sm hover:bg-purple-900/50 disabled:opacity-50"
            >
              {roundLoading ? 'Loading...' : '↻ Refresh'}
            </button>

            <div className="rounded-lg border border-purple-700 px-3 py-2 text-sm">
              Admin
            </div>
          </div>
        </header>

        <p className="mb-4 text-xs text-slate-500">
          Last refreshed:{' '}
          {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Not yet'}
        </p>

        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {stats.map((item) => (
            <StatCard key={item.label} item={item} />
          ))}
        </section>

        <section className="mt-5 grid gap-4 xl:grid-cols-2">
          <div className="rounded-xl border border-purple-900 bg-[#091126] p-4">
            <h3 className="font-bold">Game Control</h3>
            <p className="mt-1 text-xs text-slate-400">
              Game controls will be connected to the backend later.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button
                disabled
                className="rounded-lg bg-emerald-700/50 p-3 font-bold text-emerald-200"
              >
                Start Game
              </button>
              <button
                disabled
                className="rounded-lg bg-amber-700/50 p-3 font-bold text-amber-200"
              >
                Pause Game
              </button>
              <button
                disabled
                className="rounded-lg bg-red-700/50 p-3 font-bold text-red-200"
              >
                Stop Game
              </button>
            </div>

            <p className="mt-3 text-xs text-slate-500">
              Controls disabled until secure admin APIs are implemented.
            </p>
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
              Read-only reference values; not connected to live settings.
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
                  : activeRound
                    ? activeRound.periodNumber
                    : 'No active round'}
            </p>

            <div className="mt-4 h-2 rounded-full bg-slate-800">
              <div className="h-2 w-1/3 rounded-full bg-purple-500" />
            </div>

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
                    roundError ? 'text-red-300' : roundLoading
                      ? 'text-amber-300'
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
                <span className="text-slate-400">Database</span>
                <span className="text-amber-300">Not checked</span>
              </div>

              <div className="flex justify-between gap-3">
                <span className="text-slate-400">Admin authorization</span>
                <span className="text-amber-300">Pending</span>
              </div>
            </div>
          </div>
        </section>

        <p className="mt-6 text-center text-xs text-slate-500">
          ColorWin Admin • Live round API connected • Other statistics not connected
        </p>
      </main>
    </div>
  )
}


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


  // User Management state
  const [users, setUsers] = React.useState([])
  const [usersTotal, setUsersTotal] = React.useState(0)
  const [usersSearch, setUsersSearch] = React.useState('')
  const [usersPage, setUsersPage] = React.useState(0)
  const [usersTotalPages, setUsersTotalPages] = React.useState(0)
  const [usersLoading, setUsersLoading] = React.useState(false)
  const [usersError, setUsersError] = React.useState('')
  const [walletUser, setWalletUser] = React.useState(null)
  const [walletAction, setWalletAction] = React.useState('CREDIT')
  const [walletAmount, setWalletAmount] = React.useState('')
  const [walletReason, setWalletReason] = React.useState('')
  const [walletLoading, setWalletLoading] = React.useState(false)
  const [walletError, setWalletError] = React.useState('')
  const [usersMessage, setUsersMessage] = React.useState('')
  // Announcements / Notifications state
const [notifications, setNotifications] = React.useState([])
const [notificationPage, setNotificationPage] = React.useState(0)
const [notificationTotalPages, setNotificationTotalPages] = React.useState(0)
const [notificationLoading, setNotificationLoading] = React.useState(false)
const [notificationSaving, setNotificationSaving] = React.useState(false)
const [notificationError, setNotificationError] = React.useState('')
const [notificationMessage, setNotificationMessage] = React.useState('')

const [notificationForm, setNotificationForm] = React.useState({
  title: '',
  message: '',
  priority: 'NORMAL',
  targetType: 'ALL',
  targetUserId: '',
  scheduleType: 'NOW',
  scheduledAt: '',
  active: true,
})

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

  const loadNotifications = async (page = notificationPage) => {
  const headers = getAuthHeaders()

  if (!headers) {
    setNotificationError('Login required. Please sign in again.')
    return
  }

  setNotificationLoading(true)
  setNotificationError('')
  setNotificationMessage('')

  try {
    const params = new URLSearchParams({
      page: String(page),
      size: '10',
    })

    const response = await fetch(
      `${API}/admin/notifications?${params.toString()}`,
      {
        headers,
        cache: 'no-store',
      },
    )

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(
        data.message || `Notifications API failed: ${response.status}`,
      )
    }

    setNotifications(Array.isArray(data.content) ? data.content : [])
    setNotificationTotalPages(Number(data.totalPages || 0))
    setNotificationPage(Number(data.number || 0))
  } catch (error) {
    setNotificationError(
      error.message || 'Notification history could not be loaded.',
    )
  } finally {
    setNotificationLoading(false)
  }
}

const createNotification = async (event) => {
  event.preventDefault()

  const headers = getAuthHeaders()

  if (!headers) {
    setNotificationError('Login required. Please sign in again.')
    return
  }

  if (
  notificationForm.scheduleType === 'LATER' &&
  (!notificationForm.scheduledAt ||
    Number.isNaN(new Date(notificationForm.scheduledAt).getTime()))
) {
  setNotificationError('Please select a valid scheduled date and time.')
  return
}

const scheduledAt =
  notificationForm.scheduleType === 'NOW'
    ? new Date().toISOString()
    : new Date(notificationForm.scheduledAt).toISOString()

  if (
    notificationForm.targetType === 'USER' &&
    !notificationForm.targetUserId
  ) {
    setNotificationError('Please select a target user.')
    return
  }

  setNotificationSaving(true)
  setNotificationError('')
  setNotificationMessage('')

  try {
    const payload = {
      title: notificationForm.title.trim(),
      message: notificationForm.message.trim(),
      priority: notificationForm.priority,
      targetType: notificationForm.targetType,
      targetUserId:
        notificationForm.targetType === 'USER'
          ? Number(notificationForm.targetUserId)
          : null,
      scheduledAt,
      active: notificationForm.active,
    }

    const response = await fetch(`${API}/admin/notifications`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(
        data.message || `Notification creation failed: ${response.status}`,
      )
    }

    setNotificationMessage('Notification created successfully.')

    setNotificationForm({
      title: '',
      message: '',
      priority: 'NORMAL',
      targetType: 'ALL',
      targetUserId: '',
      scheduleType: 'NOW',
      scheduledAt: '',
      active: true,
    })

    await loadNotifications(0)
  } catch (error) {
    setNotificationError(
      error.message || 'Notification could not be created.',
    )
  } finally {
    setNotificationSaving(false)
  }
}

// यहाँ updateNotificationStatus का पूरा code paste करना है


const updateNotificationStatus = async (id, active) => {
  const headers = getAuthHeaders()

  if (!headers) {
    setNotificationError('Login required. Please sign in again.')
    return
  }

  setNotificationError('')
  setNotificationMessage('')

  try {
    const response = await fetch(
      `${API}/admin/notifications/${id}/active?active=${active}`,
      {
        method: 'PUT',
        headers,
      },
    )

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(
        data.message || `Status update failed: ${response.status}`,
      )
    }

    setNotificationMessage(
      `Notification ${active ? 'activated' : 'deactivated'} successfully.`,
    )

    await loadNotifications(notificationPage)
  } catch (error) {
    setNotificationError(
      error.message || 'Notification status could not be updated.',
    )
  }
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

  const loadUsers = React.useCallback(async (page = usersPage, search = usersSearch) => {
    const headers = getAuthHeaders()
    if (!headers) {
      setUsersError('Login required. Please sign in again.')
      return
    }

    setUsersLoading(true)
    setUsersError('')
    setUsersMessage('')
    try {
      const params = new URLSearchParams({
        page: String(page),
        size: '20',
        search: search.trim(),
      })
      const response = await fetch(`${API}/admin/users?${params.toString()}`, {
        headers,
        cache: 'no-store',
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.message || `Users API failed: ${response.status}`)
      }
      setUsers(Array.isArray(data.content) ? data.content : [])
      setUsersTotal(Number(data.totalElements || 0))
      setUsersTotalPages(Number(data.totalPages || 0))
      setUsersPage(Number(data.number || 0))
    } catch (error) {
      setUsersError(error.message || 'Users could not be loaded.')
    } finally {
      setUsersLoading(false)
    }
  }, [usersPage, usersSearch])

  React.useEffect(() => {
    if (activePage === 'Users') loadUsers(0, usersSearch)
  }, [activePage, loadUsers, usersSearch])
  React.useEffect(() => {
    if (activePage === 'Announcements') {
      loadNotifications(0)
    }
  }, [activePage])

  const submitWalletAdjustment = async (event) => {
    event.preventDefault()
    const amount = Number(walletAmount)
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      setWalletError('Enter a positive whole-number amount.')
      return
    }
    if (!walletReason.trim()) {
      setWalletError('Reason is required.')
      return
    }
    if (!window.confirm(`${walletAction} ${amount.toLocaleString('en-IN')} virtual points ${walletAction === 'CREDIT' ? 'to' : 'from'} ${walletUser.username}?`)) return

    const headers = getAuthHeaders()
    if (!headers) {
      setWalletError('Login required. Please sign in again.')
      return
    }
    setWalletLoading(true)
    setWalletError('')
    try {
      const response = await fetch(`${API}/admin/users/${walletUser.id}/wallet-adjustment`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: walletAction,
          amount,
          reason: walletReason.trim(),
          idempotencyKey: window.crypto?.randomUUID?.() || `admin-${Date.now()}-${walletUser.id}`,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.message || `Adjustment failed: ${response.status}`)
      setWalletUser(null)
      setWalletAmount('')
      setWalletReason('')
      setUsersMessage(`Wallet adjustment completed for ${data.username || 'user'}.`)
      await loadUsers(usersPage, usersSearch)
      loadDashboardStats()
    } catch (error) {
      setWalletError(error.message || 'Wallet adjustment failed.')
    } finally {
      setWalletLoading(false)
    }
  }

  const updateUserStatus = async (user) => {
    const nextActive = !user.active
    const actionText = nextActive ? 'unblock' : 'block'
    if (!window.confirm(`Are you sure you want to ${actionText} ${user.username}?`)) return
    const headers = getAuthHeaders()
    if (!headers) {
      setUsersError('Login required. Please sign in again.')
      return
    }
    setUsersLoading(true)
    setUsersError('')
    try {
      const response = await fetch(`${API}/admin/users/${user.id}/status`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: nextActive }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.message || `Status update failed: ${response.status}`)
      setUsersMessage(`${user.username} has been ${nextActive ? 'unblocked' : 'blocked'}.`)
      await loadUsers(usersPage, usersSearch)
    } catch (error) {
      setUsersError(error.message || 'Account status could not be updated.')
    } finally {
      setUsersLoading(false)
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
                : activePage === 'Users'
                  ? 'Search accounts, manage virtual points and account access.'
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
        ) : activePage === 'Users' ? (
          <section className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-purple-900 bg-[#091126] p-4">
                <p className="text-sm text-slate-400">Total registered users</p>
                <p className="mt-2 text-3xl font-black">{usersTotal.toLocaleString('en-IN')}</p>
              </div>
              <div className="rounded-xl border border-purple-900 bg-[#091126] p-4">
                <p className="text-sm text-slate-400">Users on this page</p>
                <p className="mt-2 text-3xl font-black">{users.length}</p>
              </div>
            </div>

            <div className="rounded-xl border border-purple-900 bg-[#091126] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <input
                  type="search"
                  value={usersSearch}
                  onChange={(event) => { setUsersSearch(event.target.value); setUsersPage(0) }}
                  placeholder="Search username or email..."
                  className="w-full rounded-lg border border-slate-700 bg-[#050817] px-3 py-2 text-sm text-white outline-none focus:border-purple-500 sm:max-w-md"
                />
                <button type="button" onClick={() => loadUsers(usersPage, usersSearch)} disabled={usersLoading} className="rounded-lg border border-purple-700 px-4 py-2 text-sm font-semibold hover:bg-purple-900/50 disabled:opacity-50">
                  {usersLoading ? 'Loading...' : 'Refresh Users'}
                </button>
              </div>

              {usersError && <p className="mt-3 rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">{usersError}</p>}
              {usersMessage && <p className="mt-3 rounded-lg border border-emerald-800 bg-emerald-950/30 p-3 text-sm text-emerald-300">{usersMessage}</p>}

              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[850px] text-left text-sm">
                  <thead className="border-b border-slate-700 text-xs uppercase text-slate-400">
                    <tr>
                      <th className="px-3 py-3">User</th>
                      <th className="px-3 py-3">Email</th>
                      <th className="px-3 py-3">Mobile</th>
                      <th className="px-3 py-3">Virtual Points</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3">Registered</th>
                      <th className="px-3 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {usersLoading && users.length === 0 ? (
                      <tr><td colSpan="7" className="px-3 py-8 text-center text-slate-400">Loading users...</td></tr>
                    ) : users.length === 0 ? (
                      <tr><td colSpan="7" className="px-3 py-8 text-center text-slate-400">No users found.</td></tr>
                    ) : users.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-800/30">
                        <td className="px-3 py-3"><span className="font-semibold">{user.username}</span><span className="block text-xs text-slate-500">ID: {user.id}</span></td>
                        <td className="px-3 py-3 text-slate-300">{user.email || '—'}</td>
                        <td className="px-3 py-3 text-slate-300">{user.mobileNumber || '—'}</td>
                        <td className="px-3 py-3 font-semibold">{Number(user.virtualPoints || 0).toLocaleString('en-IN')}</td>
                        <td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${user.active ? 'bg-emerald-950 text-emerald-300' : 'bg-red-950 text-red-300'}`}>{user.active ? 'Active' : 'Blocked'}</span></td>
                        <td className="px-3 py-3 text-slate-400">{user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN') : '—'}</td>
                        <td className="px-3 py-3"><div className="flex gap-2">
                          <button type="button" onClick={() => { setWalletUser(user); setWalletAction('CREDIT'); setWalletAmount(''); setWalletReason(''); setWalletError('') }} className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-bold hover:bg-emerald-600">Adjust</button>
                          <button type="button" onClick={() => updateUserStatus(user)} disabled={usersLoading} className={`rounded-md px-3 py-1.5 text-xs font-bold disabled:opacity-50 ${user.active ? 'bg-red-900 hover:bg-red-800' : 'bg-blue-800 hover:bg-blue-700'}`}>{user.active ? 'Block' : 'Unblock'}</button>
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
                <span>Page {usersTotalPages === 0 ? 0 : usersPage + 1} of {usersTotalPages}</span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => loadUsers(Math.max(0, usersPage - 1), usersSearch)} disabled={usersLoading || usersPage <= 0} className="rounded-lg border border-slate-700 px-3 py-2 disabled:opacity-40">Previous</button>
                  <button type="button" onClick={() => loadUsers(usersPage + 1, usersSearch)} disabled={usersLoading || usersPage + 1 >= usersTotalPages} className="rounded-lg border border-slate-700 px-3 py-2 disabled:opacity-40">Next</button>
                </div>
              </div>
            </div>

            {walletUser && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="wallet-modal-title">
                <form onSubmit={submitWalletAdjustment} className="w-full max-w-md rounded-xl border border-purple-800 bg-[#091126] p-5 shadow-2xl">
                  <div className="flex items-start justify-between gap-3">
                    <div><h3 id="wallet-modal-title" className="text-lg font-bold">Adjust Virtual Points</h3><p className="mt-1 text-sm text-slate-400">{walletUser.username} · Current: {Number(walletUser.virtualPoints || 0).toLocaleString('en-IN')}</p></div>
                    <button type="button" onClick={() => setWalletUser(null)} className="rounded px-2 py-1 text-slate-400 hover:bg-slate-800" aria-label="Close">✕</button>
                  </div>
                  <label className="mt-4 block text-sm font-semibold">Action
                    <select value={walletAction} onChange={(event) => setWalletAction(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-[#050817] px-3 py-2 text-white"><option value="CREDIT">Credit points</option><option value="DEBIT">Debit points</option></select>
                  </label>
                  <label className="mt-4 block text-sm font-semibold">Amount
                    <input type="number" min="1" step="1" required value={walletAmount} onChange={(event) => setWalletAmount(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-[#050817] px-3 py-2 text-white" placeholder="Enter whole number" />
                  </label>
                  <label className="mt-4 block text-sm font-semibold">Reason (required)
                    <textarea required maxLength="255" rows="3" value={walletReason} onChange={(event) => setWalletReason(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-[#050817] px-3 py-2 text-white" placeholder="Explain why this adjustment is being made" />
                  </label>
                  {walletError && <p className="mt-3 rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">{walletError}</p>}
                  <div className="mt-5 flex flex-wrap justify-end gap-2">
                    <button type="button" onClick={() => setWalletUser(null)} disabled={walletLoading} className="rounded-lg border border-slate-700 px-4 py-2 text-sm">Cancel</button>
                    <button type="submit" disabled={walletLoading} className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-bold hover:bg-purple-600 disabled:opacity-50">{walletLoading ? 'Processing...' : 'Confirm Adjustment'}</button>
                  </div>
                </form>
              </div>
            )}
                 </section>
        ) : activePage === 'Announcements' ? (
          <section className="space-y-4">
           <div className="grid gap-4 xl:grid-cols-2">

  {/* Create Notification */}
  <div className="rounded-xl border border-purple-900 bg-[#091126] p-4">
    <h3 className="text-lg font-bold">Create Notification</h3>
    <p className="mt-1 text-sm text-slate-400">
      Send an announcement to players.
    </p>

    <form onSubmit={createNotification} className="mt-4 space-y-4">

      <div>
        <label className="mb-1 block text-sm font-semibold">Title</label>
        <input
          type="text"
          required
          maxLength="120"
          value={notificationForm.title}
          onChange={(e) => setNotificationForm({
            ...notificationForm,
            title: e.target.value,
          })}
          className="w-full rounded-lg border border-slate-700 bg-[#050817] px-3 py-2 text-white"
          placeholder="Notification title"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold">Message</label>
        <textarea
          required
          maxLength="1000"
          rows="4"
          value={notificationForm.message}
          onChange={(e) => setNotificationForm({
            ...notificationForm,
            message: e.target.value,
          })}
          className="w-full rounded-lg border border-slate-700 bg-[#050817] px-3 py-2 text-white"
          placeholder="Write your announcement..."
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold">Priority</label>
        <select
          value={notificationForm.priority}
          onChange={(e) => setNotificationForm({
            ...notificationForm,
            priority: e.target.value,
          })}
          className="w-full rounded-lg border border-slate-700 bg-[#050817] px-3 py-2 text-white"
        >
          <option value="NORMAL">Normal</option>
          <option value="IMPORTANT">Important</option>
          <option value="CRITICAL">Critical</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold">Send To</label>
        <select
          value={notificationForm.targetType}
          onChange={(e) => setNotificationForm({
            ...notificationForm,
            targetType: e.target.value,
            targetUserId: '',
          })}
          className="w-full rounded-lg border border-slate-700 bg-[#050817] px-3 py-2 text-white"
        >
          <option value="ALL">All Users</option>
          <option value="USER">Specific User</option>
        </select>
      </div>

      {notificationForm.targetType === 'USER' && (
        <div>
          <label className="mb-1 block text-sm font-semibold">
            Target User ID
          </label>
          <input
            type="number"
            min="1"
            required
            value={notificationForm.targetUserId}
            onChange={(e) => setNotificationForm({
              ...notificationForm,
              targetUserId: e.target.value,
            })}
            className="w-full rounded-lg border border-slate-700 bg-[#050817] px-3 py-2 text-white"
            placeholder="Enter user ID"
          />
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-semibold">Schedule</label>
        <select
          value={notificationForm.scheduleType}
          onChange={(e) => setNotificationForm({
            ...notificationForm,
            scheduleType: e.target.value,
            scheduledAt: '',
          })}
          className="w-full rounded-lg border border-slate-700 bg-[#050817] px-3 py-2 text-white"
        >
          <option value="NOW">Send Now</option>
          <option value="LATER">Schedule for Later</option>
        </select>
      </div>

      {notificationForm.scheduleType === 'LATER' && (
        <div>
          <label className="mb-1 block text-sm font-semibold">
            Scheduled Date & Time
          </label>
          <input
            type="datetime-local"
            required
            value={notificationForm.scheduledAt}
            onChange={(e) => setNotificationForm({
              ...notificationForm,
              scheduledAt: e.target.value,
            })}
            className="w-full rounded-lg border border-slate-700 bg-[#050817] px-3 py-2 text-white"
          />
        </div>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={notificationForm.active}
          onChange={(e) => setNotificationForm({
            ...notificationForm,
            active: e.target.checked,
          })}
        />
        Notification Active
      </label>

      {notificationError && (
        <p className="rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
          {notificationError}
        </p>
      )}

      {notificationMessage && (
        <p className="rounded-lg border border-emerald-800 bg-emerald-950/30 p-3 text-sm text-emerald-300">
          {notificationMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={notificationSaving}
        className="w-full rounded-lg bg-purple-700 px-4 py-3 font-bold text-white hover:bg-purple-600 disabled:opacity-50"
      >
        {notificationSaving ? 'Creating...' : 'Create Notification'}
      </button>

    </form>
  </div>

  {/* Notification History */}
  <div className="rounded-xl border border-purple-900 bg-[#091126] p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h3 className="text-lg font-bold">Notification History</h3>
        <p className="text-sm text-slate-400">
          Previously created notifications
        </p>
      </div>

      <button
        type="button"
        onClick={() => loadNotifications(notificationPage)}
        disabled={notificationLoading}
        className="rounded-lg border border-purple-700 px-3 py-2 text-sm hover:bg-purple-900/50 disabled:opacity-50"
      >
        {notificationLoading ? 'Loading...' : 'Refresh'}
      </button>
    </div>

    {notificationError && (
      <p className="mt-3 rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
        {notificationError}
      </p>
    )}

    {notificationMessage && (
      <p className="mt-3 rounded-lg border border-emerald-800 bg-emerald-950/30 p-3 text-sm text-emerald-300">
        {notificationMessage}
      </p>
    )}

    <div className="mt-4 space-y-3">
      {notificationLoading && notifications.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">
          Loading notifications...
        </p>
      ) : notifications.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">
          No notifications found.
        </p>
      ) : (
        notifications.map((item) => (
          <div
            key={item.id}
            className="rounded-lg border border-slate-700 bg-[#050817] p-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h4 className="font-bold">{item.title}</h4>
              <span className={`rounded-full px-2 py-1 text-xs font-bold ${
                item.active
                  ? 'bg-emerald-950 text-emerald-300'
                  : 'bg-red-950 text-red-300'
              }`}>
                {item.active ? 'Active' : 'Inactive'}
              </span>
            </div>

            <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-300">
              {item.message}
            </p>

            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
              <span>Priority: {item.priority}</span>
              <span>Target: {item.targetType}</span>
              <span>
                Scheduled: {item.scheduledAt
                  ? new Date(item.scheduledAt).toLocaleString('en-IN')
                  : '—'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => updateNotificationStatus(item.id, !item.active)}
              disabled={notificationLoading}
              className={`mt-3 rounded-lg px-3 py-2 text-xs font-bold text-white disabled:opacity-50 ${
                item.active
                  ? 'bg-red-800 hover:bg-red-700'
                  : 'bg-emerald-800 hover:bg-emerald-700'
              }`}
            >
              {item.active ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        ))
      )}
    </div>

    <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
      <span>
        Page {notificationTotalPages === 0 ? 0 : notificationPage + 1}
        {' '}of {notificationTotalPages}
      </span>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => loadNotifications(Math.max(0, notificationPage - 1))}
          disabled={notificationLoading || notificationPage <= 0}
          className="rounded-lg border border-slate-700 px-3 py-2 disabled:opacity-40"
        >
          Previous
        </button>

        <button
          type="button"
          onClick={() => loadNotifications(notificationPage + 1)}
          disabled={notificationLoading || notificationPage + 1 >= notificationTotalPages}
          className="rounded-lg border border-slate-700 px-3 py-2 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  </div>

</div>



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

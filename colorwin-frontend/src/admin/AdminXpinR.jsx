import React from 'react'
import { API } from '../api.js'

function authHeaders() {
  const token = localStorage.getItem('colorwin_token')
  return token ? { Authorization: `Bearer ${token}` } : null
}

const DEFAULT_MULTS = ['0', '0', '0', '0', '0', '1.2', '1.4', '1.6', '1.8', '2.0']

function fmt(n) {
  if (n == null || Number.isNaN(Number(n))) return '—'
  return Number(n).toLocaleString('en-IN')
}

export default function AdminXpinR() {
  const [enabled, setEnabled] = React.useState(true)
  const [minBet, setMinBet] = React.useState('5')
  const [maxBet, setMaxBet] = React.useState('10000')
  const [mults, setMults] = React.useState(DEFAULT_MULTS)
  const [math, setMath] = React.useState(null)
  const [stats, setStats] = React.useState(null)
  const [recent, setRecent] = React.useState([])
  const [meta, setMeta] = React.useState({ updatedAt: null, updatedBy: null })
  const [error, setError] = React.useState('')
  const [message, setMessage] = React.useState('')
  const [busy, setBusy] = React.useState(false)

  function applySettings(data) {
    if (!data) return
    setEnabled(Boolean(data.enabled))
    setMinBet(String(data.minBet ?? 5))
    setMaxBet(String(data.maxBet ?? 10000))
    const next = Array.isArray(data.multipliers)
      ? data.multipliers.map((m) => String(m))
      : DEFAULT_MULTS
    while (next.length < 10) next.push('0')
    setMults(next.slice(0, 10))
    setMath(data.math || null)
    setMeta({ updatedAt: data.updatedAt || null, updatedBy: data.updatedBy || null })
  }

  async function load() {
    const headers = authHeaders()
    if (!headers) throw new Error('Login required. Please sign in again.')
    const response = await fetch(`${API}/admin/xpinr?recentLimit=25`, { headers, cache: 'no-store' })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.message || data.detail || 'Could not load XpinR admin')
    applySettings(data.settings)
    setStats(data.stats || null)
    setRecent(Array.isArray(data.recentSpins) ? data.recentSpins : [])
  }

  React.useEffect(() => {
    load().catch((err) => setError(err.message))
  }, [])

  function setMult(index, value) {
    setMults((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  async function save() {
    const headers = authHeaders()
    if (!headers) {
      setError('Login required. Please sign in again.')
      return
    }
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const multipliers = mults.map((m) => Number(String(m).trim()))
      if (multipliers.some((n) => Number.isNaN(n))) {
        throw new Error('All 10 multipliers must be valid numbers')
      }
      const response = await fetch(`${API}/admin/xpinr/settings`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          minBet: Number(minBet),
          maxBet: Number(maxBet),
          multipliers,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.message || data.detail || 'Could not save settings')
      applySettings(data)
      setMessage('Saved. Every new spin will use these multipliers only.')
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  function applyPreset(kind) {
    if (kind === 'default20') {
      setMults([...DEFAULT_MULTS])
      setEnabled(true)
    } else if (kind === 'harder30') {
      setMults(['0', '0', '0', '0', '0', '0', '1.2', '1.4', '1.6', '2.8'])
    } else if (kind === 'softer10') {
      setMults(['0', '0', '0', '0', '1.2', '1.2', '1.4', '1.6', '1.8', '1.8'])
    }
  }

  return (
    <section className="mx-auto max-w-4xl space-y-4">
      <div className="rounded-xl border border-purple-900 bg-[#091126] p-4 md:p-6">
        <h3 className="text-lg font-bold">XpinR control</h3>
        <p className="mt-1 text-sm text-slate-400">
          Full access — enable/disable, bets, and all 10 multipliers. Spins use this config only (strict).
        </p>
        {meta.updatedAt && (
          <p className="mt-2 text-xs text-slate-500">
            Last update: {String(meta.updatedAt).replace('T', ' ').slice(0, 19)}
            {meta.updatedBy ? ` · by ${meta.updatedBy}` : ''}
          </p>
        )}

        <label className="mt-4 flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-4 w-4"
          />
          Game enabled
        </label>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-slate-400">Min bet</span>
            <input
              value={minBet}
              onChange={(e) => setMinBet(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-400">Max bet</span>
            <input
              value={maxBet}
              onChange={(e) => setMaxBet(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            />
          </label>
        </div>

        <div className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="font-bold">10 segment multipliers</h4>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={busy} onClick={() => applyPreset('default20')} className="rounded border border-slate-600 px-2 py-1 text-xs">
                Default 20% edge
              </button>
              <button type="button" disabled={busy} onClick={() => applyPreset('harder30')} className="rounded border border-slate-600 px-2 py-1 text-xs">
                Harder ~30%
              </button>
              <button type="button" disabled={busy} onClick={() => applyPreset('softer10')} className="rounded border border-slate-600 px-2 py-1 text-xs">
                Softer ~10%
              </button>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {mults.map((value, index) => (
              <label key={index} className="block text-xs">
                <span className="text-slate-500">Seg {index + 1}</span>
                <input
                  value={value}
                  onChange={(e) => setMult(index, e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 font-mono text-sm text-white"
                />
              </label>
            ))}
          </div>
          {math && (
            <p className="mt-3 text-sm text-amber-200">
              Theoretical RTP {String(math.rtpPercent)}% · Edge {String(math.edgePercent)}%
              {math.multiplierSum != null ? ` · Sum ${String(math.multiplierSum)}` : ''}
            </p>
          )}
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={save}
          className="mt-5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-black disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Save — spins follow this now'}
        </button>
        {message && <p className="mt-3 text-sm text-emerald-300">{message}</p>}
        {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
      </div>

      <div className="rounded-xl border border-purple-900 bg-[#091126] p-4 md:p-6">
        <h3 className="text-lg font-bold">Live stats</h3>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Spins" value={fmt(stats?.totalSpins)} />
          <Stat label="Wagered" value={fmt(stats?.totalWagered)} />
          <Stat label="Paid out" value={fmt(stats?.totalPaid)} />
          <Stat label="House net" value={fmt(stats?.houseNet)} />
          <Stat label="Wins" value={fmt(stats?.winCount)} />
          <Stat label="Losses" value={fmt(stats?.lossCount)} />
          <Stat label="Realized RTP" value={stats?.realizedRtpPercent != null ? `${stats.realizedRtpPercent}%` : '—'} />
          <Stat label="Realized edge" value={stats?.realizedEdgePercent != null ? `${stats.realizedEdgePercent}%` : '—'} />
        </div>
      </div>

      <div className="rounded-xl border border-purple-900 bg-[#091126] p-4 md:p-6">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg font-bold">Recent spins</h3>
          <button
            type="button"
            disabled={busy}
            onClick={() => load().catch((err) => setError(err.message))}
            className="text-sm text-slate-300 underline"
          >
            Refresh
          </button>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="py-2 pr-2">ID</th>
                <th className="py-2 pr-2">User</th>
                <th className="py-2 pr-2">Bet</th>
                <th className="py-2 pr-2">Seg</th>
                <th className="py-2 pr-2">Mult</th>
                <th className="py-2 pr-2">Payout</th>
                <th className="py-2">Net</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-4 text-slate-500">No spins yet.</td>
                </tr>
              )}
              {recent.map((row) => (
                <tr key={row.spinId} className="border-t border-slate-800">
                  <td className="py-2 pr-2 font-mono text-xs">{row.spinId}</td>
                  <td className="py-2 pr-2">{row.username || row.userId || '—'}</td>
                  <td className="py-2 pr-2">{fmt(row.amount)}</td>
                  <td className="py-2 pr-2">{row.segmentIndex}</td>
                  <td className="py-2 pr-2">{row.label}</td>
                  <td className="py-2 pr-2">{fmt(row.payout)}</td>
                  <td className={`py-2 ${Number(row.net) >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                    {fmt(row.net)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-white">{value}</p>
    </div>
  )
}

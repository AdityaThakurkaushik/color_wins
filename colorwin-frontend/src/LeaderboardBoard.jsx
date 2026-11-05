import { useEffect, useState } from 'react'
import { API } from './api.js'

const DEFAULT_AVATAR = '/millionaire-hub-logo.svg'
const podium = {
  1: {
    ring: 'ring-yellow-300 shadow-[0_0_28px_rgba(250,204,21,0.7)]',
    card: 'border-yellow-300/50 bg-[radial-gradient(circle_at_50%_0%,rgba(250,204,21,0.45),rgba(18,11,36,0.88)_58%)] shadow-[0_0_42px_rgba(250,204,21,0.55),inset_0_0_28px_rgba(250,204,21,0.18)]',
    label: '👑',
  },
  2: {
    ring: 'ring-slate-100 shadow-[0_0_20px_rgba(226,232,240,0.55)]',
    card: 'border-slate-200/40 bg-[radial-gradient(circle_at_50%_0%,rgba(226,232,240,0.32),rgba(18,11,36,0.9)_58%)] shadow-[0_0_32px_rgba(203,213,225,0.4),inset_0_0_22px_rgba(226,232,240,0.12)]',
    label: '2',
  },
  3: {
    ring: 'ring-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.55)]',
    card: 'border-amber-500/45 bg-[radial-gradient(circle_at_50%_0%,rgba(245,158,11,0.38),rgba(18,11,36,0.9)_58%)] shadow-[0_0_32px_rgba(245,158,11,0.45),inset_0_0_22px_rgba(245,158,11,0.14)]',
    label: '3',
  },
}

function formatBet(value) {
  return Number(value || 0).toLocaleString('en-IN')
}

export default function LeaderboardBoard() {
  const [board, setBoard] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(`${API}/leaderboard`, { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (!cancelled) setBoard(data) })
      .catch(() => { if (!cancelled) setBoard(null) })
      .finally(() => { if (!cancelled) setReady(true) })
    return () => { cancelled = true }
  }, [])

  const players = board?.players || []
  const top = players.slice(0, 3)
  const rest = players.slice(3)

  return (
    <section className="rounded-3xl border border-yellow-400/30 bg-[linear-gradient(180deg,#2a1a08_0%,#120b24_42%,#080817_100%)] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
      <div className="mb-4 flex items-end justify-between gap-2">
        <div>
          <p className="flex items-center gap-3.5 text-[11px] font-black tracking-[0.28em] text-yellow-300">
            LIVE ARENA
            <span className="live-dot inline-block h-2.5 w-2.5 rounded-full bg-[#5a040c]" />
          </p>
          <h3 className="text-2xl font-black text-white">Top Champions</h3>
          <p className="text-xs text-yellow-100/70">Who is dominating this round?</p>
        </div>
        {board?.rotationHours && (
          <p className="rounded-full border border-yellow-400/30 bg-black/30 px-3 py-1 text-[11px] font-bold text-yellow-300">
            Refresh {board.rotationHours}h
          </p>
        )}
      </div>

      {!ready ? (
        <p className="text-sm text-slate-400">Loading champions...</p>
      ) : players.length === 0 ? (
        <p className="text-sm text-slate-400">Champions will appear here.</p>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-3 items-end gap-2">
            {top.map((player) => {
              const style = podium[player.rank]
              const big = player.rank === 1
              return (
                <div key={player.rank} style={{ order: player.rank === 1 ? 2 : player.rank === 2 ? 1 : 3 }} className={`rounded-2xl border p-3 text-center ${style.card} ${big ? 'pb-5' : ''}`}>
                  <p className="mb-2 text-lg">{style.label}</p>
                  <span className={`mx-auto flex overflow-hidden rounded-full bg-[#120b24] ring-2 ${style.ring} ${big ? 'h-16 w-16' : 'h-12 w-12'}`}>
                    <img src={player.image || DEFAULT_AVATAR} alt="" className="h-full w-full object-cover" />
                  </span>
                  <p className="mt-2 truncate text-sm font-black text-white">{player.name}</p>
                  <p className="mt-1 text-[11px] font-bold text-yellow-300">{formatBet(player.totalBet)} pts</p>
                  <p className="text-[10px] uppercase tracking-widest text-slate-500">Total bet</p>
                </div>
              )
            })}
          </div>

          <ol className="space-y-2">
            {rest.map((player) => (
              <li key={player.rank} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 px-3 py-2.5">
                <span className="w-6 text-sm font-black text-yellow-400">{player.rank}</span>
                <span className="flex h-11 w-11 overflow-hidden rounded-full bg-[#120b24] ring-2 ring-yellow-400/70">
                  <img src={player.image || DEFAULT_AVATAR} alt="" className="h-full w-full object-cover" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold text-white">{player.name}</span>
                  <span className="text-[11px] text-slate-400">Total bet</span>
                </span>
                <span className="text-right font-black text-yellow-300">{formatBet(player.totalBet)}</span>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  )
}

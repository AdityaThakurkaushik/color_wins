import React from 'react'
import { API } from '../api.js'

function getAuthHeaders() {
  const token = localStorage.getItem('colorwin_token')
  return token ? { Authorization: `Bearer ${token}` } : null
}

function compressPhoto(file) {
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
      ctx.drawImage(image, (size - image.width * scale) / 2, (size - image.height * scale) / 2, image.width * scale, image.height * scale)
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

export default function AdminLeaderboard() {
  const [board, setBoard] = React.useState(null)
  const [error, setError] = React.useState('')
  const [message, setMessage] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [drafts, setDrafts] = React.useState({})

  async function load() {
    const headers = getAuthHeaders()
    if (!headers) {
      setError('Login required. Please sign in again.')
      return
    }
    const response = await fetch(`${API}/admin/leaderboard`, { headers, cache: 'no-store' })
    const data = await response.json()
    if (!response.ok) throw new Error(data.message || 'Could not load leaderboard')
    setBoard(data)
  }

  React.useEffect(() => {
    load().catch((err) => setError(err.message))
  }, [])

  function draft(slotNo) {
    return drafts[slotNo] || { displayName: '', profileImage: '' }
  }

  async function saveRotation(hours) {
    const headers = getAuthHeaders()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch(`${API}/admin/leaderboard/rotation`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ rotationHours: hours }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Could not save rotation')
      setBoard(data)
      setMessage(`Rotation set to ${hours} hours.`)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function saveSlot(slotNo) {
    const headers = getAuthHeaders()
    const current = board?.slots?.find((row) => row.slotNo === slotNo) || {}
    const next = draft(slotNo)
    const displayName = next.displayName || current.displayName
    const profileImage = next.profileImage || current.profileImage
    const totalBet = Number(next.totalBet ?? current.totalBet ?? 0)
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch(`${API}/admin/leaderboard/slots/${slotNo}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName, profileImage, totalBet }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Could not save player')
      setBoard(data)
      setDrafts((currentDrafts) => {
        const copy = { ...currentDrafts }
        delete copy[slotNo]
        return copy
      })
      setMessage(`Slot ${slotNo} saved.`)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function clearSlot(slotNo) {
    const headers = getAuthHeaders()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch(`${API}/admin/leaderboard/slots/${slotNo}`, {
        method: 'DELETE',
        headers,
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Could not clear slot')
      setBoard(data)
      setMessage(`Slot ${slotNo} cleared.`)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function onPhoto(slotNo, file) {
    try {
      const profileImage = await compressPhoto(file)
      setDrafts((current) => ({
        ...current,
        [slotNo]: { ...draft(slotNo), profileImage },
      }))
    } catch (err) {
      setError(err.message)
    }
  }

  if (!board) {
    return <p className="text-sm text-slate-400">{error || 'Loading leaderboard...'}</p>
  }

  return (
    <section className="mx-auto max-w-3xl space-y-4 rounded-xl border border-purple-900 bg-[#091126] p-4 md:p-6">
      <h3 className="text-lg font-bold">Leaderboard</h3>
      <p className="text-sm text-slate-400">
        Add up to 30 names and photos. Players see 10 at a time. The set rotates every 24 or 48 hours.
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => saveRotation(24)}
          className={`rounded-lg px-3 py-2 text-sm font-bold ${board.rotationHours === 24 ? 'bg-yellow-500 text-black' : 'bg-slate-800 text-white'}`}>
          24 hours
        </button>
        <button type="button" disabled={busy} onClick={() => saveRotation(48)}
          className={`rounded-lg px-3 py-2 text-sm font-bold ${board.rotationHours === 48 ? 'bg-yellow-500 text-black' : 'bg-slate-800 text-white'}`}>
          48 hours
        </button>
        <p className="self-center text-xs text-slate-500">{board.poolSize || 0} / 30 filled · showing 10 live</p>
      </div>
      {error && <p className="rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">{error}</p>}
      {message && <p className="rounded-lg border border-emerald-800 bg-emerald-950/30 p-3 text-sm text-emerald-300">{message}</p>}

      <div>
        <p className="mb-2 text-xs uppercase tracking-widest text-slate-500">Currently visible</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {(board.players || []).map((player) => (
            <div key={player.rank} className="rounded-xl border border-yellow-500/20 bg-black/30 p-2 text-center">
              <img src={player.image} alt="" className="mx-auto h-12 w-12 rounded-full object-cover ring-2 ring-yellow-400" />
              <p className="mt-1 truncate text-xs font-bold text-white">{player.rank}. {player.name}</p>
              <p className="text-[10px] text-yellow-300">{Number(player.totalBet || 0).toLocaleString('en-IN')} pts</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {(board.slots || []).map((slot) => {
          const next = draft(slot.slotNo)
          const name = next.displayName !== undefined && next.displayName !== '' ? next.displayName : slot.displayName
          const image = next.profileImage || slot.profileImage
          const totalBet = next.totalBet ?? slot.totalBet ?? 0
          return (
            <div key={slot.slotNo} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
              <span className="w-10 text-sm font-black text-yellow-400">#{slot.slotNo}</span>
              <label className="h-12 w-12 cursor-pointer overflow-hidden rounded-full bg-[#120b24] ring-2 ring-yellow-400/70">
                {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-xs text-slate-500">+</span>}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    event.target.value = ''
                    if (file) onPhoto(slot.slotNo, file)
                  }} />
              </label>
              <input
                value={name}
                maxLength={40}
                placeholder="Player name"
                onChange={(event) => setDrafts((current) => ({
                  ...current,
                  [slot.slotNo]: { ...draft(slot.slotNo), displayName: event.target.value },
                }))}
                className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-[#050817] px-3 py-2 text-white"
              />
              <input
                type="number"
                min="0"
                max="10000000"
                value={totalBet}
                placeholder="Total bet"
                onChange={(event) => setDrafts((current) => ({
                  ...current,
                  [slot.slotNo]: { ...draft(slot.slotNo), totalBet: event.target.value },
                }))}
                className="w-28 rounded-lg border border-slate-700 bg-[#050817] px-3 py-2 text-yellow-300"
              />
              <button type="button" disabled={busy} onClick={() => saveSlot(slot.slotNo)}
                className="rounded-lg bg-yellow-500 px-3 py-2 text-sm font-bold text-black disabled:opacity-50">Save</button>
              {slot.filled && (
                <button type="button" disabled={busy} onClick={() => clearSlot(slot.slotNo)}
                  className="rounded-lg border border-red-800 px-3 py-2 text-sm text-red-300">Clear</button>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

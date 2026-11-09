import { useEffect, useMemo, useRef } from 'react'
import { API } from './api.js'
import { startGameMusic } from './gameSfx.js'

/**
 * XpinR hosts the original Coin Spin UI/sounds/animations (public/xpinr/index.html).
 * Only the spin outcome comes from Millionaire Hub backend (/api/spins).
 * Ambient music uses the same Millionaire Hub game track.
 */
export default function SpinPage({
  balance = 0,
  isAuthenticated = false,
  onLogin,
  onBalanceChange,
  onAddFunds,
}) {
  const frameRef = useRef(null)
  const bootedBalance = useRef(Math.max(0, Number(balance) || 0))

  const src = useMemo(() => {
    const token = localStorage.getItem('colorwin_token') || ''
    const params = new URLSearchParams({
      api: API,
      balance: String(bootedBalance.current),
    })
    if (token) params.set('token', token)
    params.set('v', '6')
    return `/xpinr/index.html?${params.toString()}`
  }, [isAuthenticated])

  useEffect(() => {
    startGameMusic()
  }, [])

  useEffect(() => {
    function onMessage(event) {
      const data = event.data
      if (!data || data.source !== 'mh-xpinr') return
      if (data.type === 'login') onLogin?.()
      if (data.type === 'add-funds') onAddFunds?.()
      if (data.type === 'balance' && typeof data.balance === 'number') {
        onBalanceChange?.(data.balance)
      }
      if (data.type === 'ready' || data.type === 'spin-start') {
        startGameMusic()
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [onLogin, onAddFunds, onBalanceChange])

  useEffect(() => {
    const frame = frameRef.current
    if (!frame?.contentWindow) return
    frame.contentWindow.postMessage(
      { source: 'mh-hub', type: 'set-balance', balance: Math.max(0, Number(balance) || 0) },
      '*',
    )
  }, [balance])

  return (
    <section className="xpinr-shell">
      <iframe
        ref={frameRef}
        title="XpinR Coin Spin"
        className="xpinr-frame"
        src={src}
        allow="autoplay; vibrate"
      />
    </section>
  )
}

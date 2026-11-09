import { useEffect, useMemo, useRef } from 'react'
import gsap from 'gsap'

const DEFAULT_SEGMENTS = [
  { label: 'SIGNUP', color: '#f59e0b' },
  { label: '1ST %', color: '#10b981' },
  { label: 'NEXT %', color: '#38bdf8' },
  { label: 'BONUS', color: '#e879f9' },
  { label: 'VIP', color: '#f43f5e' },
  { label: 'LINK', color: '#a78bfa' },
  { label: 'CASH', color: '#fbbf24' },
  { label: 'WIN', color: '#34d399' },
]

export default function CasinoWheel({
  size = 220,
  spinning = true,
  segments = DEFAULT_SEGMENTS,
  labels = null,
}) {
  const wheelRef = useRef(null)
  const tweenRef = useRef(null)

  const slices = useMemo(() => {
    if (labels && labels.length) {
      return labels.map((label, i) => ({
        label,
        color: DEFAULT_SEGMENTS[i % DEFAULT_SEGMENTS.length].color,
      }))
    }
    return segments
  }, [labels, segments])

  const paths = useMemo(() => {
    const n = slices.length
    const r = 100
    const cx = 110
    const cy = 110
    return slices.map((slice, i) => {
      const a0 = (Math.PI * 2 * i) / n - Math.PI / 2
      const a1 = (Math.PI * 2 * (i + 1)) / n - Math.PI / 2
      const x0 = cx + r * Math.cos(a0)
      const y0 = cy + r * Math.sin(a0)
      const x1 = cx + r * Math.cos(a1)
      const y1 = cy + r * Math.sin(a1)
      const large = a1 - a0 > Math.PI ? 1 : 0
      const mid = (a0 + a1) / 2
      const tx = cx + r * 0.62 * Math.cos(mid)
      const ty = cy + r * 0.62 * Math.sin(mid)
      return {
        ...slice,
        d: `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`,
        tx,
        ty,
        rot: (mid * 180) / Math.PI,
      }
    })
  }, [slices])

  useEffect(() => {
    if (!wheelRef.current) return undefined
    tweenRef.current?.kill()
    if (spinning) {
      tweenRef.current = gsap.to(wheelRef.current, {
        rotation: '+=360',
        duration: 12,
        ease: 'none',
        repeat: -1,
        transformOrigin: '50% 50%',
      })
    } else {
      gsap.set(wheelRef.current, { rotation: 0 })
    }
    return () => tweenRef.current?.kill()
  }, [spinning])

  return (
    <div className="ra-wheel" style={{ width: size, height: size }}>
      <div className="ra-wheel-glow" aria-hidden="true" />
      <div className="ra-wheel-pointer" aria-hidden="true" />
      <svg
        ref={wheelRef}
        viewBox="0 0 220 220"
        width={size}
        height={size}
        className="ra-wheel-svg"
        role="img"
        aria-label="Commission prize wheel"
      >
        <circle cx="110" cy="110" r="108" fill="#1a1208" />
        <circle cx="110" cy="110" r="104" fill="none" stroke="#fbbf24" strokeWidth="5" />
        {paths.map((p) => (
          <g key={p.label + p.d}>
            <path d={p.d} fill={p.color} stroke="#111827" strokeWidth="1.2" />
            <text
              x={p.tx}
              y={p.ty}
              fill="#0b0b18"
              fontSize="9"
              fontWeight="900"
              textAnchor="middle"
              dominantBaseline="middle"
              transform={`rotate(${p.rot} ${p.tx} ${p.ty})`}
            >
              {p.label}
            </text>
          </g>
        ))}
        <circle cx="110" cy="110" r="28" fill="#111827" stroke="#fbbf24" strokeWidth="3" />
        <text x="110" y="108" textAnchor="middle" fill="#fbbf24" fontSize="10" fontWeight="900">VIP</text>
        <text x="110" y="120" textAnchor="middle" fill="#fde68a" fontSize="7" fontWeight="700">AGENT</text>
      </svg>
    </div>
  )
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Application, extend, useTick } from '@pixi/react'
import { Container, Graphics, Text, TextStyle } from 'pixi.js'

extend({ Container, Graphics, Text })

const COLOR_MAP = {
  RED: 0xef4444,
  GREEN: 0x10b981,
  BLUE: 0x3b82f6,
}

const labelStyle = new TextStyle({
  fill: 0xfff7ed,
  fontFamily: 'Manrope, Arial, sans-serif',
  fontSize: 13,
  fontWeight: '900',
  align: 'center',
})

const tinyStyle = new TextStyle({
  fill: 0xfde68a,
  fontFamily: 'Manrope, Arial, sans-serif',
  fontSize: 10,
  fontWeight: '800',
  align: 'center',
})

const hitStyle = new TextStyle({
  fill: 0xffedd5,
  fontFamily: 'Cinzel, Georgia, serif',
  fontSize: 28,
  fontWeight: '900',
  align: 'center',
})

function formatTime(totalSeconds) {
  const safe = Math.max(0, Number(totalSeconds) || 0)
  const mins = String(Math.floor(safe / 60)).padStart(2, '0')
  const secs = String(safe % 60).padStart(2, '0')
  return `${mins}:${secs}`
}

function Sparkles({ x, y, burstKey, color = 0xfbbf24 }) {
  const [bits, setBits] = useState([])
  const age = useRef(0)

  useEffect(() => {
    if (!burstKey) return
    age.current = 0
    setBits(Array.from({ length: 14 }, (_, i) => ({
      id: `${burstKey}-${i}`,
      angle: (Math.PI * 2 * i) / 14,
      speed: 1.4 + (i % 4) * 0.35,
      size: 2 + (i % 3),
    })))
  }, [burstKey])

  useTick((ticker) => {
    if (!bits.length) return
    age.current += ticker.deltaMS
    if (age.current > 420) {
      setBits([])
      return
    }
    setBits((list) => list.map((b) => ({
      ...b,
      x: Math.cos(b.angle) * b.speed * (age.current * 0.08),
      y: Math.sin(b.angle) * b.speed * (age.current * 0.08),
      alpha: Math.max(0, 1 - age.current / 420),
    })))
  })

  const draw = useCallback((g) => {
    g.clear()
    bits.forEach((b) => {
      g.circle(b.x || 0, b.y || 0, b.size)
      g.fill({ color, alpha: b.alpha ?? 1 })
    })
  }, [bits, color])

  if (!bits.length) return null
  return <pixiGraphics x={x} y={y} draw={draw} />
}

function ArenaScene({
  width,
  height,
  secondsLeft,
  totalSeconds,
  selectedColor,
  locked,
  showTapPad,
  angerCount,
  angerHit,
  angerLabel,
  onPickColor,
  onTap,
}) {
  const pulse = useRef(0)
  const [tick, setTick] = useState(0)

  useTick((ticker) => {
    pulse.current += ticker.deltaMS * 0.004
    setTick((n) => (n + 1) % 100000)
  })

  const cx = width / 2
  const urgent = secondsLeft > 0 && secondsLeft <= 10
  const ratio = totalSeconds > 0 ? Math.max(0, Math.min(1, secondsLeft / totalSeconds)) : 0
  const gemY = showTapPad ? height * 0.28 : height * 0.58
  const timerY = showTapPad ? height * 0.12 : height * 0.22
  const gemGap = Math.min(96, width * 0.28)
  const gems = [
    { key: 'RED', x: cx - gemGap },
    { key: 'GREEN', x: cx },
    { key: 'BLUE', x: cx + gemGap },
  ]

  const bgDraw = useCallback((g) => {
    g.clear()
    g.roundRect(0, 0, width, height, 18)
    g.fill({ color: 0x0a0618, alpha: 0.92 })
    g.stroke({ width: 1.5, color: 0xfbbf24, alpha: 0.28 })
    g.circle(cx, timerY, 54 + Math.sin(pulse.current) * 2)
    g.fill({ color: urgent ? 0x3b1020 : 0x1a1030, alpha: 0.9 })
  }, [width, height, cx, timerY, urgent, tick])

  const ringDraw = useCallback((g) => {
    g.clear()
    const radius = 40
    g.circle(0, 0, radius)
    g.stroke({ width: 6, color: 0x312e81, alpha: 0.55 })
    const start = -Math.PI / 2
    const end = start + Math.PI * 2 * ratio
    g.moveTo(Math.cos(start) * radius, Math.sin(start) * radius)
    g.arc(0, 0, radius, start, end)
    g.stroke({ width: 6, color: urgent ? 0xfbbf24 : 0xe879f9, alpha: 0.95 })
  }, [ratio, urgent, tick])

  const gemDraw = useCallback((key, on) => (g) => {
    g.clear()
    const color = COLOR_MAP[key]
    const r = on ? 26 : 22
    g.circle(0, 0, r + 6)
    g.fill({ color, alpha: on ? 0.28 : 0.12 })
    g.circle(0, 0, r)
    g.fill({ color, alpha: on ? 1 : locked && !on ? 0.28 : 0.82 })
    g.stroke({ width: on ? 3 : 1.5, color: on ? 0xfde68a : 0xffffff, alpha: on ? 1 : 0.35 })
  }, [locked, tick])

  const padDraw = useCallback((g) => {
    g.clear()
    const w = Math.min(width - 28, 320)
    const h = 78
    g.roundRect(-w / 2, -h / 2, w, h, 16)
    g.fill({ color: 0x7f1d1d, alpha: 0.95 })
    g.stroke({ width: 2, color: 0xfca5a5, alpha: 0.7 })
  }, [width, tick])

  return (
    <pixiContainer>
      <pixiGraphics draw={bgDraw} />
      <pixiContainer x={cx} y={timerY}>
        <pixiGraphics draw={ringDraw} />
        <pixiText
          text={formatTime(secondsLeft)}
          anchor={0.5}
          y={2}
          style={new TextStyle({
            fill: urgent ? 0xfcd34d : 0xf5d0fe,
            fontFamily: 'Manrope, Arial, sans-serif',
            fontSize: 26,
            fontWeight: '900',
          })}
        />
        <pixiText text="TIMER" anchor={0.5} y={-28} style={tinyStyle} />
      </pixiContainer>

      {gems.map((gem) => {
        const on = selectedColor === gem.key
        return (
          <pixiContainer
            key={gem.key}
            x={gem.x}
            y={gemY}
            eventMode={locked ? 'none' : 'static'}
            cursor={locked ? 'default' : 'pointer'}
            onPointerTap={() => {
              if (!locked) onPickColor?.(gem.key)
            }}
          >
            <pixiGraphics draw={gemDraw(gem.key, on)} />
            <pixiText text={gem.key} anchor={0.5} y={38} style={labelStyle} />
          </pixiContainer>
        )
      })}

      {showTapPad && (
        <pixiContainer x={cx} y={height * 0.72}>
          <pixiText text={`HITS ${angerCount}`} anchor={0.5} y={-58} style={hitStyle} />
          <pixiContainer
            eventMode="static"
            cursor="pointer"
            onPointerTap={() => onTap?.()}
          >
            <pixiGraphics draw={padDraw} />
            <pixiText
              text={angerLabel || 'LET IT OUT'}
              anchor={0.5}
              style={new TextStyle({
                fill: 0xfff1f2,
                fontFamily: 'Manrope, Arial, sans-serif',
                fontSize: 18,
                fontWeight: '900',
              })}
            />
          </pixiContainer>
          <Sparkles x={0} y={0} burstKey={angerHit} color={0xf87171} />
        </pixiContainer>
      )}
    </pixiContainer>
  )
}

export default function CasinoArena({
  secondsLeft = 0,
  totalSeconds = 60,
  selectedColor = '',
  locked = false,
  showTapPad = false,
  angerCount = 0,
  angerHit = 0,
  angerLabel = 'LET IT OUT',
  onPickColor,
  onTap,
}) {
  const hostRef = useRef(null)
  const [size, setSize] = useState({ w: 360, h: showTapPad ? 360 : 250 })

  useEffect(() => {
    const el = hostRef.current
    if (!el) return undefined
    const sync = () => {
      const w = Math.max(280, Math.floor(el.clientWidth || 360))
      setSize({ w, h: showTapPad ? Math.round(w * 0.95) : Math.round(w * 0.68) })
    }
    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(el)
    return () => ro.disconnect()
  }, [showTapPad])

  const scene = useMemo(() => (
    <ArenaScene
      width={size.w}
      height={size.h}
      secondsLeft={secondsLeft}
      totalSeconds={totalSeconds}
      selectedColor={selectedColor}
      locked={locked}
      showTapPad={showTapPad}
      angerCount={angerCount}
      angerHit={angerHit}
      angerLabel={angerLabel}
      onPickColor={onPickColor}
      onTap={onTap}
    />
  ), [size, secondsLeft, totalSeconds, selectedColor, locked, showTapPad, angerCount, angerHit, angerLabel, onPickColor, onTap])

  return (
    <div ref={hostRef} className="mh-pixi-arena">
      <Application
        width={size.w}
        height={size.h}
        backgroundAlpha={0}
        antialias
        autoDensity
        resolution={Math.min(2, window.devicePixelRatio || 1)}
      >
        {scene}
      </Application>
    </div>
  )
}

import { Howl, Howler } from 'howler'

let muted = localStorage.getItem('mh_game_sfx_muted') === '1'
let musicOn = false
let ctx = null

Howler.mute(muted)
Howler.volume(0.85)

function audioCtx() {
  if (!ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return null
    ctx = new AudioCtx()
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

function tone(freq, duration = 0.1, type = 'sine', gain = 0.03) {
  if (muted) return
  const ac = audioCtx()
  if (!ac) return
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = type
  osc.frequency.value = freq
  g.gain.value = gain
  g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration)
  osc.connect(g)
  g.connect(ac.destination)
  osc.start()
  osc.stop(ac.currentTime + duration)
}

function makeHowl(name, opts = {}) {
  const sound = new Howl({
    src: [`/sfx/${name}.mp3`, `/sfx/${name}.ogg`, `/sfx/${name}.wav`],
    volume: opts.volume ?? 0.4,
    loop: Boolean(opts.loop),
    preload: true,
    html5: Boolean(opts.html5),
    onloaderror: () => {
      sound._mhMissing = true
    },
  })
  return sound
}

const bank = {
  click: makeHowl('click', { volume: 0.35 }),
  chip: makeHowl('chip', { volume: 0.4 }),
  place: makeHowl('place', { volume: 0.42 }),
  hit: makeHowl('hit', { volume: 0.4 }),
  win: makeHowl('win', { volume: 0.45 }),
  lose: makeHowl('lose', { volume: 0.4 }),
  ambient: makeHowl('ambient', { volume: 0.28, loop: true, html5: true }),
}

function playHowl(name, fallback) {
  if (muted) return
  const sound = bank[name]
  if (sound && !sound._mhMissing && sound.state() !== 'unloaded') {
    try {
      if (sound.playing()) sound.stop()
      sound.play()
      return
    } catch {
      sound._mhMissing = true
    }
  }
  fallback?.()
}

function stopSoftPad() {
  if (startGameMusic._padNodes) {
    try { startGameMusic._padNodes.master.gain.setTargetAtTime(0.0001, audioCtx()?.currentTime || 0, 0.05) } catch {}
    try { startGameMusic._padNodes.oscs.forEach((o) => o.stop()) } catch {}
    startGameMusic._padNodes = null
  }
  if (startGameMusic._timer) {
    window.clearInterval(startGameMusic._timer)
    startGameMusic._timer = null
  }
}

function startSoftPad() {
  stopSoftPad()
  const ac = audioCtx()
  if (!ac) return
  const master = ac.createGain()
  master.gain.value = 0.0001
  master.connect(ac.destination)
  master.gain.linearRampToValueAtTime(0.045, ac.currentTime + 0.8)

  const freqs = [110, 164.81, 220]
  const oscs = freqs.map((freq, i) => {
    const osc = ac.createOscillator()
    const g = ac.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    g.gain.value = 0.35 - i * 0.08
    osc.connect(g)
    g.connect(master)
    osc.start()
    return osc
  })
  startGameMusic._padNodes = { master, oscs }
}

export function startGameMusic() {
  if (muted || musicOn) return

  const ambient = bank.ambient
  if (ambient && ambient._mhMissing) {
    musicOn = true
    startSoftPad()
    return
  }

  if (ambient && !ambient._mhMissing) {
    try {
      ambient.once?.('loaderror', () => {
        ambient._mhMissing = true
        if (muted) return
        try { ambient.stop() } catch {}
        stopSoftPad()
        musicOn = false
        startGameMusic()
      })
      if (!ambient.playing()) ambient.play()
      musicOn = true
      window.setTimeout(() => {
        if (muted || ambient._mhMissing) return
        // File missing / failed: Howler never reaches loaded+playing → soft pad (no tik-tik pulses)
        if (!ambient.playing() && ambient.state() !== 'loaded') {
          try { ambient.stop() } catch {}
          ambient._mhMissing = true
          musicOn = false
          startGameMusic()
        }
      }, 900)
      return
    } catch {
      ambient._mhMissing = true
    }
  }

  musicOn = true
  startSoftPad()
}

export function stopGameMusic() {
  musicOn = false
  stopSoftPad()
  try { bank.ambient.stop() } catch {}
}

export function isGameSfxMuted() {
  return muted
}

export function setGameSfxMuted(next) {
  muted = Boolean(next)
  localStorage.setItem('mh_game_sfx_muted', muted ? '1' : '0')
  Howler.mute(muted)
  if (muted) stopGameMusic()
  else startGameMusic()
}

export function playClick() {
  playHowl('click', () => tone(720, 0.05, 'sine', 0.02))
}

export function playChip() {
  playHowl('chip', () => {
    tone(540, 0.06, 'triangle', 0.025)
    window.setTimeout(() => tone(780, 0.07, 'triangle', 0.018), 40)
  })
}

export function playPlace() {
  playHowl('place', () => {
    tone(392, 0.08, 'sine', 0.03)
    window.setTimeout(() => tone(523, 0.1, 'sine', 0.028), 70)
    window.setTimeout(() => tone(659, 0.12, 'triangle', 0.022), 140)
  })
}

export function playHit() {
  playHowl('hit', () => {
    tone(180, 0.09, 'sine', 0.035)
    window.setTimeout(() => tone(420, 0.05, 'triangle', 0.02), 35)
  })
}

export function playWinChime() {
  playHowl('win', () => {
    const fanfare = [
      [523.25, 0, 0.11, 0.034],
      [659.25, 85, 0.11, 0.032],
      [783.99, 170, 0.13, 0.034],
      [1046.5, 265, 0.22, 0.038],
      [783.99, 420, 0.1, 0.024],
      [1046.5, 500, 0.2, 0.036],
      [1318.5, 610, 0.09, 0.028],
      [1568, 690, 0.1, 0.026],
      [2093, 780, 0.14, 0.03],
    ]
    fanfare.forEach(([freq, delay, dur, gain]) => {
      window.setTimeout(() => tone(freq, dur, 'sine', gain), delay)
    })
    window.setTimeout(() => {
      tone(523.25, 0.42, 'triangle', 0.014)
      tone(659.25, 0.42, 'triangle', 0.012)
      tone(783.99, 0.48, 'sine', 0.016)
    }, 180)
    ;[880, 1175, 1480, 1760].forEach((freq, i) => {
      window.setTimeout(() => tone(freq, 0.07, 'triangle', 0.02), 860 + i * 70)
    })
  })
}

export function playLoseTone() {
  playHowl('lose', () => {
    tone(349, 0.14, 'sine', 0.03)
    window.setTimeout(() => tone(277, 0.16, 'triangle', 0.026), 100)
    window.setTimeout(() => tone(220, 0.28, 'sine', 0.024), 220)
  })
}

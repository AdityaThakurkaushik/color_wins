import { Howl, Howler } from 'howler'

let muted = localStorage.getItem('mh_game_sfx_muted') === '1'
let musicOn = false
let ctx = null
let filesReady = false

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

function missingSound() {
  return {
    _mhMissing: true,
    play() {},
    stop() {},
    state() { return 'unloaded' },
    playing() { return false },
    once() {},
  }
}

function makeHowl(name, opts = {}) {
  const sound = new Howl({
    src: [`/sfx/${name}.mp3`],
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
  click: missingSound(),
  chip: missingSound(),
  place: missingSound(),
  hit: missingSound(),
  win: missingSound(),
  lose: missingSound(),
  ambient: missingSound(),
}

/** Only load Howler files if at least one asset exists — avoids live 404 storms / lag. */
function probeSfxFiles() {
  if (probeSfxFiles._done) return
  probeSfxFiles._done = true
  fetch('/sfx/click.mp3', { method: 'HEAD', cache: 'no-store' })
    .then((res) => {
      if (!res.ok) return
      filesReady = true
      bank.click = makeHowl('click', { volume: 0.35 })
      bank.chip = makeHowl('chip', { volume: 0.4 })
      bank.place = makeHowl('place', { volume: 0.42 })
      bank.hit = makeHowl('hit', { volume: 0.4 })
      bank.win = makeHowl('win', { volume: 0.45 })
      bank.lose = makeHowl('lose', { volume: 0.4 })
      bank.ambient = makeHowl('ambient', { volume: 0.28, loop: true, html5: true })
    })
    .catch(() => {})
}
probeSfxFiles()

function playHowl(name, fallback) {
  if (muted) return
  const sound = bank[name]
  if (filesReady && sound && !sound._mhMissing && sound.state() !== 'unloaded') {
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
  if (!filesReady || ambient._mhMissing) {
    musicOn = true
    startSoftPad()
    return
  }

  try {
    ambient.once?.('loaderror', () => {
      ambient._mhMissing = true
      if (muted) return
      try { ambient.stop() } catch {}
      musicOn = false
      startGameMusic()
    })
    if (!ambient.playing()) ambient.play()
    musicOn = true
    window.setTimeout(() => {
      if (muted || ambient._mhMissing) return
      if (!ambient.playing() && ambient.state() !== 'loaded') {
        try { ambient.stop() } catch {}
        ambient._mhMissing = true
        musicOn = false
        startGameMusic()
      }
    }, 900)
  } catch {
    ambient._mhMissing = true
    musicOn = true
    startSoftPad()
  }
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
    ]
    fanfare.forEach(([freq, delay, dur, gain]) => {
      window.setTimeout(() => tone(freq, dur, 'sine', gain), delay)
    })
  })
}

export function playLoseTone() {
  playHowl('lose', () => {
    tone(349, 0.14, 'sine', 0.03)
    window.setTimeout(() => tone(277, 0.16, 'triangle', 0.026), 100)
  })
}

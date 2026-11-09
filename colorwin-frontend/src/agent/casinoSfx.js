let ctx = null
let muted = localStorage.getItem('mh_ra_sfx_muted') === '1'
let musicNodes = null
let musicTimer = null
let musicOn = false

function audio() {
  if (!ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return null
    ctx = new AudioCtx()
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

function tone(freq, duration = 0.08, type = 'triangle', gain = 0.04) {
  if (muted) return
  const ac = audio()
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

function stopMusicInternal() {
  if (musicTimer) {
    window.clearInterval(musicTimer)
    musicTimer = null
  }
  if (musicNodes) {
    try { musicNodes.master.gain.setTargetAtTime(0, audio()?.currentTime || 0, 0.05) } catch {}
    window.setTimeout(() => {
      try { musicNodes.oscillators.forEach((o) => o.stop()) } catch {}
      try { musicNodes.master.disconnect() } catch {}
      musicNodes = null
    }, 200)
  }
  musicOn = false
}

function scheduleBar(ac, master, startAt) {
  // Soft casino lounge loop: Am - F - C - G vibe in A minor-ish
  const chords = [
    [220.0, 261.63, 329.63], // A3 C4 E4
    [174.61, 220.0, 261.63], // F3 A3 C4
    [196.0, 246.94, 293.66], // G3 B3 D4
    [164.81, 196.0, 246.94], // E3 G3 B3
  ]
  const melody = [440, 523.25, 493.88, 392, 440, 349.23, 392, 329.63]
  const bar = 1.6
  const created = []

  chords.forEach((chord, i) => {
    const t0 = startAt + i * (bar / 4)
    chord.forEach((freq, n) => {
      const osc = ac.createOscillator()
      const g = ac.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      g.gain.value = 0.0001
      g.gain.setValueAtTime(0.0001, t0)
      g.gain.linearRampToValueAtTime(0.028 - n * 0.004, t0 + 0.08)
      g.gain.linearRampToValueAtTime(0.0001, t0 + bar / 4 - 0.05)
      osc.connect(g)
      g.connect(master)
      osc.start(t0)
      osc.stop(t0 + bar / 4)
      created.push(osc)
    })
  })

  melody.forEach((freq, i) => {
    const t0 = startAt + i * (bar / 8)
    const osc = ac.createOscillator()
    const g = ac.createGain()
    osc.type = 'triangle'
    osc.frequency.value = freq
    g.gain.value = 0.0001
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.linearRampToValueAtTime(0.035, t0 + 0.04)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28)
    osc.connect(g)
    g.connect(master)
    osc.start(t0)
    osc.stop(t0 + 0.32)
    created.push(osc)
  })

  // Soft kick-ish pulse for groove
  for (let i = 0; i < 4; i += 1) {
    const t0 = startAt + i * (bar / 4)
    const osc = ac.createOscillator()
    const g = ac.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(90, t0)
    osc.frequency.exponentialRampToValueAtTime(40, t0 + 0.18)
    g.gain.value = 0.0001
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.linearRampToValueAtTime(0.05, t0 + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2)
    osc.connect(g)
    g.connect(master)
    osc.start(t0)
    osc.stop(t0 + 0.22)
    created.push(osc)
  }

  return created
}

export function startMusic() {
  if (muted || musicOn) return
  const ac = audio()
  if (!ac) return

  const master = ac.createGain()
  master.gain.value = 0.0001
  master.connect(ac.destination)
  master.gain.linearRampToValueAtTime(0.55, ac.currentTime + 0.4)

  const oscillators = []
  const loopSeconds = 1.6
  let next = ac.currentTime + 0.05

  const pump = () => {
    if (muted || !musicOn) return
    oscillators.push(...scheduleBar(ac, master, next))
    // keep array from growing forever
    while (oscillators.length > 80) {
      const old = oscillators.shift()
      try { old.stop() } catch {}
    }
    next += loopSeconds
  }

  musicNodes = { master, oscillators }
  musicOn = true
  pump()
  musicTimer = window.setInterval(pump, loopSeconds * 1000)
}

export function stopMusic() {
  stopMusicInternal()
}

export function isSfxMuted() {
  return muted
}

export function isMusicPlaying() {
  return musicOn && !muted
}

export function setSfxMuted(next) {
  muted = Boolean(next)
  localStorage.setItem('mh_ra_sfx_muted', muted ? '1' : '0')
  if (muted) stopMusicInternal()
  else startMusic()
}

export function playTick() {
  tone(880, 0.05, 'square', 0.025)
}

export function playCoin() {
  tone(660, 0.07, 'triangle', 0.04)
  window.setTimeout(() => tone(990, 0.09, 'triangle', 0.03), 50)
}

export function playWin() {
  tone(523, 0.1, 'sine', 0.035)
  window.setTimeout(() => tone(659, 0.1, 'sine', 0.035), 80)
  window.setTimeout(() => tone(784, 0.14, 'sine', 0.04), 160)
}

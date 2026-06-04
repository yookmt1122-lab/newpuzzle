let _ctx = null
const ctx = () => {
  if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)()
  return _ctx
}
const resume = () => ctx().state === 'suspended' && ctx().resume()

let muted = false
export const setMuted = (v) => { muted = v }

function tone(freq, dur, delay = 0, vol = 0.3, type = 'triangle') {
  if (muted) return
  const c = ctx()
  const o = c.createOscillator()
  const g = c.createGain()
  o.connect(g)
  g.connect(c.destination)
  o.type = type
  o.frequency.value = freq
  const t = c.currentTime + delay
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(vol, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.001, t + dur)
  o.start(t)
  o.stop(t + dur + 0.05)
}

export function playSnap() {
  resume()
  tone(880, 0.12, 0, 0.35)
  tone(1108, 0.1, 0.08, 0.25)
}

export function playComplete() {
  resume()
  ;[523, 659, 784, 1047].forEach((f, i) => tone(f, 0.35, i * 0.14, 0.3))
}

export function playKeyEarned() {
  resume()
  ;[784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.25, i * 0.1, 0.3, 'sine'))
}

export function playKeyFly() {
  if (muted) return
  resume()
  const c = ctx()
  const buf = c.createBuffer(1, c.sampleRate * 0.6, c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) {
    d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2)
  }
  const src = c.createBufferSource()
  src.buffer = buf
  const filt = c.createBiquadFilter()
  filt.type = 'highpass'
  filt.frequency.value = 1200
  const g = c.createGain()
  g.gain.value = 0.35
  src.connect(filt)
  filt.connect(g)
  g.connect(c.destination)
  src.start()
}

export function playUnlock() {
  resume()
  ;[523, 659, 784, 1047, 1319].forEach((f, i) => {
    tone(f, 0.5, i * 0.12, 0.28, 'sine')
    tone(f * 2, 0.35, i * 0.12, 0.1, 'sine')
  })
}

export function playClick() {
  resume()
  tone(500, 0.06, 0, 0.15)
}

// ── BGM ──────────────────────────────────────────────────────────────────────
let bgmPlaying = false
let bgmTid = null

const TEMPO = 0.27

const MELODY = [
  [523, 1], [659, 1], [784, 1], [659, 1],
  [523, 1], [659, 1], [523, 2],
  [587, 1], [784, 1], [880, 1], [784, 1],
  [587, 1], [784, 1], [587, 2],
  [784, 1], [880, 1], [1047, 1], [880, 1],
  [784, 1], [659, 1], [784, 2],
  [523, 1], [659, 1], [784, 1], [659, 1],
  [523, 2], [0, 2],
]

function scheduleBgm(idx) {
  if (!bgmPlaying) return
  const [freq, beats] = MELODY[idx % MELODY.length]
  if (freq > 0 && !muted) tone(freq, beats * TEMPO * 0.82, 0, 0.15, 'triangle')
  bgmTid = setTimeout(() => scheduleBgm((idx + 1) % MELODY.length), beats * TEMPO * 1000)
}

export function startBgm() {
  if (bgmPlaying) return
  resume()
  bgmPlaying = true
  scheduleBgm(0)
}

export function stopBgm() {
  bgmPlaying = false
  clearTimeout(bgmTid)
  bgmTid = null
}

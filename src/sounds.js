let _ctx = null

function getCtx() {
  if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)()
  return _ctx
}

// iOS はバックグラウンド復帰時に context を suspend する。全 touch で再開する
window.addEventListener('touchstart', () => {
  if (_ctx && _ctx.state !== 'running') _ctx.resume()
}, { passive: true, capture: true })

// ユーザーの直接タップハンドラ内から呼ぶこと（iOS 必須）
export function unlockAudio() {
  const c = getCtx()
  // 無音バッファを再生して iOS の audio session を確立する
  const buf = c.createBuffer(1, 1, c.sampleRate)
  const src = c.createBufferSource()
  src.buffer = buf
  src.connect(c.destination)
  src.start(0)
  c.resume()
}

// context が running なら同期実行、suspended なら resume 後に実行
function withResume(fn) {
  const c = getCtx()
  if (c.state === 'running') {
    fn()
  } else {
    c.resume().then(fn)
  }
}

let muted = false
export const setMuted = (v) => { muted = v }

function tone(freq, dur, delay = 0, vol = 0.3, type = 'triangle') {
  if (muted) return
  const c = getCtx()
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
  withResume(() => {
    tone(880, 0.12, 0, 0.35)
    tone(1108, 0.1, 0.08, 0.25)
  })
}

export function playComplete() {
  withResume(() => {
    ;[523, 659, 784, 1047].forEach((f, i) => tone(f, 0.35, i * 0.14, 0.3))
  })
}

export function playKeyEarned() {
  withResume(() => {
    ;[784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.25, i * 0.1, 0.3, 'sine'))
  })
}

export function playKeyFly() {
  if (muted) return
  withResume(() => {
    const c = getCtx()
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
  })
}

export function playUnlock() {
  withResume(() => {
    ;[523, 659, 784, 1047, 1319].forEach((f, i) => {
      tone(f, 0.5, i * 0.12, 0.28, 'sine')
      tone(f * 2, 0.35, i * 0.12, 0.1, 'sine')
    })
  })
}

export function playClick() {
  withResume(() => tone(500, 0.06, 0, 0.15))
}

export function playPop() {
  withResume(() => {
    const c = getCtx()
    const len = Math.floor(c.sampleRate * 0.07)
    const buf = c.createBuffer(1, len, c.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.5)
    }
    const src  = c.createBufferSource()
    src.buffer = buf
    const filt = c.createBiquadFilter()
    filt.type  = 'bandpass'
    filt.frequency.value = 650
    filt.Q.value = 0.7
    const g = c.createGain()
    g.gain.value = 0.9
    src.connect(filt)
    filt.connect(g)
    g.connect(c.destination)
    src.start()
  })
}

export function playBuzz() {
  withResume(() => {
    tone(180, 0.18, 0,    0.45, 'sawtooth')
    tone(140, 0.22, 0.18, 0.45, 'sawtooth')
  })
}

// ── BGM ──────────────────────────────────────────────────────────────────────
let bgmPlaying = false
let bgmTid = null

const SELECT_TEMPO = 0.27
const SELECT_MELODY = [
  [523, 1], [659, 1], [784, 1], [659, 1],
  [523, 1], [659, 1], [523, 2],
  [587, 1], [784, 1], [880, 1], [784, 1],
  [587, 1], [784, 1], [587, 2],
  [784, 1], [880, 1], [1047, 1], [880, 1],
  [784, 1], [659, 1], [784, 2],
  [523, 1], [659, 1], [784, 1], [659, 1],
  [523, 2], [0, 2],
]

const PLAY_TEMPO = 0.19
const PLAY_MELODY = [
  [784, 1], [784, 0.5], [880, 0.5], [784, 1], [698, 1],
  [659, 2], [0, 1],
  [698, 1], [698, 0.5], [784, 0.5], [698, 1], [587, 1],
  [523, 2], [0, 1],
  [784, 1], [880, 1], [1047, 1], [880, 1],
  [784, 1], [698, 1], [784, 2],
  [659, 1], [698, 1], [659, 1], [587, 1],
  [523, 2], [0, 2],
]

// ガチャガチャBGM: 跳ねるカーニバル調
const GACHA_TEMPO = 0.11
const GACHA_MELODY = [
  // フレーズ1: ワクワク上昇
  [784, 0.5], [880, 0.5], [1047, 0.5], [1175, 0.5],
  [1319, 1.5], [0, 0.5],
  [1047, 0.5], [880, 0.5], [784, 0.5], [659, 0.5],
  [523, 1.5], [0, 0.5],
  // フレーズ2: 跳ねるリズム
  [880, 0.5], [880, 0.25], [1047, 0.25], [880, 0.5], [784, 0.5],
  [659, 1], [0, 0.5],
  [784, 0.5], [784, 0.25], [880, 0.25], [784, 0.5], [659, 0.5],
  [523, 1.5], [0, 0.5],
  // フレーズ3: 盛り上がり
  [523, 0.5], [659, 0.5], [784, 0.5], [880, 0.5],
  [1047, 0.5], [1175, 0.5], [1319, 0.5], [1047, 0.5],
  [880, 0.5], [784, 0.5], [659, 0.5], [523, 0.5],
  [523, 2], [0, 1],
]

function scheduleBgm(idx, melody, tempo, wave) {
  if (!bgmPlaying) return
  const [freq, beats] = melody[idx % melody.length]
  if (freq > 0 && !muted) tone(freq, beats * tempo * 0.78, 0, 0.15, wave)
  bgmTid = setTimeout(() => scheduleBgm((idx + 1) % melody.length, melody, tempo, wave), beats * tempo * 1000)
}

export function startBgm(type = 'select') {
  stopBgm()
  bgmPlaying = true
  let melody, tempo, wave
  if (type === 'play') {
    melody = PLAY_MELODY;  tempo = PLAY_TEMPO;  wave = 'triangle'
  } else if (type === 'gacha') {
    melody = GACHA_MELODY; tempo = GACHA_TEMPO; wave = 'square'
  } else {
    melody = SELECT_MELODY; tempo = SELECT_TEMPO; wave = 'triangle'
  }
  withResume(() => {
    if (bgmPlaying) scheduleBgm(0, melody, tempo, wave)
  })
}

export function stopBgm() {
  bgmPlaying = false
  clearTimeout(bgmTid)
  bgmTid = null
}

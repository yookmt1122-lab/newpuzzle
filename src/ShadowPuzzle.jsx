import { useState, useRef, useCallback, useEffect, forwardRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import './ShadowPuzzle.css'
import {
  playSnap, playComplete, playKeyEarned, playKeyFly, playUnlock, playClick,
  playBuzz, playPop, startBgm, stopBgm, setMuted, unlockAudio,
} from './sounds.js'

const ANIMALS = [
  { emoji: '🐙', label: 'タコ' },
  { emoji: '🦁', label: 'ライオン' },
  { emoji: '🐘', label: 'ゾウ' },
  { emoji: '🐮', label: 'ウシ' },
  { emoji: '🐸', label: 'カエル' },
  { emoji: '🐼', label: 'パンダ' },
  { emoji: '🦊', label: 'キツネ' },
  { emoji: '🐬', label: 'イルカ' },
  { emoji: '🦈', label: 'サメ' },
  { emoji: '🐠', label: 'さかな' },
  { emoji: '🦒', label: 'キリン' },
  { emoji: '🐯', label: 'トラ' },
  { emoji: '🦓', label: 'シマウマ' },
  { emoji: '🦋', label: 'チョウ' },
  { emoji: '🐝', label: 'ハチ' },
  { emoji: '🐞', label: 'テントウムシ' },
  { emoji: '🐻', label: 'クマ' },
  { emoji: '🐨', label: 'コアラ' },
  { emoji: '🐰', label: 'ウサギ' },
  { emoji: '🦑', label: 'イカ' },
  { emoji: '🦀', label: 'カニ' },
  { emoji: '🐡', label: 'フグ' },
  { emoji: '🐜', label: 'アリ' },
  { emoji: '🐛', label: 'イモムシ' },
  { emoji: '🦗', label: 'コオロギ' },
  { emoji: '🪲', label: 'コガネムシ' },
  { emoji: '🐍', label: 'ヘビ' },
  { emoji: '🐢', label: 'カメ' },
  { emoji: '🦕', label: 'ブラキオ' },
  { emoji: '🦖', label: 'ティラノ' },
  { emoji: '🐉', label: 'ドラゴン' },
  { emoji: '🐊', label: 'ワニ' },
  { emoji: '🦩', label: 'フラミンゴ' },
  { emoji: '🦦', label: 'カワウソ' },
  { emoji: '🦘', label: 'カンガルー' },
  { emoji: '🦭', label: 'アザラシ' },
  { emoji: '🐺', label: 'オオカミ' },
]
const INITIAL_LOCKED = [
  false, false, false, false, false, false, false, false, false, false,
  true, true, true, true, true, true, true, true, true, true,
  true, true, true, true, true, true, true, true, true, true, true,
  true, true, true, true, true, true,
]

const PIECE_SIZE_MAX = 360

function calcPieceSize() {
  const vw = window.innerWidth
  const vh = window.innerHeight
  // 横: puzzle padding 32px + stage padding 20px = 52px
  const fromWidth  = vw - 52
  // 縦: ステージ＋トレイ両方が収まるよう overhead ~300px を引いて2等分
  const fromHeight = (vh - 300) / 2
  return Math.max(Math.min(fromWidth, fromHeight, PIECE_SIZE_MAX), 200)
}

function usePieceSize() {
  const [size, setSize] = useState(calcPieceSize)
  useEffect(() => {
    const handler = () => setSize(calcPieceSize())
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return size
}

const DIFFICULTY_OPTIONS = [
  { key: 'easy',   nRows: 3, nCols: 1, label: '3ピース' },
  { key: 'medium', nRows: 3, nCols: 2, label: '6ピース' },
  { key: 'hard9',  nRows: 3, nCols: 3, label: '9ピース' },
  { key: 'hard',   nRows: 3, nCols: 4, label: '12ピース' },
]

function EmojiSlice({ emoji, row, col, nRows, nCols, pieceSize, silhouette = false }) {
  const cellW = pieceSize / nCols
  const cellH = pieceSize / nRows
  const emojiSize = Math.round(pieceSize * 0.778)
  return (
    <div className="emoji-slice" style={{ width: cellW, height: cellH }}>
      <div
        className={`emoji-slice__inner${silhouette ? ' emoji-slice__inner--shadow' : ''}`}
        style={{
          left: -(col * cellW),
          top:  -(row * cellH),
          width: pieceSize,
          height: pieceSize,
        }}
      >
        <span style={{ fontSize: emojiSize }}>{emoji}</span>
      </div>
    </div>
  )
}

function shuffled(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

// ── コンフェッティ ────────────────────────────────────────────────────────────
const CONFETTI_COLORS = [
  '#FF6B6B', '#FFE66D', '#4ECDC4', '#45B7D1',
  '#FF9FF3', '#A29BFE', '#FD79A8', '#FDCB6E',
  '#96CEB4', '#FF8C42',
]

function Confetti({ active }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight

    // 左右2か所のクラッカーから噴出
    const particles = Array.from({ length: 140 }, () => {
      const side = Math.random() < 0.5 ? 'left' : 'right'
      const originX = side === 'left'
        ? canvas.width * (0.1 + Math.random() * 0.15)
        : canvas.width * (0.75 + Math.random() * 0.15)
      return {
        x:      originX,
        y:      canvas.height * 0.25 + Math.random() * canvas.height * 0.1,
        w:      Math.random() * 11 + 4,
        h:      Math.random() * 5  + 3,
        color:  CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        vx:     (side === 'left' ? 1 : -1) * (Math.random() * 9 + 3),
        vy:     -(Math.random() * 12 + 4),
        angle:  Math.random() * Math.PI * 2,
        va:     (Math.random() - 0.5) * 0.35,
        gravity: 0.4,
        opacity: 1,
      }
    })

    const startTime = Date.now()
    let rafId

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const elapsed = Date.now() - startTime
      let alive = false

      for (const p of particles) {
        p.vy  += p.gravity
        p.x   += p.vx
        p.y   += p.vy
        p.angle += p.va
        if (elapsed > 1800) p.opacity = Math.max(0, p.opacity - 0.018)

        if (p.opacity > 0 && p.y < canvas.height + 30) {
          alive = true
          ctx.save()
          ctx.globalAlpha = p.opacity
          ctx.translate(p.x, p.y)
          ctx.rotate(p.angle)
          ctx.fillStyle = p.color
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
          ctx.restore()
        }
      }

      if (alive) rafId = requestAnimationFrame(animate)
    }

    rafId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafId)
  }, [active])

  if (!active) return null
  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 500 }}
    />
  )
}

// ── バルーン ──────────────────────────────────────────────────────────────────
const BALLOON_COLORS = [
  '#FF6B6B', '#FFE66D', '#4ECDC4', '#FF9FF3', '#A29BFE',
  '#FD79A8', '#74B9FF', '#FDCB6E', '#55EFC4', '#FF7675',
]

function drawBalloon(ctx, x, y, r, color) {
  // 本体
  ctx.beginPath()
  ctx.ellipse(x, y, r * 0.78, r, 0, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()

  // ハイライト
  ctx.beginPath()
  ctx.ellipse(x - r * 0.22, y - r * 0.28, r * 0.22, r * 0.3, -0.4, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.38)'
  ctx.fill()

  // 結び目
  const knotY = y + r
  ctx.beginPath()
  ctx.moveTo(x - 4, knotY)
  ctx.quadraticCurveTo(x, knotY + 8, x + 4, knotY)
  ctx.fillStyle = color
  ctx.fill()

  // ひも（ゆらゆら曲線）
  ctx.beginPath()
  ctx.moveTo(x, knotY + 8)
  ctx.bezierCurveTo(x + 12, knotY + 30, x - 12, knotY + 55, x + 8, knotY + 80)
  ctx.strokeStyle = 'rgba(0,0,0,0.22)'
  ctx.lineWidth = 1.2
  ctx.stroke()
}

function Balloons({ active, onPop }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight

    const count = 9
    let frame = 0

    const balloons = Array.from({ length: count }, (_, i) => {
      const slot = canvas.width / count
      return {
        x:         slot * i + slot * 0.5 + (Math.random() - 0.5) * slot * 0.6,
        y:         canvas.height + 80 + Math.random() * 80,
        r:         30 + Math.random() * 18,
        color:     BALLOON_COLORS[i % BALLOON_COLORS.length],
        speed:     2.2 + Math.random() * 1.4,
        phase:     Math.random() * Math.PI * 2,
        amplitude: 18 + Math.random() * 18,
        delay:     i * 6 + Math.random() * 10,
        opacity:   1,
        currentX:  0,   // 毎フレーム更新されるゆれ後のX座標
        popped:    false,
        popProg:   0,
      }
    })

    // document レベルで検出（canvas は pointerEvents:none のままにする）
    const handleTap = (e) => {
      const pt = e.touches ? e.touches[0] : e
      const cx = pt.clientX
      const cy = pt.clientY
      for (const b of balloons) {
        if (b.popped || b.opacity <= 0 || frame < b.delay) continue
        // 楕円の内外判定: (dx/rx)^2 + (dy/ry)^2 <= 1
        const dx = (cx - b.currentX) / (b.r * 0.78)
        const dy = (cy - b.y)        / b.r
        if (dx * dx + dy * dy <= 1) {
          b.popped = true
          playPop()
          onPop?.()
          break
        }
      }
    }
    document.addEventListener('touchstart', handleTap, { passive: true })
    document.addEventListener('click',      handleTap)

    let rafId
    const fadeStart = 750

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      frame++
      let alive = false

      for (const b of balloons) {
        // ── ポップ済みのバルーン：弾けるアニメーション ──
        if (b.popped) {
          b.popProg += 0.07
          if (b.popProg < 1) {
            alive = true
            ctx.save()
            ctx.globalAlpha = Math.max(0, 1 - b.popProg * 1.4)
            // 広がるリング
            ctx.beginPath()
            ctx.arc(b.currentX, b.y, b.r * (1 + b.popProg * 2.5), 0, Math.PI * 2)
            ctx.strokeStyle = b.color
            ctx.lineWidth   = b.r * 0.35 * (1 - b.popProg)
            ctx.stroke()
            // 放射状の粒
            for (let i = 0; i < 8; i++) {
              const angle = (i / 8) * Math.PI * 2
              const dist  = b.r * 2.8 * b.popProg
              ctx.beginPath()
              ctx.arc(
                b.currentX + Math.cos(angle) * dist,
                b.y        + Math.sin(angle) * dist,
                5 * (1 - b.popProg),
                0, Math.PI * 2
              )
              ctx.fillStyle = b.color
              ctx.fill()
            }
            ctx.restore()
          }
          continue
        }

        // ── 通常のバルーン ──
        if (frame < b.delay) { alive = true; continue }
        b.y -= b.speed
        b.currentX = b.x + Math.sin(frame * 0.025 + b.phase) * b.amplitude
        if (frame > fadeStart) b.opacity = Math.max(0, b.opacity - 0.004)

        if (b.opacity > 0 && b.y > -b.r * 2 - 100) {
          alive = true
          ctx.save()
          ctx.globalAlpha = b.opacity
          drawBalloon(ctx, b.currentX, b.y, b.r, b.color)
          ctx.restore()
        }
      }

      if (alive) rafId = requestAnimationFrame(animate)
    }

    rafId = requestAnimationFrame(animate)
    return () => {
      cancelAnimationFrame(rafId)
      document.removeEventListener('touchstart', handleTap)
      document.removeEventListener('click',      handleTap)
    }
  }, [active])

  if (!active) return null
  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 499 }}
    />
  )
}

// ── 星プログレス ──────────────────────────────────────────────────────────────
function StarProgress({ starsLit, keyEarnAnim, onCollect }) {
  const count = keyEarnAnim === 'stars' ? 3 : starsLit
  const showKey = keyEarnAnim === 'key'
  const keyRef = useRef(null)

  const handleTap = () => {
    const rect = keyRef.current?.getBoundingClientRect()
    if (rect) onCollect(rect)
  }

  return (
    <div className="star-progress">
      <AnimatePresence>
        {showKey && (
          <motion.div
            key="key-emoji"
            ref={keyRef}
            className="star-progress__key-wrap"
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: [0, 1.9, 1.3, 1.5], rotate: [-20, 15, -8, 0] }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.75 }}
            onClick={handleTap}
            whileTap={{ scale: 1.2 }}
          >
            <span className="star-progress__key-inner">🔑</span>
          </motion.div>
        )}
      </AnimatePresence>
      <div className={`star-progress__stars${showKey ? ' star-progress__stars--hidden' : ''}`}>
        {[0, 1, 2].map(i => {
          const filled = i < count
          return (
            <motion.span
              key={`${i}-${filled}`}
              className={`star-progress__star${filled ? ' star-progress__star--filled' : ' star-progress__star--empty'}`}
              initial={filled ? { scale: 0, opacity: 0 } : { scale: 1, opacity: 1 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={filled ? { type: 'spring', stiffness: 380, damping: 14 } : { duration: 0 }}
            >
              ⭐
            </motion.span>
          )
        })}
      </div>
    </div>
  )
}

// ── 鍵カウンター ──────────────────────────────────────────────────────────────
const KeyCounter = forwardRef(function KeyCounter({ count }, ref) {
  return (
    <div className="key-counter" ref={ref}>
      <span className="key-counter__icon">🔑</span>
      <span className="key-counter__count">{count}</span>
    </div>
  )
})

// ── 風船スコアカウンター ──────────────────────────────────────────────────────
function BalloonScore({ count }) {
  return (
    <div className="balloon-score">
      <span className="balloon-score__icon">🎈</span>
      <span className="balloon-score__count">{count}</span>
    </div>
  )
}

// ── 飛ぶ鍵アニメーション ──────────────────────────────────────────────────────
function FlyingKey({ from, to, onComplete }) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const dist = Math.hypot(dx, dy)
  const arcHeight = Math.min(dist * 0.35, 130)

  return (
    <motion.div
      style={{
        position: 'fixed',
        left: from.x - 16,
        top: from.y - 16,
        width: 32,
        height: 32,
        fontSize: '1.6rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        pointerEvents: 'none',
      }}
      initial={{ x: 0, y: 0, scale: 1, opacity: 1, rotate: 0 }}
      animate={{
        x:       [0, dx / 2,             dx],
        y:       [0, dy / 2 - arcHeight,  dy],
        scale:   [1, 1.8,               0.6],
        opacity: [1, 1,                  0],
        rotate:  [0, -30,                0],
      }}
      transition={{ duration: 0.65, ease: 'easeInOut', times: [0, 0.5, 1] }}
      onAnimationComplete={onComplete}
    >
      🔑
    </motion.div>
  )
}

// ── 選択画面 ──────────────────────────────────────────────────────────────────
function SelectScreen({ animalIndex, lockedStatus, keyCount, isAnimating,
                        difficulty, starsLit, keyEarnAnim, onCollect,
                        onPrev, onNext, onStart, onUnlock, onDifficultyChange }) {
  const n = ANIMALS.length
  const prevIdx = (animalIndex - 1 + n) % n
  const nextIdx = (animalIndex + 1) % n

  const prev = ANIMALS[prevIdx]
  const curr = ANIMALS[animalIndex]
  const next = ANIMALS[nextIdx]

  const isCurrentLocked = lockedStatus[animalIndex]
  const isPrevLocked    = lockedStatus[prevIdx]
  const isNextLocked    = lockedStatus[nextIdx]
  const canUnlock       = isCurrentLocked && keyCount > 0

  const centerRef = useRef(null)
  const [rejectAnim, setRejectAnim] = useState(false)

  const handleUnlockClick = () => {
    if (isAnimating) return
    if (!canUnlock) {
      playBuzz()
      setRejectAnim(false)
      requestAnimationFrame(() => requestAnimationFrame(() => setRejectAnim(true)))
      return
    }
    const rect = centerRef.current?.getBoundingClientRect()
    onUnlock(rect)
  }

  return (
    <div className="select-screen">
      <h1 className="puzzle__title">かげえパズル</h1>
      <p className="select__subtitle">どうぶつをえらんでね！</p>

      <StarProgress starsLit={starsLit} keyEarnAnim={keyEarnAnim} onCollect={onCollect} />

      <div className="select__row">
        <button className="carousel__btn" onClick={onPrev} aria-label="前の動物">◀</button>

        <div className="carousel-track">
          <div className="carousel-item carousel-item--side" onClick={onPrev} role="button">
            <div className="carousel-item__preview">
              <span>{prev.emoji}</span>
              {isPrevLocked && <span className="lock-badge">🔒</span>}
            </div>
          </div>

          <div className="carousel-item carousel-item--center" ref={centerRef}>
            <div className={`carousel-item__preview${isCurrentLocked ? ' carousel-item__preview--locked' : ''}`}>
              <span
                key={animalIndex}
                className={`carousel-item__emoji${rejectAnim ? ' carousel-item__emoji--rejected' : ''}`}
                onAnimationEnd={(e) => { if (e.animationName === 'emoji-reject') setRejectAnim(false) }}
              >{curr.emoji}</span>
              <AnimatePresence>
                {isCurrentLocked && (
                  <motion.div
                    className={`lock-overlay${canUnlock ? ' lock-overlay--tappable' : ''}`}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0, transition: { duration: 0.25 } }}
                  >
                    🔒
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <span className="carousel-item__name">{curr.label}</span>
          </div>

          <div className="carousel-item carousel-item--side" onClick={onNext} role="button">
            <div className="carousel-item__preview">
              <span>{next.emoji}</span>
              {isNextLocked && <span className="lock-badge">🔒</span>}
            </div>
          </div>
        </div>

        <button className="carousel__btn" onClick={onNext} aria-label="次の動物">▶</button>
      </div>

      <div className="carousel__dots">
        {ANIMALS.map((_, i) => (
          <span
            key={i}
            className={`carousel__dot${i === animalIndex ? ' carousel__dot--active' : ''}`}
          />
        ))}
      </div>

      <div className="difficulty-selector">
        {DIFFICULTY_OPTIONS.map(({ key, label }) => (
          <button
            key={key}
            className={`btn-difficulty${difficulty === key ? ' btn-difficulty--active' : ''}`}
            onClick={() => onDifficultyChange(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {isCurrentLocked ? (
        <button
          className={`btn-start btn-start--lock${canUnlock ? ' btn-start--unlockable' : ' btn-start--disabled'}`}
          onClick={handleUnlockClick}
          disabled={isAnimating}
        >
          {canUnlock ? '🔑 アンロック！' : '🔒 鍵が必要'}
        </button>
      ) : (
        <button className="btn-start" onClick={onStart}>
          スタート！🎮
        </button>
      )}
    </div>
  )
}

// ── 透明ピース検出 ────────────────────────────────────────────────────────────
const DETECT_SIZE = 300

function detectTransparentPieces(emoji, nRows, nCols) {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = DETECT_SIZE
    canvas.height = DETECT_SIZE
    const ctx = canvas.getContext('2d')
    ctx.font = `${Math.round(DETECT_SIZE * 0.778)}px serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(emoji, DETECT_SIZE / 2, DETECT_SIZE / 2)
    const cw = DETECT_SIZE / nCols
    const ch = DETECT_SIZE / nRows
    const result = new Set()
    for (let r = 0; r < nRows; r++) {
      for (let c = 0; c < nCols; c++) {
        const x = Math.round(c * cw)
        const y = Math.round(r * ch)
        const w = Math.round(cw)
        const h = Math.round(ch)
        const { data } = ctx.getImageData(x, y, w, h)
        let opaque = 0
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] > 10) opaque++
        }
        if (opaque / (w * h) < 0.05) result.add(r * nCols + c)
      }
    }
    return result
  } catch {
    return new Set()
  }
}

// ── プレイ画面 ────────────────────────────────────────────────────────────────
function PlayScreen({ animal, clearCount, difficulty, pieceSize, onBack, onComplete, onBalloonPop }) {
  const { nRows, nCols } = DIFFICULTY_OPTIONS.find(d => d.key === difficulty)
  const totalPieces = nRows * nCols
  const cellW = pieceSize / nCols
  const cellH = pieceSize / nRows
  const snapThreshold = Math.min(cellW, cellH) * 0.8

  const [transparentSet] = useState(() => detectTransparentPieces(animal.emoji, nRows, nCols))

  const [placed, setPlaced] = useState(() =>
    Object.fromEntries(Array.from({ length: totalPieces }, (_, i) => [i, transparentSet.has(i)]))
  )
  const [trayOrder, setTrayOrder] = useState(() =>
    shuffled(Array.from({ length: totalPieces }, (_, i) => i).filter(i => !transparentSet.has(i)))
  )
  const [drag, setDrag] = useState(null)
  const [popLabels, setPopLabels] = useState([])

  const slotRefs     = useRef([])
  const keyEarnedRef = useRef(false)

  const handleBalloonPop = useCallback(() => {
    onBalloonPop()
    const id = Date.now() + Math.random()
    setPopLabels(prev => [...prev, id])
    setTimeout(() => setPopLabels(prev => prev.filter(x => x !== id)), 850)
  }, [onBalloonPop])

  const allPlaced = Object.values(placed).every(Boolean)

  useEffect(() => {
    if (allPlaced && !keyEarnedRef.current) {
      keyEarnedRef.current = true
      playComplete()
      onComplete()
    }
  }, [allPlaced, onComplete])

  const reset = useCallback(() => {
    setPlaced(Object.fromEntries(Array.from({ length: totalPieces }, (_, i) => [i, transparentSet.has(i)])))
    setTrayOrder(shuffled(Array.from({ length: totalPieces }, (_, i) => i).filter(i => !transparentSet.has(i))))
  }, [totalPieces, transparentSet])

  const startDrag = useCallback((e, pieceId) => {
    if (placed[pieceId]) return
    e.preventDefault()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    setDrag({ pieceId, x: clientX, y: clientY })
  }, [placed])

  const onMove = useCallback((e) => {
    if (!drag) return
    e.preventDefault()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    setDrag(prev => prev ? { ...prev, x: clientX, y: clientY } : null)
  }, [drag])

  const onRelease = useCallback(() => {
    if (!drag) return
    const { pieceId, x, y } = drag
    slotRefs.current.forEach((el, targetId) => {
      if (!el || placed[targetId]) return
      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      if (Math.hypot(x - cx, y - cy) < snapThreshold && targetId === pieceId) {
        setPlaced(prev => ({ ...prev, [pieceId]: true }))
        playSnap()
      }
    })
    setDrag(null)
  }, [drag, placed, snapThreshold])

  useEffect(() => {
    if (!drag) return
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onRelease)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onRelease)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onRelease)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onRelease)
    }
  }, [drag, onMove, onRelease])

  const floatingPiece = drag && (() => {
    const r = Math.floor(drag.pieceId / nCols)
    const c = drag.pieceId % nCols
    return (
      <div
        className="piece piece--floating"
        style={{
          left: drag.x - cellW / 2,
          top:  drag.y - cellH / 2,
          width: cellW,
          height: cellH,
        }}
      >
        <EmojiSlice emoji={animal.emoji} row={r} col={c} nRows={nRows} nCols={nCols} pieceSize={pieceSize} />
      </div>
    )
  })()

  return (
    <main className="puzzle">
      <Confetti active={allPlaced} />
      <Balloons active={allPlaced} onPop={handleBalloonPop} />

      <AnimatePresence>
        {popLabels.map(id => (
          <motion.div
            key={id}
            style={{
              position: 'fixed',
              left: '50%',
              top: '44%',
              x: '-50%',
              y: '-50%',
              zIndex: 600,
              pointerEvents: 'none',
              fontSize: '5rem',
              fontWeight: 900,
              color: '#FF6B6B',
              textShadow: '0 4px 16px rgba(255,107,107,0.5), 0 2px 4px rgba(0,0,0,0.15)',
              userSelect: 'none',
            }}
            initial={{ scale: 0.2, opacity: 0, y: '-50%' }}
            animate={{
              scale:   [0.2, 1.7, 1.2, 1.5, 1.0],
              opacity: [0,   1,   1,   1,   0  ],
              y:       ['-50%', '-65%', '-60%', '-70%', '-90%'],
            }}
            transition={{ duration: 0.85, times: [0, 0.25, 0.45, 0.65, 1], ease: 'easeOut' }}
          >
            ＋１
          </motion.div>
        ))}
      </AnimatePresence>
      <div className="play__header">
        <button className="btn-back" onClick={onBack}>◀ もどる</button>
        <div className="play__animal">
          <span>{animal.emoji}</span>
          <span className="play__animal-name">{animal.label}</span>
        </div>
      </div>

      <section className="puzzle__stage">
        <p className="stage__label">ここにはめよう！</p>
        <div className={`stage__slots${drag ? ' stage__slots--active' : ''}`}>
          {Array.from({ length: nRows }, (_, r) => (
            <div key={r} style={{ display: 'flex' }}>
              {Array.from({ length: nCols }, (_, c) => {
                const id = r * nCols + c
                return (
                  <div
                    key={c}
                    className={`slot${placed[id] ? ' slot--filled' : ''}`}
                    ref={el => { slotRefs.current[id] = el }}
                    style={{ height: cellH, width: cellW }}
                  >
                    <EmojiSlice emoji={animal.emoji} row={r} col={c} nRows={nRows} nCols={nCols} pieceSize={pieceSize} silhouette />
                    {placed[id] && (
                      <div className="slot__placed">
                        <EmojiSlice emoji={animal.emoji} row={r} col={c} nRows={nRows} nCols={nCols} pieceSize={pieceSize} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
        {allPlaced && (
          <div className="puzzle__complete">
            <span>🎉 やったー！ 🎉</span>
            <p className="puzzle__complete-key">
              {'⭐'.repeat(clearCount % 3 || 3)}{'☆'.repeat(3 - (clearCount % 3 || 3))} → 🔑
            </p>
            <div className="puzzle__complete-btns">
              <button className="btn-reset" onClick={reset}>もういちど！</button>
              <button className="btn-reset btn-reset--back" onClick={onBack}>ほかのどうぶつ</button>
            </div>
          </div>
        )}
      </section>

      <section className="puzzle__tray">
        <p className="tray__label">ドラッグしてね！</p>
        <div className="tray__pieces">
          {trayOrder.map((pieceId) => {
            const r = Math.floor(pieceId / nCols)
            const c = pieceId % nCols
            const isPlaced   = placed[pieceId]
            const isDragging = drag?.pieceId === pieceId
            return (
              <div
                key={pieceId}
                className={`piece${isPlaced ? ' piece--placed' : ''}${isDragging ? ' piece--dragging' : ''}`}
                style={{ width: cellW, height: cellH }}
                onMouseDown={isPlaced ? undefined : (e) => startDrag(e, pieceId)}
                onTouchStart={isPlaced ? undefined : (e) => startDrag(e, pieceId)}
              >
                {!isPlaced && <EmojiSlice emoji={animal.emoji} row={r} col={c} nRows={nRows} nCols={nCols} pieceSize={pieceSize} />}
              </div>
            )
          })}
        </div>
      </section>

      {floatingPiece}
    </main>
  )
}

// ── localStorage キー ─────────────────────────────────────────────────────────
const LS = {
  keyCount:    'puzzle_keyCount',
  locked:      'puzzle_lockedStatus',
  clearCount:  'puzzle_clearCount',
}

function lsGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw !== null ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

// ── ルート ────────────────────────────────────────────────────────────────────
export default function ShadowPuzzle() {
  const pieceSize = usePieceSize()

  const [screen, setScreen] = useState('select')
  const [animalIndex, setAnimalIndex] = useState(0)
  const [difficulty, setDifficulty] = useState('easy')

  const [keyCount,     setKeyCount]     = useState(() => lsGet(LS.keyCount,   0))
  const [lockedStatus, setLockedStatus] = useState(() => {
    const saved = lsGet(LS.locked, null)
    if (!Array.isArray(saved)) return INITIAL_LOCKED
    if (saved.length === ANIMALS.length) return saved
    const padded = [...saved]
    while (padded.length < ANIMALS.length) padded.push(true)
    return padded.slice(0, ANIMALS.length)
  })
  const [clearCount,   setClearCount]   = useState(() => lsGet(LS.clearCount, 0))

  const [flyKey,        setFlyKey]       = useState(null)
  const [soundOn,       setSoundOn]      = useState(true)
  const [keyEarnAnim,   setKeyEarnAnim]  = useState(null)
  const [balloonScore,  setBalloonScore] = useState(0)

  const keyCounterRef = useRef(null)
  const pendingKeyRef = useRef(false)

  useEffect(() => {
    let started = false
    const start = () => {
      if (started) return
      started = true
      unlockAudio()
      startBgm('select')
      window.removeEventListener('touchstart', start)
      window.removeEventListener('pointerdown', start)
    }
    window.addEventListener('touchstart', start, { passive: true })
    window.addEventListener('pointerdown', start)
    return () => {
      window.removeEventListener('touchstart', start)
      window.removeEventListener('pointerdown', start)
    }
  }, [])

  const toggleSound = useCallback(() => {
    setSoundOn(prev => {
      const next = !prev
      setMuted(!next)
      if (next) startBgm(screen === 'play' ? 'play' : 'select')
      else stopBgm()
      return next
    })
  }, [screen])

  useEffect(() => { localStorage.setItem(LS.keyCount,   JSON.stringify(keyCount))     }, [keyCount])
  useEffect(() => { localStorage.setItem(LS.locked,     JSON.stringify(lockedStatus)) }, [lockedStatus])
  useEffect(() => { localStorage.setItem(LS.clearCount, JSON.stringify(clearCount))   }, [clearCount])

  useEffect(() => {
    if (clearCount > 0 && clearCount % 3 === 0) {
      pendingKeyRef.current = true
    }
  }, [clearCount])

  useEffect(() => {
    if (screen !== 'select' || !pendingKeyRef.current) return
    pendingKeyRef.current = false
    setKeyEarnAnim('stars')
    const t1 = setTimeout(() => setKeyEarnAnim('key'), 800)
    return () => clearTimeout(t1)
  }, [screen])

  const handleDebugReset = useCallback(() => {
    localStorage.clear()
    setKeyCount(0)
    setLockedStatus(INITIAL_LOCKED)
    setClearCount(0)
    setScreen('select')
    setAnimalIndex(0)
  }, [])

  const handleUnlockAll = useCallback(() => {
    const all = ANIMALS.map(() => false)
    setLockedStatus(all)
  }, [])

  const prevAnimal = useCallback(() => {
    playClick()
    setAnimalIndex(i => (i - 1 + ANIMALS.length) % ANIMALS.length)
  }, [])

  const nextAnimal = useCallback(() => {
    playClick()
    setAnimalIndex(i => (i + 1) % ANIMALS.length)
  }, [])

  const handleCollectKey = useCallback((fromRect) => {
    if (flyKey || !fromRect) return
    const counterRect = keyCounterRef.current?.getBoundingClientRect()
    if (!counterRect) return
    setKeyEarnAnim(null)
    playKeyFly()
    setFlyKey({
      type: 'collect',
      from: { x: fromRect.left + fromRect.width  / 2, y: fromRect.top  + fromRect.height / 2 },
      to:   { x: counterRect.left + counterRect.width / 2, y: counterRect.top + counterRect.height / 2 },
    })
  }, [flyKey])

  const handleUnlock = useCallback((targetRect) => {
    if (flyKey) return
    if (keyCount > 0) {
      playKeyFly()
      const counterRect = keyCounterRef.current?.getBoundingClientRect()
      if (counterRect && targetRect) {
        setFlyKey({
          type: 'unlock',
          from: {
            x: counterRect.left + counterRect.width  / 2,
            y: counterRect.top  + counterRect.height / 2,
          },
          to: {
            x: targetRect.left + targetRect.width  / 2,
            y: targetRect.top  + targetRect.height / 2,
          },
          animalIdx: animalIndex,
        })
      }
    }
  }, [flyKey, keyCount, animalIndex])

  const applyFlyComplete = useCallback(() => {
    if (!flyKey) return
    if (flyKey.type === 'collect') {
      setKeyCount(k => k + 1)
      playKeyEarned()
    } else {
      const idx = flyKey.animalIdx
      setKeyCount(k => k - 1)
      setLockedStatus(prev => prev.map((locked, i) => i === idx ? false : locked))
      playUnlock()
    }
    setFlyKey(null)
  }, [flyKey])

  const handleComplete = useCallback(() => {
    setClearCount(prev => prev + 1)
  }, [])

  const handleStart = useCallback(() => {
    setBalloonScore(0)
    startBgm('play')
    setScreen('play')
  }, [])

  const handleBack = useCallback(() => {
    setBalloonScore(0)
    startBgm('select')
    setScreen('select')
  }, [])

  return (
    <>
      <KeyCounter ref={keyCounterRef} count={keyCount} />
      {screen === 'play' && <BalloonScore count={balloonScore} />}

      <button className="btn-debug-reset" onClick={handleDebugReset} aria-label="データをリセット">
        🗑
      </button>

      <button className="btn-unlock-all" onClick={handleUnlockAll} aria-label="全鍵開放" />

      <button className="btn-sound-toggle" onClick={toggleSound} aria-label="サウンドトグル">
        {soundOn ? '🔊' : '🔇'}
      </button>

      <AnimatePresence>
        {flyKey && (
          <FlyingKey
            key="flying-key"
            from={flyKey.from}
            to={flyKey.to}
            onComplete={applyFlyComplete}
          />
        )}
      </AnimatePresence>

      {screen === 'select' ? (
        <SelectScreen
          animalIndex={animalIndex}
          lockedStatus={lockedStatus}
          keyCount={keyCount}
          isAnimating={!!flyKey}
          difficulty={difficulty}
          starsLit={clearCount % 3}
          keyEarnAnim={keyEarnAnim}
          onCollect={handleCollectKey}
          onPrev={prevAnimal}
          onNext={nextAnimal}
          onStart={handleStart}
          onUnlock={handleUnlock}
          onDifficultyChange={setDifficulty}
        />
      ) : (
        <PlayScreen
          key={`${animalIndex}-${difficulty}`}
          animal={ANIMALS[animalIndex]}
          clearCount={clearCount}
          difficulty={difficulty}
          pieceSize={pieceSize}
          onBack={handleBack}
          onComplete={handleComplete}
          onBalloonPop={() => setBalloonScore(s => s + 1)}
        />
      )}
    </>
  )
}

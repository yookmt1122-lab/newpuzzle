import { useState, useRef, useCallback, useEffect, forwardRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import './ShadowPuzzle.css'

const ANIMALS = [
  { emoji: '🐙', label: 'タコ' },
  { emoji: '🦁', label: 'ライオン' },
  { emoji: '🐘', label: 'ゾウ' },
  { emoji: '🐮', label: 'ウシ' },
  { emoji: '🐸', label: 'カエル' },
  { emoji: '🐼', label: 'パンダ' },
  { emoji: '🦊', label: 'キツネ' },
]
const INITIAL_LOCKED = [false, false, false, false, true, true, true]

const PIECE_SIZE = 180
const EMOJI_SIZE  = 140
const PART_HEIGHT = PIECE_SIZE / 3
const SNAP_THRESHOLD = 65

function EmojiSlice({ emoji, sliceIndex, silhouette = false }) {
  return (
    <div className="emoji-slice" style={{ height: PART_HEIGHT, width: PIECE_SIZE }}>
      <div
        className={`emoji-slice__inner${silhouette ? ' emoji-slice__inner--shadow' : ''}`}
        style={{ top: -(sliceIndex * PART_HEIGHT), width: PIECE_SIZE, height: PIECE_SIZE }}
      >
        <span style={{ fontSize: EMOJI_SIZE }}>{emoji}</span>
      </div>
    </div>
  )
}

function shuffled(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

// ── 鍵カウンター ──────────────────────────────────────────────────────────────
// forwardRef で DOM rect を親から取得できるようにする
const KeyCounter = forwardRef(function KeyCounter({ count }, ref) {
  return (
    <div className="key-counter" ref={ref}>
      <span className="key-counter__icon">🔑</span>
      <span className="key-counter__count">{count}</span>
    </div>
  )
})

// ── 飛ぶ鍵アニメーション ──────────────────────────────────────────────────────
// from/to は viewport 座標の中心点
function FlyingKey({ from, to, onComplete }) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const dist = Math.hypot(dx, dy)
  // 放物線の頂点高さ：距離の35%、最大130px
  const arcHeight = Math.min(dist * 0.35, 130)

  return (
    <motion.div
      style={{
        position: 'fixed',
        // 要素の中心が from に来るよう 16px ずらす
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
        x:       [0, dx / 2,            dx],
        y:       [0, dy / 2 - arcHeight, dy],
        scale:   [1, 1.8,              0.6],
        opacity: [1, 1,                0],
        rotate:  [0, -30,              0],
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
                        onPrev, onNext, onStart, onUnlock }) {
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

  // カルーセル中央の ref：鍵の飛び先として使う
  const centerRef = useRef(null)

  const handleUnlockClick = () => {
    if (isAnimating) return
    const rect = centerRef.current?.getBoundingClientRect()
    onUnlock(rect)
  }

  return (
    <div className="select-screen">
      <h1 className="puzzle__title">かげえパズル</h1>
      <p className="select__subtitle">どうぶつをえらんでね！</p>

      <div className="select__row">
        <button className="carousel__btn" onClick={onPrev} aria-label="前の動物">◀</button>

        <div className="carousel-track">
          {/* 前の動物 */}
          <div className="carousel-item carousel-item--side" onClick={onPrev} role="button">
            <div className="carousel-item__preview">
              <span>{prev.emoji}</span>
              {isPrevLocked && <span className="lock-badge">🔒</span>}
            </div>
          </div>

          {/* 現在の動物（鍵の飛び先） */}
          <div className="carousel-item carousel-item--center" ref={centerRef}>
            <div className={`carousel-item__preview${isCurrentLocked ? ' carousel-item__preview--locked' : ''}`}>
              <span key={animalIndex} className="carousel-item__emoji">{curr.emoji}</span>
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

          {/* 次の動物 */}
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

// ── プレイ画面 ────────────────────────────────────────────────────────────────
function PlayScreen({ animal, clearCount, onBack, onComplete }) {
  const [placed, setPlaced] = useState({ 0: false, 1: false, 2: false })
  const [trayOrder, setTrayOrder] = useState(() => shuffled([0, 1, 2]))
  const [drag, setDrag] = useState(null)

  const slotRefs    = useRef([null, null, null])
  const keyEarnedRef = useRef(false)

  const allPlaced = Object.values(placed).every(Boolean)

  useEffect(() => {
    if (allPlaced && !keyEarnedRef.current) {
      keyEarnedRef.current = true
      onComplete()
    }
  }, [allPlaced, onComplete])

  const reset = useCallback(() => {
    setPlaced({ 0: false, 1: false, 2: false })
    setTrayOrder(shuffled([0, 1, 2]))
  }, [])

  const startDrag = useCallback((e, sliceIndex) => {
    if (placed[sliceIndex]) return
    e.preventDefault()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    setDrag({ sliceIndex, x: clientX, y: clientY })
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
    const { sliceIndex, x, y } = drag
    slotRefs.current.forEach((el, targetIndex) => {
      if (!el || placed[targetIndex]) return
      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      if (Math.hypot(x - cx, y - cy) < SNAP_THRESHOLD && targetIndex === sliceIndex) {
        setPlaced(prev => ({ ...prev, [sliceIndex]: true }))
      }
    })
    setDrag(null)
  }, [drag, placed])

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

  const floatingPiece = drag && (
    <div
      className="piece piece--floating"
      style={{
        left: drag.x - PIECE_SIZE / 2,
        top:  drag.y - PART_HEIGHT / 2,
        width: PIECE_SIZE,
        height: PART_HEIGHT,
      }}
    >
      <EmojiSlice emoji={animal.emoji} sliceIndex={drag.sliceIndex} />
    </div>
  )

  return (
    <main className="puzzle">
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
          {[0, 1, 2].map((sliceIndex) => (
            <div
              key={sliceIndex}
              className={`slot${placed[sliceIndex] ? ' slot--filled' : ''}`}
              ref={el => slotRefs.current[sliceIndex] = el}
              style={{ height: PART_HEIGHT, width: PIECE_SIZE }}
            >
              <EmojiSlice emoji={animal.emoji} sliceIndex={sliceIndex} silhouette />
              {placed[sliceIndex] && (
                <div className="slot__placed">
                  <EmojiSlice emoji={animal.emoji} sliceIndex={sliceIndex} />
                </div>
              )}
            </div>
          ))}
        </div>
        {allPlaced && (
          <div className="puzzle__complete">
            <span>🎉 やったー！ 🎉</span>
            {clearCount % 3 === 0
              ? <p className="puzzle__complete-key">🔑 鍵を1つ手に入れた！</p>
              : <p className="puzzle__complete-key">あと {3 - (clearCount % 3)} かいクリアで鍵ゲット！</p>
            }
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
          {trayOrder.map((sliceIndex) => {
            const isPlaced   = placed[sliceIndex]
            const isDragging = drag?.sliceIndex === sliceIndex
            return (
              <div
                key={sliceIndex}
                className={`piece${isPlaced ? ' piece--placed' : ''}${isDragging ? ' piece--dragging' : ''}`}
                style={{ width: PIECE_SIZE, height: PART_HEIGHT }}
                onMouseDown={isPlaced ? undefined : (e) => startDrag(e, sliceIndex)}
                onTouchStart={isPlaced ? undefined : (e) => startDrag(e, sliceIndex)}
              >
                {!isPlaced && <EmojiSlice emoji={animal.emoji} sliceIndex={sliceIndex} />}
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
  const [screen, setScreen] = useState('select')
  const [animalIndex, setAnimalIndex] = useState(0)

  // localStorage から初期値を復元（なければデフォルト）
  const [keyCount,     setKeyCount]     = useState(() => lsGet(LS.keyCount,   0))
  const [lockedStatus, setLockedStatus] = useState(() => lsGet(LS.locked,     INITIAL_LOCKED))
  const [clearCount,   setClearCount]   = useState(() => lsGet(LS.clearCount, 0))

  const [flyKey, setFlyKey] = useState(null)

  const keyCounterRef = useRef(null)

  // 状態が変わるたびに localStorage へ保存
  useEffect(() => { localStorage.setItem(LS.keyCount,   JSON.stringify(keyCount))     }, [keyCount])
  useEffect(() => { localStorage.setItem(LS.locked,     JSON.stringify(lockedStatus)) }, [lockedStatus])
  useEffect(() => { localStorage.setItem(LS.clearCount, JSON.stringify(clearCount))   }, [clearCount])

  // 3クリアごとに鍵を1つ付与
  useEffect(() => {
    if (clearCount > 0 && clearCount % 3 === 0) {
      setKeyCount(k => k + 1)
    }
  }, [clearCount])

  // デバッグ用：全データをリセット
  const handleDebugReset = useCallback(() => {
    localStorage.clear()
    setKeyCount(0)
    setLockedStatus(INITIAL_LOCKED)
    setClearCount(0)
    setScreen('select')
    setAnimalIndex(0)
  }, [])

  const prevAnimal = useCallback(() => {
    setAnimalIndex(i => (i - 1 + ANIMALS.length) % ANIMALS.length)
  }, [])

  const nextAnimal = useCallback(() => {
    setAnimalIndex(i => (i + 1) % ANIMALS.length)
  }, [])

  // SelectScreen から targetRect（カルーセル中央の DOMRect）を受け取る
  const handleUnlock = useCallback((targetRect) => {
    if (flyKey) return // アニメーション中は無視
    if (keyCount > 0) {
      const counterRect = keyCounterRef.current?.getBoundingClientRect()
      if (counterRect && targetRect) {
        setFlyKey({
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
        // アニメーション完了は FlyingKey の onAnimationComplete で処理
      }
    } else {
      alert('鍵が足りません！')
    }
  }, [flyKey, keyCount, animalIndex])

  // FlyingKey アニメーション完了時に状態を更新
  const applyUnlock = useCallback(() => {
    if (!flyKey) return
    const idx = flyKey.animalIdx
    setKeyCount(k => k - 1)
    setLockedStatus(prev => prev.map((locked, i) => i === idx ? false : locked))
    setFlyKey(null)
  }, [flyKey])

  const handleComplete = useCallback(() => {
    setClearCount(prev => prev + 1)
  }, [])

  return (
    <>
      <KeyCounter ref={keyCounterRef} count={keyCount} />

      {/* デバッグ用リセットボタン（左下固定）*/}
      <button className="btn-debug-reset" onClick={handleDebugReset} aria-label="データをリセット">
        🗑
      </button>

      {/* 飛ぶ鍵（画面をまたぐので最上位に置く）*/}
      <AnimatePresence>
        {flyKey && (
          <FlyingKey
            key="flying-key"
            from={flyKey.from}
            to={flyKey.to}
            onComplete={applyUnlock}
          />
        )}
      </AnimatePresence>

      {screen === 'select' ? (
        <SelectScreen
          animalIndex={animalIndex}
          lockedStatus={lockedStatus}
          keyCount={keyCount}
          isAnimating={!!flyKey}
          onPrev={prevAnimal}
          onNext={nextAnimal}
          onStart={() => setScreen('play')}
          onUnlock={handleUnlock}
        />
      ) : (
        <PlayScreen
          key={animalIndex}
          animal={ANIMALS[animalIndex]}
          clearCount={clearCount}
          onBack={() => setScreen('select')}
          onComplete={handleComplete}
        />
      )}
    </>
  )
}

import { useState, useRef, useCallback, useEffect } from 'react'
import './ShadowPuzzle.css'

const ANIMALS = [
  { emoji: '🦁', label: 'ライオン' },
  { emoji: '🐘', label: 'ゾウ' },
  { emoji: '🐮', label: 'ウシ' },
  { emoji: '🐸', label: 'カエル' },
  { emoji: '🐼', label: 'パンダ' },
  { emoji: '🦊', label: 'キツネ' },
]
const INITIAL_LOCKED = [false, false, false, true, true, true]

const PIECE_SIZE = 180
const EMOJI_SIZE = 140
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

// ── 鍵カウンター（常時表示）──────────────────────────────────────────────────
function KeyCounter({ count }) {
  return (
    <div className="key-counter">
      <span className="key-counter__icon">🔑</span>
      <span className="key-counter__count">{count}</span>
    </div>
  )
}

// ── 選択画面 ──────────────────────────────────────────────────────────────────
function SelectScreen({ animalIndex, lockedStatus, keyCount, onPrev, onNext, onStart, onUnlock }) {
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

          {/* 現在の動物 */}
          <div className="carousel-item carousel-item--center">
            <div className={`carousel-item__preview${isCurrentLocked ? ' carousel-item__preview--locked' : ''}`}>
              <span key={animalIndex} className="carousel-item__emoji">{curr.emoji}</span>
              {isCurrentLocked && (
                <div className={`lock-overlay${canUnlock ? ' lock-overlay--tappable' : ''}`}>
                  🔒
                </div>
              )}
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
          onClick={onUnlock}
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
function PlayScreen({ animal, onBack, onComplete }) {
  const [placed, setPlaced] = useState({ 0: false, 1: false, 2: false })
  const [trayOrder, setTrayOrder] = useState(() => shuffled([0, 1, 2]))
  const [drag, setDrag] = useState(null)

  const slotRefs = useRef([null, null, null])
  const keyEarnedRef = useRef(false)       // 同一セッション内で1度だけ鍵を付与

  const allPlaced = Object.values(placed).every(Boolean)

  // パズルクリア時に鍵を1つ付与（リセットしても2回目は付与しない）
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
            <p className="puzzle__complete-key">🔑 鍵を1つ手に入れた！</p>
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
            const isPlaced = placed[sliceIndex]
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

// ── ルート ────────────────────────────────────────────────────────────────────
export default function ShadowPuzzle() {
  const [screen, setScreen] = useState('select')
  const [animalIndex, setAnimalIndex] = useState(0)
  const [keyCount, setKeyCount] = useState(0)
  const [lockedStatus, setLockedStatus] = useState(INITIAL_LOCKED)

  const prevAnimal = useCallback(() => {
    setAnimalIndex(i => (i - 1 + ANIMALS.length) % ANIMALS.length)
  }, [])

  const nextAnimal = useCallback(() => {
    setAnimalIndex(i => (i + 1) % ANIMALS.length)
  }, [])

  const handleUnlock = useCallback(() => {
    if (keyCount > 0) {
      setKeyCount(k => k - 1)
      setLockedStatus(prev => prev.map((locked, i) => i === animalIndex ? false : locked))
    } else {
      alert('鍵が足りません！')
    }
  }, [keyCount, animalIndex])

  const handleComplete = useCallback(() => {
    setKeyCount(k => k + 1)
  }, [])

  return (
    <>
      <KeyCounter count={keyCount} />

      {screen === 'select' ? (
        <SelectScreen
          animalIndex={animalIndex}
          lockedStatus={lockedStatus}
          keyCount={keyCount}
          onPrev={prevAnimal}
          onNext={nextAnimal}
          onStart={() => setScreen('play')}
          onUnlock={handleUnlock}
        />
      ) : (
        <PlayScreen
          key={animalIndex}
          animal={ANIMALS[animalIndex]}
          onBack={() => setScreen('select')}
          onComplete={handleComplete}
        />
      )}
    </>
  )
}

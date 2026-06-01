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

// ── 選択画面 ──────────────────────────────────────────────────────────────────
function SelectScreen({ animalIndex, onPrev, onNext, onStart }) {
  const prev = ANIMALS[(animalIndex - 1 + ANIMALS.length) % ANIMALS.length]
  const curr = ANIMALS[animalIndex]
  const next = ANIMALS[(animalIndex + 1) % ANIMALS.length]

  return (
    <div className="select-screen">
      <h1 className="puzzle__title">かげえパズル</h1>
      <p className="select__subtitle">どうぶつをえらんでね！</p>

      <div className="select__row">
        <button className="carousel__btn" onClick={onPrev} aria-label="前の動物">◀</button>

        <div className="carousel-track">
          <div className="carousel-item carousel-item--side" onClick={onPrev} role="button">
            <span>{prev.emoji}</span>
          </div>
          <div className="carousel-item carousel-item--center">
            <span key={animalIndex} className="carousel-item__emoji">{curr.emoji}</span>
            <span className="carousel-item__name">{curr.label}</span>
          </div>
          <div className="carousel-item carousel-item--side" onClick={onNext} role="button">
            <span>{next.emoji}</span>
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

      <button className="btn-start" onClick={onStart}>
        スタート！🎮
      </button>
    </div>
  )
}

// ── プレイ画面 ────────────────────────────────────────────────────────────────
function PlayScreen({ animal, onBack }) {
  const [placed, setPlaced] = useState({ 0: false, 1: false, 2: false })
  const [trayOrder, setTrayOrder] = useState(() => shuffled([0, 1, 2]))
  const [drag, setDrag] = useState(null)

  const slotRefs = useRef([null, null, null])
  const allPlaced = Object.values(placed).every(Boolean)

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

  const prevAnimal = useCallback(() => {
    setAnimalIndex(i => (i - 1 + ANIMALS.length) % ANIMALS.length)
  }, [])

  const nextAnimal = useCallback(() => {
    setAnimalIndex(i => (i + 1) % ANIMALS.length)
  }, [])

  if (screen === 'select') {
    return (
      <SelectScreen
        animalIndex={animalIndex}
        onPrev={prevAnimal}
        onNext={nextAnimal}
        onStart={() => setScreen('play')}
      />
    )
  }

  return (
    <PlayScreen
      key={animalIndex}
      animal={ANIMALS[animalIndex]}
      onBack={() => setScreen('select')}
    />
  )
}

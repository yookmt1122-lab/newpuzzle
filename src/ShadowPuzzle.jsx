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

export default function ShadowPuzzle() {
  const [animalIndex, setAnimalIndex] = useState(0)
  const animal = ANIMALS[animalIndex]

  const [placed, setPlaced] = useState({ 0: false, 1: false, 2: false })
  const [trayOrder, setTrayOrder] = useState(() => shuffled([0, 1, 2]))
  const [drag, setDrag] = useState(null)
  const [carouselKey, setCarouselKey] = useState(0)

  const slotRefs = useRef([null, null, null])

  const allPlaced = Object.values(placed).every(Boolean)

  const changeAnimal = useCallback((idx) => {
    setAnimalIndex(idx)
    setPlaced({ 0: false, 1: false, 2: false })
    setTrayOrder(shuffled([0, 1, 2]))
    setCarouselKey(k => k + 1)
  }, [])

  const prevAnimal = useCallback(() => {
    changeAnimal((animalIndex - 1 + ANIMALS.length) % ANIMALS.length)
  }, [animalIndex, changeAnimal])

  const nextAnimal = useCallback(() => {
    changeAnimal((animalIndex + 1) % ANIMALS.length)
  }, [animalIndex, changeAnimal])

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

  const reset = useCallback(() => {
    setPlaced({ 0: false, 1: false, 2: false })
    setTrayOrder(shuffled([0, 1, 2]))
  }, [])

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
      <h1 className="puzzle__title">かげえパズル</h1>

      {/* Looping carousel */}
      <div className="carousel">
        <button className="carousel__btn carousel__btn--prev" onClick={prevAnimal} aria-label="前の動物">
          ◀
        </button>
        <div className="carousel__center">
          <span key={carouselKey} className="carousel__emoji">{animal.emoji}</span>
          <span className="carousel__name">{animal.label}</span>
        </div>
        <button className="carousel__btn carousel__btn--next" onClick={nextAnimal} aria-label="次の動物">
          ▶
        </button>
      </div>

      {/* Silhouette stage */}
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
            <button className="btn-reset" onClick={reset}>もういちど！</button>
          </div>
        )}
      </section>

      {/* Piece tray */}
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

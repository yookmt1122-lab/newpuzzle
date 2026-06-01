import { useState, useRef, useCallback, useEffect } from 'react'
import './ShadowPuzzle.css'

const ANIMALS = [
  { emoji: '🦁', label: 'ライオン' },
  { emoji: '🐘', label: 'ゾウ' },
  { emoji: '🐮', label: 'ウシ' },
]

const PIECE_SIZE = 180   // container width/height for one full emoji square
const EMOJI_SIZE  = 140  // font-size — smaller than container so it's centered with room to spare
const PART_HEIGHT = PIECE_SIZE / 3  // 60px per slice
const SNAP_THRESHOLD = 65

const PART_LABELS = ['頭', '体', '足']

// Shows one horizontal slice of the emoji (index 0=head, 1=body, 2=legs).
// The emoji is centered in a PIECE_SIZE×PIECE_SIZE inner div so glyph overruns
// don't get clipped — only height is clipped by the outer div.
function EmojiSlice({ emoji, sliceIndex, silhouette = false }) {
  return (
    <div
      className="emoji-slice"
      style={{ height: PART_HEIGHT, width: PIECE_SIZE }}
    >
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

  // placed[sliceIndex] = true when that part is correctly placed
  const [placed, setPlaced] = useState({ 0: false, 1: false, 2: false })

  // Tray order: shuffled indices displayed at the bottom
  const [trayOrder, setTrayOrder] = useState(() => shuffled([0, 1, 2]))

  // Drag state
  const [drag, setDrag] = useState(null)
  // drag = { sliceIndex, x, y, startX, startY }

  // Refs to silhouette slot DOM nodes so we can measure their positions
  const slotRefs = useRef([null, null, null])
  const boardRef = useRef(null)

  const allPlaced = Object.values(placed).every(Boolean)

  // ── drag handlers ──────────────────────────────────────────────────────────

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

    // Check distance from drop position to each silhouette slot center
    slotRefs.current.forEach((el, targetIndex) => {
      if (!el || placed[targetIndex]) return

      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dist = Math.hypot(x - cx, y - cy)

      if (dist < SNAP_THRESHOLD && targetIndex === sliceIndex) {
        setPlaced(prev => ({ ...prev, [sliceIndex]: true }))
      }
    })

    setDrag(null)
  }, [drag, placed])

  // Attach global mouse/touch listeners while dragging
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

  // ── reset ──────────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    setPlaced({ 0: false, 1: false, 2: false })
    setTrayOrder(shuffled([0, 1, 2]))
  }, [])

  const changeAnimal = useCallback((idx) => {
    setAnimalIndex(idx)
    setPlaced({ 0: false, 1: false, 2: false })
    setTrayOrder(shuffled([0, 1, 2]))
  }, [])

  // ── render ─────────────────────────────────────────────────────────────────

  // Floating piece that follows the cursor
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
    <main className="puzzle" ref={boardRef}>
      <h1 className="puzzle__title">影絵合わせパズル</h1>

      {/* Animal selector */}
      <nav className="puzzle__selector">
        {ANIMALS.map((a, i) => (
          <button
            key={i}
            className={`selector__btn${animalIndex === i ? ' selector__btn--active' : ''}`}
            onClick={() => changeAnimal(i)}
          >
            {a.emoji} {a.label}
          </button>
        ))}
      </nav>

      {/* Silhouette target area */}
      <section className="puzzle__stage">
        <div className="stage__label">ここに合わせよう</div>
        <div className="stage__slots">
          {[0, 1, 2].map((sliceIndex) => (
            <div
              key={sliceIndex}
              className={`slot${placed[sliceIndex] ? ' slot--filled' : ''}`}
              ref={el => slotRefs.current[sliceIndex] = el}
              style={{ height: PART_HEIGHT, width: PIECE_SIZE }}
            >
              {/* Silhouette (always visible) */}
              <EmojiSlice emoji={animal.emoji} sliceIndex={sliceIndex} silhouette />
              {/* Placed piece overlay */}
              {placed[sliceIndex] && (
                <div className="slot__placed">
                  <EmojiSlice emoji={animal.emoji} sliceIndex={sliceIndex} />
                </div>
              )}
              {/* Slot label when empty */}
              {!placed[sliceIndex] && (
                <span className="slot__hint">{PART_LABELS[sliceIndex]}</span>
              )}
            </div>
          ))}
        </div>
        {allPlaced && (
          <div className="puzzle__complete">
            <span>🎉 かんせい！</span>
            <button className="btn-reset" onClick={reset}>もう一度</button>
          </div>
        )}
      </section>

      {/* Piece tray */}
      <section className="puzzle__tray">
        <div className="tray__label">ドラッグしてあわせよう</div>
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
                {!isPlaced && <span className="piece__label">{PART_LABELS[sliceIndex]}</span>}
              </div>
            )
          })}
        </div>
      </section>

      {floatingPiece}
    </main>
  )
}

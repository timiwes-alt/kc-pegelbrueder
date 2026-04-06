/**
 * Variante C — Segment-Dots
 * Kein Track-Balken. Stattdessen eine Reihe kleiner Punkte — ein Punkt pro Abend.
 * Der aktive Punkt ist größer und dunkel. Sehr minimalistisch.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAlleAbendeDaten } from '../lib/supabase'

export default function ZeitstrahlNavC({ bis, basisRoute }) {
  const navigate = useNavigate()
  const [abende, setAbende] = useState([])
  const [dragging, setDragging] = useState(false)
  const [dragIndex, setDragIndex] = useState(null)
  const containerRef = useRef(null)

  useEffect(() => {
    getAlleAbendeDaten().then(setAbende).catch(() => {})
  }, [])

  const n = abende.length
  const bisIndex     = bis ? abende.findIndex(a => a.datum === bis) : n
  const currentIndex = bisIndex === -1 ? n : bisIndex
  const activeIndex  = dragging ? (dragIndex ?? n) : currentIndex

  // Map clientX → nearest index (0..n inclusive)
  const getIndexFromClientX = useCallback((clientX) => {
    if (!containerRef.current || n === 0) return n
    const rect = containerRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
    return Math.max(0, Math.min(n, Math.round((x / rect.width) * n)))
  }, [n])

  const navigateTo = useCallback((idx) => {
    if (idx >= n) navigate(basisRoute)
    else navigate(`${basisRoute}?bis=${abende[idx].datum}`)
  }, [n, abende, basisRoute, navigate])

  useEffect(() => {
    if (!dragging) return
    const onMove = (e) => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX
      setDragIndex(getIndexFromClientX(clientX))
    }
    const onUp = (e) => {
      const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX
      setDragging(false)
      navigateTo(getIndexFromClientX(clientX))
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }
  }, [dragging, getIndexFromClientX, navigateTo])

  if (n < 2) return null

  const selectedAbend = activeIndex < n ? abende[activeIndex] : null
  const selectedLabel = selectedAbend
    ? new Date(selectedAbend.datum).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Jetzt'

  const isJetzt = activeIndex >= n
  const thumbPct = (activeIndex / n) * 100

  const labelStyle = thumbPct <= 8
    ? { left: 0 }
    : thumbPct >= 92
    ? { right: 0 }
    : { left: `${thumbPct}%`, transform: 'translateX(-50%)' }

  return (
    <div style={{ marginBottom: 36, userSelect: 'none' }}>
      {/* Date label */}
      <div style={{ position: 'relative', height: 18, marginBottom: 10 }}>
        <div style={{
          position: 'absolute',
          top: 0,
          ...labelStyle,
          fontSize: 11,
          fontFamily: 'var(--serif)',
          color: 'var(--ink)',
          whiteSpace: 'nowrap',
          lineHeight: 1,
          letterSpacing: '0.01em',
          transition: dragging ? 'none' : 'left 0.1s, right 0.1s',
          pointerEvents: 'none',
        }}>
          {selectedLabel}
        </div>
      </div>

      {/* Dot strip */}
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          height: 16,
          cursor: dragging ? 'grabbing' : 'pointer',
        }}
        onMouseDown={(e) => {
          e.preventDefault()
          setDragging(true)
          setDragIndex(getIndexFromClientX(e.clientX))
        }}
        onTouchStart={(e) => {
          setDragging(true)
          setDragIndex(getIndexFromClientX(e.touches[0].clientX))
        }}
        onClick={(e) => { if (!dragging) navigateTo(getIndexFromClientX(e.clientX)) }}
      >
        {/* Evening dots */}
        {abende.map((a, i) => {
          const isActive = i === activeIndex
          const isPast   = i < activeIndex
          return (
            <div
              key={a.id}
              style={{
                position: 'absolute',
                left: `${(i / n) * 100}%`,
                transform: 'translateX(-50%)',
                width:  isActive ? 8 : 4,
                height: isActive ? 8 : 4,
                borderRadius: '50%',
                background: isActive
                  ? 'var(--ink)'
                  : isPast
                  ? 'var(--ink-faint)'
                  : 'var(--paper-mid)',
                transition: dragging
                  ? 'none'
                  : 'width 0.15s, height 0.15s, background 0.15s',
                pointerEvents: 'none',
              }}
            />
          )
        })}

        {/* "Jetzt" dot at far right */}
        <div style={{
          position: 'absolute',
          right: 0,
          transform: 'translateX(50%)',
          width:  isJetzt ? 8 : 4,
          height: isJetzt ? 8 : 4,
          borderRadius: '50%',
          background: isJetzt ? 'var(--ink)' : 'var(--paper-mid)',
          transition: dragging ? 'none' : 'width 0.15s, height 0.15s, background 0.15s',
          pointerEvents: 'none',
        }} />
      </div>

      {/* Year + Jetzt labels below */}
      <div style={{ position: 'relative', height: 16, marginTop: 5 }}>
        {(() => {
          const markers = []
          let lastYear = null
          abende.forEach((a, i) => {
            const y = new Date(a.datum).getFullYear()
            if (y !== lastYear) {
              markers.push({ year: y, pct: (i / n) * 100 })
              lastYear = y
            }
          })
          return markers.map(({ year, pct }) => (
            <span key={year} style={{
              position: 'absolute',
              left: `${pct}%`,
              fontSize: 9,
              color: 'var(--ink-faint)',
              letterSpacing: '0.05em',
              whiteSpace: 'nowrap',
              lineHeight: 1,
            }}>
              {year}
            </span>
          ))
        })()}
        <span style={{
          position: 'absolute',
          right: 0,
          fontSize: 9,
          letterSpacing: '0.07em',
          color: isJetzt ? 'var(--ink)' : 'var(--ink-faint)',
          fontWeight: isJetzt ? 500 : 400,
          lineHeight: 1,
        }}>
          Jetzt
        </span>
      </div>
    </div>
  )
}

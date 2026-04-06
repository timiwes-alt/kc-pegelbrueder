/**
 * Variante B — Hairline + Datums-Pill
 * Kein Thumb-Kreis; stattdessen eine dünne vertikale Linie als Marker.
 * Das Datum erscheint in einem kleinen gerundeten Badge über dem Marker.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAlleAbendeDaten } from '../lib/supabase'

const TRACK_TOP = 36
const MARKER_H  = 14   // height of vertical hairline marker

export default function ZeitstrahlNavB({ bis, basisRoute }) {
  const navigate = useNavigate()
  const [abende, setAbende] = useState([])
  const [dragging, setDragging] = useState(false)
  const [dragIndex, setDragIndex] = useState(null)
  const trackRef = useRef(null)

  useEffect(() => {
    getAlleAbendeDaten().then(setAbende).catch(() => {})
  }, [])

  const n = abende.length
  const bisIndex     = bis ? abende.findIndex(a => a.datum === bis) : n
  const currentIndex = bisIndex === -1 ? n : bisIndex
  const activeIndex  = dragging ? (dragIndex ?? n) : currentIndex

  const getIndexFromClientX = useCallback((clientX) => {
    if (!trackRef.current || n === 0) return n
    const rect = trackRef.current.getBoundingClientRect()
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

  const thumbPct = (activeIndex / n) * 100

  const selectedAbend = activeIndex < n ? abende[activeIndex] : null
  const selectedLabel = selectedAbend
    ? new Date(selectedAbend.datum).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Jetzt'

  // Only label-clamp logic
  const pillLeft = thumbPct <= 12
    ? { left: 0, transform: 'none' }
    : thumbPct >= 88
    ? { right: 0, left: 'auto', transform: 'none' }
    : { left: `${thumbPct}%`, transform: 'translateX(-50%)' }

  const isJetzt = activeIndex >= n

  // First year label
  const firstYear = abende.length > 0 ? new Date(abende[0].datum).getFullYear() : null
  const yearMarkers = []
  let lastYear = null
  abende.forEach((a, i) => {
    const y = new Date(a.datum).getFullYear()
    if (y !== lastYear) {
      yearMarkers.push({ year: y, pct: (i / n) * 100 })
      lastYear = y
    }
  })

  return (
    <div style={{ marginBottom: 36, userSelect: 'none' }}>
      <div
        style={{ position: 'relative', height: TRACK_TOP + 26, cursor: 'pointer' }}
        onClick={(e) => { if (!dragging) navigateTo(getIndexFromClientX(e.clientX)) }}
      >

        {/* Date pill badge */}
        <div style={{
          position: 'absolute',
          top: 0,
          ...pillLeft,
          display: 'inline-flex',
          alignItems: 'center',
          background: isJetzt ? 'var(--ink)' : 'var(--paper-warm)',
          border: `1px solid ${isJetzt ? 'transparent' : 'var(--paper-mid)'}`,
          borderRadius: 99,
          padding: '3px 9px',
          fontSize: 11,
          fontFamily: 'var(--serif)',
          color: isJetzt ? '#fff' : 'var(--ink)',
          whiteSpace: 'nowrap',
          lineHeight: 1.2,
          pointerEvents: 'none',
          transition: dragging ? 'none' : 'left 0.12s, right 0.12s, background 0.15s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
        }}>
          {selectedLabel}
        </div>

        {/* Track */}
        <div
          ref={trackRef}
          style={{
            position: 'absolute',
            top: TRACK_TOP - 0.5,
            left: 0, right: 0,
            height: 1,
            background: 'var(--paper-mid)',
          }}
        />

        {/* Fill */}
        <div style={{
          position: 'absolute',
          top: TRACK_TOP - 0.5,
          left: 0,
          width: `${thumbPct}%`,
          height: 1,
          background: 'var(--ink)',
          pointerEvents: 'none',
          transition: dragging ? 'none' : 'width 0.12s',
        }} />

        {/* Vertical hairline marker */}
        <div
          style={{
            position: 'absolute',
            top: TRACK_TOP - MARKER_H / 2,
            left: `${thumbPct}%`,
            transform: 'translateX(-50%)',
            width: dragging ? 2 : 1.5,
            height: MARKER_H,
            background: 'var(--ink)',
            borderRadius: 2,
            zIndex: 2,
            cursor: dragging ? 'grabbing' : 'grab',
            transition: dragging ? 'none' : 'left 0.12s',
          }}
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setDragging(true)
            setDragIndex(activeIndex)
          }}
          onTouchStart={(e) => {
            e.stopPropagation()
            setDragging(true)
            setDragIndex(activeIndex)
          }}
          onClick={(e) => e.stopPropagation()}
        />

        {/* Invisible wider hit area for the marker */}
        <div
          style={{
            position: 'absolute',
            top: TRACK_TOP - MARKER_H / 2 - 6,
            left: `${thumbPct}%`,
            transform: 'translateX(-50%)',
            width: 24,
            height: MARKER_H + 12,
            zIndex: 3,
            cursor: dragging ? 'grabbing' : 'grab',
          }}
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setDragging(true)
            setDragIndex(activeIndex)
          }}
          onTouchStart={(e) => {
            e.stopPropagation()
            setDragging(true)
            setDragIndex(activeIndex)
          }}
          onClick={(e) => e.stopPropagation()}
        />

        {/* Year labels below */}
        {yearMarkers.map(({ year, pct }) => (
          <div key={year} style={{
            position: 'absolute',
            top: TRACK_TOP + 8,
            left: `${pct}%`,
            fontSize: 9,
            color: 'var(--ink-faint)',
            letterSpacing: '0.05em',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}>
            {year}
          </div>
        ))}

        {/* Jetzt */}
        <div style={{
          position: 'absolute',
          top: TRACK_TOP + 8,
          right: 0,
          fontSize: 9,
          letterSpacing: '0.07em',
          color: isJetzt ? 'var(--ink)' : 'var(--ink-faint)',
          fontWeight: isJetzt ? 500 : 400,
          pointerEvents: 'none',
        }}>
          Jetzt
        </div>
      </div>
    </div>
  )
}

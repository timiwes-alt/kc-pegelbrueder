import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAlleAbendeDaten } from '../lib/supabase'

const TRACK_TOP = 28   // px from container top to track center
const THUMB_R   = 5.5  // thumb radius (11px circle)

export default function ZeitstrahlNav({ bis, basisRoute }) {
  const navigate = useNavigate()
  const [abende, setAbende] = useState([])
  const [dragging, setDragging] = useState(false)
  const [dragIndex, setDragIndex] = useState(null)
  const trackRef = useRef(null)
  const navTimerRef = useRef(null)

  useEffect(() => {
    getAlleAbendeDaten().then(setAbende).catch(() => {})
  }, [])

  const n    = abende.length
  const maxI = Math.max(1, n - 1)  // avoid division by zero

  // No `bis` → rightmost position (= current/aktuell = last evening)
  const bisIndex     = bis ? abende.findIndex(a => a.datum === bis) : n - 1
  const currentIndex = bisIndex === -1 ? n - 1 : bisIndex
  const activeIndex  = dragging ? (dragIndex ?? n - 1) : currentIndex

  const getIndexFromClientX = useCallback((clientX) => {
    if (!trackRef.current || n === 0) return n - 1
    const rect = trackRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
    return Math.max(0, Math.min(n - 1, Math.round((x / rect.width) * maxI)))
  }, [n, maxI])

  const navigateTo = useCallback((idx, delay = 350) => {
    if (navTimerRef.current) clearTimeout(navTimerRef.current)
    navTimerRef.current = setTimeout(() => {
      if (idx >= n - 1) navigate(basisRoute, { replace: true })
      else navigate(`${basisRoute}?bis=${abende[idx].datum}`, { replace: true })
    }, delay)
  }, [n, abende, basisRoute, navigate])

  // Global drag listeners
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

  const thumbPct = (activeIndex / maxI) * 100

  const selectedAbend = abende[activeIndex]
  const selectedLabel = selectedAbend
    ? new Date(selectedAbend.datum).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''

  const isAktuell = activeIndex >= n - 1

  // Year boundary markers (skip first year — implicit at left edge)
  const yearMarkers = []
  let lastYear = null
  abende.forEach((a, i) => {
    const y = new Date(a.datum).getFullYear()
    if (y !== lastYear) {
      if (lastYear !== null) yearMarkers.push({ year: y, pct: (i / maxI) * 100 })
      lastYear = y
    }
  })

  // Clamp floating label so it doesn't overflow at edges
  const labelStyle = thumbPct <= 8
    ? { left: 0 }
    : thumbPct >= 92
    ? { right: 0 }
    : { left: `${thumbPct}%`, transform: 'translateX(-50%)' }

  // Year of first and last evening for edge labels
  const firstYear = abende[0] ? new Date(abende[0].datum).getFullYear() : null
  const lastYear_ = abende[n - 1] ? new Date(abende[n - 1].datum).getFullYear() : null

  return (
    <div style={{ marginBottom: 36, userSelect: 'none' }}>

      {/* Slider container */}
      <div
        style={{ position: 'relative', height: TRACK_TOP + 30, cursor: 'pointer' }}
        onClick={(e) => { if (!dragging) navigateTo(getIndexFromClientX(e.clientX), 150) }}
      >
        {/* Floating date label above thumb */}
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
          transition: dragging ? 'none' : 'left 0.12s, right 0.12s',
          pointerEvents: 'none',
        }}>
          {selectedLabel}
        </div>

        {/* Track background */}
        <div
          ref={trackRef}
          style={{
            position: 'absolute',
            top: TRACK_TOP - 0.5,
            left: 0, right: 0,
            height: 1,
            background: 'var(--paper-mid)',
            borderRadius: 1,
          }}
        />

        {/* Track fill */}
        <div style={{
          position: 'absolute',
          top: TRACK_TOP - 0.5,
          left: 0,
          width: `${thumbPct}%`,
          height: 1,
          background: 'var(--ink-soft)',
          borderRadius: 1,
          pointerEvents: 'none',
          transition: dragging ? 'none' : 'width 0.12s',
        }} />

        {/* Draggable thumb */}
        <div
          style={{
            position: 'absolute',
            top: TRACK_TOP - THUMB_R,
            left: `${thumbPct}%`,
            transform: 'translateX(-50%)',
            width: THUMB_R * 2,
            height: THUMB_R * 2,
            borderRadius: '50%',
            background: 'var(--paper)',
            border: '1.5px solid var(--ink-muted)',
            boxShadow: dragging
              ? '0 2px 10px rgba(0,0,0,0.13)'
              : '0 1px 3px rgba(0,0,0,0.09)',
            cursor: dragging ? 'grabbing' : 'grab',
            zIndex: 2,
            transition: dragging ? 'none' : 'left 0.12s, box-shadow 0.15s',
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

        {/* First year label at left edge */}
        {firstYear && (
          <div style={{
            position: 'absolute',
            top: TRACK_TOP + 8,
            left: 0,
            pointerEvents: 'none',
          }}>
            <span style={{ fontSize: 9, color: 'var(--ink-faint)', letterSpacing: '0.05em' }}>
              {firstYear}
            </span>
          </div>
        )}

        {/* Year boundary markers (years after the first) */}
        {yearMarkers.map(({ year, pct }) => (
          <div key={year} style={{
            position: 'absolute',
            top: TRACK_TOP + 8,
            left: `${pct}%`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
            pointerEvents: 'none',
          }}>
            <div style={{ width: 1, height: 4, background: 'var(--paper-mid)', borderRadius: 1 }} />
            <span style={{ fontSize: 9, color: 'var(--ink-faint)', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
              {year}
            </span>
          </div>
        ))}

        {/* Right end: latest evening year + "aktuell" */}
        <div style={{
          position: 'absolute',
          top: TRACK_TOP + 8,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 2,
          pointerEvents: 'none',
        }}>
          {lastYear_ && lastYear_ !== (yearMarkers[yearMarkers.length - 1]?.year ?? firstYear) && (
            <span style={{ fontSize: 9, color: isAktuell ? 'var(--ink-muted)' : 'var(--ink-faint)', letterSpacing: '0.05em' }}>
              {lastYear_}
            </span>
          )}
          <span style={{
            fontSize: 9,
            letterSpacing: '0.07em',
            color: isAktuell ? 'var(--ink)' : 'var(--ink-faint)',
            fontWeight: isAktuell ? 500 : 400,
          }}>
            aktuell
          </span>
        </div>
      </div>
    </div>
  )
}

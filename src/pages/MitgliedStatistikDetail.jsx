import { useState, useEffect, useRef } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { getMitglied, getKategorie, getEintraegeProMitglied, getRangliste, getRanglisteDurchschnitt, getKategorieStatsProMitglied } from '../lib/supabase'

function formatWert(wert, einheit, durchschnitt = false) {
  if (einheit === '€') return `${Number(wert).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}\u202f€${durchschnitt ? '\u202f/\u202fAbend' : ''}`
  return `${wert} ${einheit}`
}

function LinienDiagramm({ eintraege, einheit }) {
  const [hoveredIdx, setHoveredIdx] = useState(null)
  const [W, setW] = useState(560)
  const containerRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!containerRef.current) return
    const obs = new ResizeObserver(entries => setW(entries[0].contentRect.width))
    obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  const sorted = [...eintraege].reverse()
  const n = sorted.length

  const PAD_T = 36
  const PAD_L = 48
  const PAD_R = 8
  const PLOT_H = 100
  const slotW = (W - PAD_L - PAD_R) / Math.max(1, n)

  const maxVal = Math.max(...sorted.map(e => e.summe))
  const minVal = Math.min(...sorted.map(e => e.summe))
  const range = Math.max(maxVal - minVal, 1)

  const uniqueYears = new Set(sorted.filter(e => e.datum).map(e => new Date(e.datum).getFullYear()))
  const multiYear = uniqueYears.size > 1
  const PAD_B = multiYear ? 42 : 28
  const H = PAD_T + PLOT_H + PAD_B

  const pts = sorted.map((e, i) => ({
    x: PAD_L + (i + 0.5) * slotW,
    y: PAD_T + PLOT_H - ((e.summe - minVal) / range) * PLOT_H,
    ...e,
  }))

  const polyPoints = pts.map(p => `${p.x},${p.y}`).join(' ')
  const areaPoints = `${pts[0].x},${PAD_T + PLOT_H} ${polyPoints} ${pts[n - 1].x},${PAD_T + PLOT_H}`

  return (
    <div ref={containerRef}>
      <svg
        width={W}
        height={H}
        style={{ display: 'block' }}
        viewBox={`0 0 ${W} ${H}`}
      >
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1d1d1f" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#1d1d1f" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Area fill */}
        {n > 1 && <polygon points={areaPoints} fill="url(#areaGrad)" />}

        {/* Line */}
        {n > 1 && (
          <polyline
            points={polyPoints}
            fill="none"
            stroke="#1d1d1f"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity="0.55"
          />
        )}

        {/* Vertical guide on hover */}
        {hoveredIdx !== null && (
          <line
            x1={pts[hoveredIdx].x} y1={PAD_T - 4}
            x2={pts[hoveredIdx].x} y2={PAD_T + PLOT_H}
            stroke="#1d1d1f" strokeWidth="1" strokeDasharray="3,3" opacity="0.2"
          />
        )}

        {pts.map((p, i) => {
          const isHovered = hoveredIdx === i
          const pYear = p.datum ? new Date(p.datum).getFullYear() : null
          const prevYear = i > 0 && sorted[i - 1].datum ? new Date(sorted[i - 1].datum).getFullYear() : null
          const showYear = multiYear && pYear && (i === 0 || pYear !== prevYear)
          const isMax = p.summe === maxVal && n > 1
          const isMin = p.summe === minVal && n > 1
          const fillColor = isMax ? '#c0392b' : isMin ? '#27ae60' : (isHovered ? '#1d1d1f' : '#fff')
          const labelY = Math.max(p.y - 10, 12)
          return (
            <g
              key={p.kegelabend_id || i}
              style={{ cursor: p.kegelabend_id ? 'pointer' : 'default' }}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={() => p.kegelabend_id && navigate(`/kegelabend/${p.kegelabend_id}`)}
            >
              {/* Hit area */}
              <circle cx={p.x} cy={p.y} r={16} fill="transparent" />

              {/* Dot */}
              <circle
                cx={p.x} cy={p.y}
                r={isHovered ? 5 : ((isMax || isMin) ? 4.5 : 3.5)}
                fill={fillColor}
                stroke="#1d1d1f"
                strokeWidth="1.5"
                opacity={isHovered ? 1 : 0.9}
                style={{ transition: 'r 0.12s, fill 0.12s' }}
              />

              {/* Value label */}
              <text
                x={p.x} y={labelY}
                textAnchor="middle"
                fontSize="10"
                fill="#1d1d1f"
                opacity={isHovered ? 1 : 0.55}
                style={{ fontFamily: 'Georgia, serif', transition: 'opacity 0.12s', pointerEvents: 'none' }}
              >
                {formatWert(p.summe, einheit)}
              </text>

              {/* Date label */}
              <text
                x={p.x} y={multiYear ? H - 18 : H - 6}
                textAnchor="middle"
                fontSize="9"
                fill="#6e6e73"
                opacity={isHovered ? 1 : 0.7}
                style={{ transition: 'opacity 0.12s', pointerEvents: 'none' }}
              >
                {p.datum
                  ? new Date(p.datum).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
                  : '–'}
              </text>

              {/* Year label — only when year changes */}
              {showYear && (
                <text
                  x={p.x} y={H - 5}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#6e6e73"
                  opacity={isHovered ? 1 : 0.7}
                  style={{ pointerEvents: 'none' }}
                >
                  {pYear}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function KumulativBalken({ eintraege, einheit }) {
  const [hoveredIdx, setHoveredIdx] = useState(null)
  const [W, setW] = useState(560)
  const containerRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!containerRef.current) return
    const obs = new ResizeObserver(entries => setW(entries[0].contentRect.width))
    obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  const sorted = [...eintraege].reverse()
  const n = sorted.length
  if (n === 0) return null

  let running = 0
  const cumulative = sorted.map(e => ({ ...e, kumulativ: (running += e.summe) }))
  const maxVal = cumulative[cumulative.length - 1].kumulativ

  const PAD_T = 28
  const PAD_B = 22
  const PAD_L = 48
  const PAD_R = 8
  const PLOT_H = 100
  const H = PAD_T + PLOT_H + PAD_B
  const totalW = W - PAD_L - PAD_R

  const slotW = totalW / n
  const gap = Math.max(1, Math.min(4, slotW * 0.12))
  const barW = Math.min(60, slotW - gap)
  const labelEvery = Math.ceil(30 / slotW)

  // Y-Achse: schöne Ticks
  const rawStep = maxVal / 5
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep || 1)))
  const tickStep = [1, 2, 5, 10].map(f => f * mag).find(s => s >= rawStep) || mag * 10
  const yTicks = []
  for (let v = 0; v <= maxVal + tickStep * 0.01; v += tickStep) yTicks.push(v)
  const yToSVG = v => PAD_T + PLOT_H - (v / maxVal) * PLOT_H

  return (
    <div ref={containerRef}>
      <svg width={W} height={H} style={{ display: 'block' }} viewBox={`0 0 ${W} ${H}`}>

        {/* Gridlines + Y-Labels */}
        {yTicks.map(v => {
          const y = yToSVG(v)
          if (y < PAD_T - 2) return null
          return (
            <g key={v}>
              <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y}
                stroke="#1d1d1f" strokeWidth={v === 0 ? 1 : 0.5}
                opacity={v === 0 ? 0.15 : 0.07} />
              <text x={PAD_L - 5} y={y + 3.5} textAnchor="end" fontSize="9" fill="#6e6e73" opacity="0.75"
                style={{ pointerEvents: 'none' }}>
                {v === 0 ? '0' : `${Math.round(v).toLocaleString('de-DE')} €`}
              </text>
            </g>
          )
        })}

        {/* Balken */}
        {cumulative.map((e, i) => {
          const prevKum = i > 0 ? cumulative[i - 1].kumulativ : 0
          const totalH = Math.max(2, (e.kumulativ / maxVal) * PLOT_H)
          const prevH = prevKum > 0 ? (prevKum / maxVal) * PLOT_H : 0
          const incrH = totalH - prevH
          const cx = PAD_L + (i + 0.5) * slotW
          const x = cx - barW / 2
          const yTop = PAD_T + PLOT_H - totalH
          const isHovered = hoveredIdx === i
          const showLabel = i % labelEvery === 0 || i === n - 1

          return (
            <g key={e.kegelabend_id || i}
              style={{ cursor: e.kegelabend_id ? 'pointer' : 'default' }}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={() => e.kegelabend_id && navigate(`/kegelabend/${e.kegelabend_id}`)}
            >
              {/* Hit area */}
              <rect x={PAD_L + i * slotW} y={0} width={slotW} height={H} fill="transparent" />

              {/* Vorwert (dunkel, unten) */}
              {prevH > 1 && (
                <rect x={x} y={PAD_T + PLOT_H - prevH} width={barW} height={prevH} rx={2}
                  fill="#1d1d1f"
                  opacity={isHovered ? 0.75 : 0.55}
                  style={{ transition: 'opacity 0.12s' }}
                />
              )}

              {/* Zuwachs dieses Abends (hell, oben) */}
              <rect x={x} y={yTop} width={barW} height={incrH} rx={2}
                fill="#6e6e73"
                opacity={isHovered ? 0.65 : 0.4}
                style={{ transition: 'opacity 0.12s' }}
              />

              {/* Trennlinie */}
              {prevH > 3 && incrH > 3 && (
                <line
                  x1={x + 1} y1={PAD_T + PLOT_H - prevH}
                  x2={x + barW - 1} y2={PAD_T + PLOT_H - prevH}
                  stroke="white" strokeWidth="1" opacity={isHovered ? 0.9 : 0.6}
                />
              )}

              {/* Hover: Gesamt + Zuwachs */}
              {isHovered && (
                <>
                  <text x={cx} y={Math.max(yTop - 13, 12)} textAnchor="middle" fontSize="10" fill="#1d1d1f"
                    style={{ fontFamily: 'Georgia, serif', pointerEvents: 'none' }}>
                    {formatWert(e.kumulativ, einheit)}
                  </text>
                  {i > 0 && (
                    <text x={cx} y={Math.max(yTop - 2, 22)} textAnchor="middle" fontSize="9" fill="#6e6e73"
                      style={{ pointerEvents: 'none' }}>
                      +{formatWert(e.summe, einheit)}
                    </text>
                  )}
                </>
              )}

              {/* Datumslabel */}
              {showLabel && (
                <text x={cx} y={H - 4} textAnchor="middle" fontSize="9" fill="#6e6e73"
                  opacity={isHovered ? 1 : 0.65} style={{ pointerEvents: 'none' }}>
                  {e.datum ? new Date(e.datum).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }) : '–'}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export default function MitgliedStatistikDetail() {
  const { mitgliedId, kategorieId } = useParams()
  const navigate = useNavigate()
  const [mitglied, setMitglied] = useState(null)
  const [kategorie, setKategorie] = useState(null)
  const [eintraege, setEintraege] = useState([])
  const [gruppenSchnitt, setGruppenSchnitt] = useState(null)
  const [gruppenRohStats, setGruppenRohStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function laden() {
      try {
        const [m, kat, e] = await Promise.all([
          getMitglied(mitgliedId),
          getKategorie(kategorieId),
          getEintraegeProMitglied(mitgliedId, kategorieId),
        ])
        setMitglied(m)
        setKategorie(kat)
        setEintraege(e)

        const [rangliste, rohStats] = await Promise.all([
          (kat.einheit === '€' ? getRanglisteDurchschnitt : getRangliste)(kategorieId),
          getKategorieStatsProMitglied(kategorieId),
        ])
        if (rangliste.length > 0)
          setGruppenSchnitt(rangliste.reduce((s, r) => s + r.gesamt, 0) / rangliste.length)
        if (rohStats) setGruppenRohStats(rohStats)
      } finally {
        setLoading(false)
      }
    }
    laden()
  }, [mitgliedId, kategorieId])

  if (loading) return <div className="page"><div className="empty"><p style={{ color: 'var(--ink-faint)' }}>Lade…</p></div></div>
  if (!mitglied || !kategorie) return <div className="page"><div className="empty"><p className="empty-title">Nicht gefunden</p></div></div>

  const anzeigeName = mitglied.spitzname || mitglied.name
  document.title = `${kategorie.name} ${anzeigeName}`
  const abendEintraege = eintraege.filter(e => e.kegelabend_id)
  const abendeCount = abendEintraege.length
  const summe = eintraege.reduce((s, e) => s + e.summe, 0)
  const schnitt = summe / Math.max(1, abendeCount)
  const minStrafe = abendeCount > 0 ? Math.min(...abendEintraege.map(e => e.summe)) : 0
  const maxStrafe = abendeCount > 0 ? Math.max(...abendEintraege.map(e => e.summe)) : 0
  const gesamtwert = kategorie.einheit === '€' ? schnitt : summe

  return (
    <div className="page">
      <div style={{ marginTop: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => navigate(-1)} style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-faint)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
          ← Zurück
        </button>
        <Link to={`/rangliste/${kategorieId}`} style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-faint)', textDecoration: 'none' }}>
          Alle {kategorie.name} →
        </Link>
      </div>

      <div className="section-header">
        <h2 className="section-title">{kategorie.name} {anzeigeName}</h2>
      </div>

      {/* Zusammenfassung */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10, marginBottom: 40 }}>
        {(kategorie.einheit === '€' ? [
          { label: 'Durchschnitt pro Abend', wert: formatWert(schnitt, '€'), delta: gruppenSchnitt != null ? schnitt - gruppenSchnitt : null, lowerBetter: true },
          { label: 'Günstigster Abend', wert: formatWert(minStrafe, '€'), delta: gruppenRohStats ? minStrafe - gruppenRohStats.minAvg : null, lowerBetter: true },
          { label: 'Teuerster Abend', wert: formatWert(maxStrafe, '€'), delta: gruppenRohStats ? maxStrafe - gruppenRohStats.maxAvg : null, lowerBetter: true },
          { label: 'Gesamt', wert: formatWert(summe, '€'), delta: gruppenRohStats ? summe - gruppenRohStats.summeAvg : null, lowerBetter: true },
        ] : [
          { label: 'Gesamt', wert: formatWert(gesamtwert, kategorie.einheit), delta: gruppenSchnitt != null ? gesamtwert - gruppenSchnitt : null, lowerBetter: false },
          { label: 'Abende', wert: abendeCount, delta: gruppenRohStats ? abendeCount - gruppenRohStats.abendeAvg : null, lowerBetter: false },
        ]).map((s, i) => {
          const isEqual = s.delta != null && Math.abs(s.delta) < 0.05
          const isGood = s.delta != null && !isEqual ? (s.lowerBetter ? s.delta <= 0 : s.delta >= 0) : null
          return (
          <div key={s.label} style={{
            background: 'var(--paper)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)',
            padding: '16px 20px', animation: `fadeUp 0.5s cubic-bezier(0.4,0,0.2,1) ${i * 0.07 + 0.05}s both`,
          }}>
            <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)' }}>{s.wert}</div>
            {s.delta != null && (
              <div style={{ marginTop: 6, fontSize: 12, color: isEqual ? 'var(--ink)' : (isGood ? '#27ae60' : '#c0392b'), fontFamily: 'var(--sans)' }}>
                {isEqual ? '= Ø' : `${formatWert(Math.abs(s.delta), kategorie.einheit)} ${s.delta > 0 ? 'über' : 'unter'} Ø`}
              </div>
            )}
          </div>
        )}
        )}
      </div>

      {/* Diagramme */}
      {eintraege.length === 0 ? (
        <div className="empty"><p className="empty-title">Keine Einträge</p></div>
      ) : (
        <>
          <div style={{
            background: 'var(--paper)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)',
            padding: '28px 28px 20px',
            animation: 'fadeUp 0.5s cubic-bezier(0.4,0,0.2,1) 0.2s both',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>
                Verlauf pro Abend
              </span>
              {kategorie.einheit === '€' && (
                <div style={{ display: 'flex', gap: 16 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--ink-faint)' }}>
                    <svg width="10" height="10"><circle cx="5" cy="5" r="4" fill="#27ae60" stroke="#1d1d1f" strokeWidth="1.5" /></svg>
                    Niedrigste
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--ink-faint)' }}>
                    <svg width="10" height="10"><circle cx="5" cy="5" r="4" fill="#c0392b" stroke="#1d1d1f" strokeWidth="1.5" /></svg>
                    Höchste
                  </span>
                </div>
              )}
            </div>
            <div style={{ margin: '0 -20px 0 -24px' }}>
              <LinienDiagramm eintraege={eintraege} einheit={kategorie.einheit} />
            </div>
          </div>

          {kategorie.einheit === '€' && (
            <div style={{
              background: 'var(--paper)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)',
              padding: '28px 28px 20px', marginTop: 16,
              animation: 'fadeUp 0.5s cubic-bezier(0.4,0,0.2,1) 0.3s both',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>
                  Gesamtstrafen kumuliert
                </span>
                <div style={{ display: 'flex', gap: 16 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--ink-faint)' }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: '#1d1d1f', opacity: 0.55, display: 'inline-block' }} />
                    Bisherige Summe
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--ink-faint)' }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: '#6e6e73', opacity: 0.4, display: 'inline-block' }} />
                    Zuwachs
                  </span>
                </div>
              </div>
              <div style={{ margin: '0 -20px 0 -24px' }}>
                <KumulativBalken eintraege={eintraege} einheit={kategorie.einheit} />
              </div>
            </div>
          )}
        </>
      )}

      <div style={{ textAlign: 'center', marginTop: 40, marginBottom: 16 }}>
        <Link
          to={`/vergleich?m=${mitgliedId}&kat=kat_${kategorieId}`}
          className="btn btn-primary"
          style={{ fontSize: 12, letterSpacing: '0.08em' }}
        >
          Mit anderen Mitgliedern vergleichen →
        </Link>
      </div>
    </div>
  )
}

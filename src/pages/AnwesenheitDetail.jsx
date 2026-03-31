import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getAnwesenheitDaten } from '../lib/supabase'

const CELL = 14
const GAP = 3
const LABEL_W = 100

function BalkenDiagramm({ abende, teilnahmen, gaesteTeilnahmen }) {
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

  const n = abende.length
  const PAD_T = 24
  const PAD_L = 32
  const PAD_R = 8
  const PLOT_H = 110
  const STEP = n > 0 ? (W - PAD_L - PAD_R) / n : 1
  const BAR_W = Math.max(STEP * 0.6, 2)

  const data = abende.map(a => {
    let total = 0, guests = 0
    for (const key of teilnahmen) { if (key.endsWith(`:${a.id}`)) total++ }
    for (const key of gaesteTeilnahmen) { if (key.endsWith(`:${a.id}`)) guests++ }
    return { total, guests, datum: a.datum, id: a.id }
  })

  const maxVal = Math.max(...data.map(d => d.total), 1)
  const tickStep = maxVal <= 5 ? 1 : maxVal <= 10 ? 2 : 5
  const ticks = Array.from({ length: Math.ceil(maxVal / tickStep) + 1 }, (_, i) => i * tickStep).filter(v => v <= maxVal)

  const uniqueYears = new Set(abende.filter(a => a.datum).map(a => new Date(a.datum).getFullYear()))
  const multiYear = uniqueYears.size > 1
  const H = PAD_T + PLOT_H + (multiYear ? 42 : 28)

  return (
    <div ref={containerRef}>
      <svg width={W} height={H} style={{ display: 'block' }} viewBox={`0 0 ${W} ${H}`}>

        {/* Y-Achse Gitterlinien + Labels */}
        {ticks.map(v => {
          const y = PAD_T + PLOT_H - (v / maxVal) * PLOT_H
          return (
            <g key={v}>
              <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y}
                stroke="#1d1d1f" strokeWidth="1" opacity="0.07" />
              <text x={PAD_L - 5} y={y + 3.5} textAnchor="end" fontSize="8" fill="#6e6e73" opacity="0.6">
                {v}
              </text>
            </g>
          )
        })}

        {data.map((d, i) => {
          const isHovered = hoveredIdx === i
          const cx = PAD_L + i * STEP + STEP / 2
          const x = cx - BAR_W / 2
          const totalH = (d.total / maxVal) * PLOT_H
          const guestH = (d.guests / maxVal) * PLOT_H
          const barTop = PAD_T + PLOT_H - totalH
          const pYear = d.datum ? new Date(d.datum).getFullYear() : null
          const prevYear = i > 0 && abende[i - 1].datum ? new Date(abende[i - 1].datum).getFullYear() : null
          const showYear = multiYear && pYear && (i === 0 || pYear !== prevYear)
          const dateY = multiYear ? H - 18 : H - 6

          return (
            <g key={d.id} style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={() => navigate(`/kegelabend/${d.id}`)}
            >
              {/* Gesamter Balken (Mitglieder, abgerundet) */}
              {totalH > 0 && (
                <rect x={x} y={barTop} width={BAR_W} height={totalH}
                  fill="#1d1d1f" opacity={isHovered ? 1 : 0.75} rx={3}
                  style={{ transition: 'opacity 0.12s' }}
                />
              )}
              {/* Gäste-Anteil oben (abgerundet) */}
              {guestH > 0 && (
                <g opacity={isHovered ? 1 : 0.9} style={{ transition: 'opacity 0.12s' }}>
                  <rect x={x} y={barTop} width={BAR_W} height={guestH} fill="#c4baa8" rx={3} />
                  <rect x={x} y={barTop + Math.max(guestH - 3, 0)} width={BAR_W} height={Math.min(3, guestH)} fill="#c4baa8" />
                </g>
              )}

              {/* Wert beim Hover */}
              {isHovered && totalH > 0 && (
                <text x={cx} y={barTop - 5} textAnchor="middle" fontSize="10" fill="#1d1d1f"
                  style={{ fontFamily: 'Georgia, serif', pointerEvents: 'none' }}>
                  {d.total}{d.guests > 0 ? ` (${d.guests}G)` : ''}
                </text>
              )}

              {/* Datum */}
              <text x={cx} y={dateY} textAnchor="middle" fontSize="9" fill="#6e6e73"
                opacity={isHovered ? 1 : 0.7} style={{ transition: 'opacity 0.12s', pointerEvents: 'none' }}>
                {d.datum ? new Date(d.datum).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }) : '–'}
              </text>
              {showYear && (
                <text x={cx} y={H - 5} textAnchor="middle" fontSize="9" fill="#6e6e73"
                  opacity={isHovered ? 1 : 0.7} style={{ pointerEvents: 'none' }}>
                  {pYear}
                </text>
              )}

              {/* Hit area */}
              <rect x={x - 4} y={PAD_T} width={BAR_W + 8} height={PLOT_H} fill="transparent" />
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export default function AnwesenheitDetail() {
  const navigate = useNavigate()
  const [daten, setDaten] = useState(null)
  const [loading, setLoading] = useState(true)
  const [heatmapW, setHeatmapW] = useState(600)
  const heatmapRef = useRef(null)

  useEffect(() => {
    getAnwesenheitDaten().then(d => { setDaten(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!heatmapRef.current) return
    const obs = new ResizeObserver(entries => setHeatmapW(entries[0].contentRect.width))
    obs.observe(heatmapRef.current)
    return () => obs.disconnect()
  }, [loading])

  if (loading) return <div className="page"><div className="empty"><p style={{ color: 'var(--ink-faint)' }}>Lade…</p></div></div>
  if (!daten) return <div className="page"><div className="empty"><p className="empty-title">Fehler beim Laden</p></div></div>

  const { mitglieder, abende, teilnahmen, gaesteTeilnahmen } = daten
  const dynamicCell = abende.length > 0
    ? Math.min(20, Math.max(6, (heatmapW - LABEL_W - 8 - (abende.length - 1) * GAP) / abende.length))
    : CELL
  const avgPct = mitglieder.length > 0 && abende.length > 0
    ? Math.round(mitglieder.reduce((s, m) => s + m.count / abende.length * 100, 0) / mitglieder.length)
    : 0
  const totalTeilnahmen = mitglieder.reduce((s, m) => s + m.count, 0)
  const avgProAbend = abende.length > 0 ? (totalTeilnahmen / abende.length).toFixed(1) : '—'

  const zusammenfassung = [
    { label: 'Ø Quote', wert: `${avgPct} %`, sub: 'Alle Mitglieder' },
    { label: 'Ø pro Abend', wert: `${avgProAbend}`, sub: 'Mitglieder dabei' },
  ]

  const fmtDat = d => d ? new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' }) : '–'

  const abendCounts = abende.map(a => {
    let count = 0
    for (const key of teilnahmen) { if (key.endsWith(`:${a.id}`)) count++ }
    return { ...a, count }
  })
  const meisterAbend = abendCounts.reduce((best, a) => a.count > best.count ? a : best, abendCounts[0] ?? null)
  const wenigstenAbend = abendCounts.reduce((worst, a) => a.count < worst.count ? a : worst, abendCounts[0] ?? null)

  let longestStreak = { mitglied: null, length: 0 }
  for (const m of mitglieder) {
    let streak = 0, maxStreak = 0
    for (const a of abende) {
      if (teilnahmen.has(`${m.id}:${a.id}`)) { streak++; maxStreak = Math.max(maxStreak, streak) }
      else { streak = 0 }
    }
    if (maxStreak > longestStreak.length) longestStreak = { mitglied: m, length: maxStreak }
  }

  return (
    <div className="page">
      <div style={{ marginTop: 40 }}>
        <button onClick={() => navigate(-1)} style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-faint)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
          ← Zurück
        </button>
      </div>

      <div className="section-header">
        <h2 className="section-title">Anwesenheit</h2>
        <span className="section-meta">{mitglieder.length} Mitglieder</span>
      </div>

      {/* Zusammenfassung */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginBottom: 40 }}>
        {zusammenfassung.map((s, i) => (
          <div key={s.label} style={{
            background: 'var(--paper)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', padding: '16px 20px',
            animation: `fadeUp 0.5s cubic-bezier(0.4,0,0.2,1) ${i * 0.07 + 0.05}s both`,
          }}>
            <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)', marginBottom: s.sub ? 4 : 0 }}>{s.wert}</div>
            {s.sub && <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{s.sub}</div>}
          </div>
        ))}
      </div>

      {mitglieder.length === 0 ? (
        <div className="empty"><p className="empty-title">Noch keine Einträge</p></div>
      ) : (
        <>
          {/* Heatmap */}
          <div ref={heatmapRef} style={{
            background: 'var(--paper)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)',
            padding: '28px 28px 24px',
            animation: 'fadeUp 0.5s cubic-bezier(0.4,0,0.2,1) 0.2s both',
            overflowX: 'auto',
            marginBottom: 16,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>
                Teilnahme je Mitglied
              </span>
              <div style={{ display: 'flex', gap: 16 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--ink-faint)' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--ink)', display: 'inline-block' }} />
                  Dabei
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--ink-faint)' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--paper-subtle)', opacity: 0.5, display: 'inline-block' }} />
                  Nicht dabei
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', paddingLeft: LABEL_W + 8, marginBottom: 14 }}>
              {abende.map((a, i) => {
                const date = new Date(a.datum)
                const prev = i > 0 ? new Date(abende[i - 1].datum) : null
                const newYear = !prev || prev.getFullYear() !== date.getFullYear()
                return (
                  <div key={a.id} style={{ width: dynamicCell + GAP, flexShrink: 0, height: 46, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
                    {newYear && (
                      <span style={{ fontSize: 8, color: 'var(--ink-faint)', lineHeight: 1, marginBottom: 5 }}>
                        {date.getFullYear()}
                      </span>
                    )}
                    <span style={{
                      fontSize: 8, color: 'var(--ink-faint)', whiteSpace: 'nowrap',
                      display: 'block', letterSpacing: '0.02em',
                      transform: 'rotate(-55deg)', transformOrigin: 'center bottom',
                    }}>
                      {date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                    </span>
                  </div>
                )
              })}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: GAP + 2 }}>
              {mitglieder.map((m, mi) => {
                const pct = abende.length > 0 ? Math.round(m.count / abende.length * 100) : 0
                return (
                  <div key={m.id} style={{
                    display: 'flex', alignItems: 'center',
                    animation: `fadeUp 0.4s cubic-bezier(0.4,0,0.2,1) ${Math.min(mi * 0.04, 0.4)}s both`,
                  }}>
                    <Link to={`/mitglied/${m.id}/anwesenheit`} style={{
                      width: LABEL_W, flexShrink: 0,
                      fontSize: 12, color: 'var(--ink-muted)', textDecoration: 'none',
                      paddingRight: 8, textAlign: 'right',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      transition: 'color 0.15s',
                    }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--ink)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--ink-muted)'}
                    >
                      {m.spitzname || m.name}
                    </Link>
                    <div style={{ display: 'flex', gap: GAP }}>
                      {abende.map(a => {
                        const dabei = teilnahmen.has(`${m.id}:${a.id}`)
                        return (
                          <Link
                            key={a.id}
                            to={`/kegelabend/${a.id}`}
                            title={`${m.spitzname || m.name} · ${new Date(a.datum).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}`}
                            style={{
                              width: dynamicCell, height: dynamicCell, flexShrink: 0, borderRadius: 3,
                              background: dabei ? 'var(--ink)' : 'var(--paper-subtle)',
                              opacity: dabei ? 1 : 0.5,
                              display: 'block', transition: 'opacity 0.1s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.opacity = '0.55'}
                            onMouseLeave={e => e.currentTarget.style.opacity = dabei ? '1' : '0.5'}
                          />
                        )
                      })}
                    </div>
                    <div style={{ flexShrink: 0, paddingLeft: 10, fontSize: 12, color: 'var(--ink-muted)', fontFamily: 'var(--serif)', minWidth: 52 }}>
                      {m.count}
                      <span style={{ fontSize: 10, color: 'var(--ink-faint)', marginLeft: 4 }}>({pct} %)</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Teilnehmer-Diagramm */}
          <div style={{
            background: 'var(--paper)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)',
            padding: '28px 28px 20px',
            animation: 'fadeUp 0.5s cubic-bezier(0.4,0,0.2,1) 0.26s both',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>
                Teilnehmer pro Abend
              </span>
              <div style={{ display: 'flex', gap: 16 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--ink-faint)' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: '#1d1d1f', display: 'inline-block' }} />
                  Mitglieder
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--ink-faint)' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: '#c4baa8', display: 'inline-block' }} />
                  Gäste
                </span>
              </div>
            </div>
            <BalkenDiagramm abende={abende} teilnahmen={teilnahmen} gaesteTeilnahmen={gaesteTeilnahmen} />
          </div>
        </>
      )}

      {/* Rekordkacheln */}
      {mitglieder.length > 0 && abende.length > 0 && (() => {
        const tiles = [
          meisterAbend && { label: 'Meiste Anwesenheit', sub: 'Abend', wert: `${meisterAbend.count} Mitglieder`, name: null, datum: fmtDat(meisterAbend.datum), href: `/kegelabend/${meisterAbend.id}` },
          wenigstenAbend && { label: 'Wenigste Anwesenheit', sub: 'Abend', wert: `${wenigstenAbend.count} Mitglieder`, name: null, datum: fmtDat(wenigstenAbend.datum), href: `/kegelabend/${wenigstenAbend.id}` },
          longestStreak.mitglied && { label: 'Längste Streak', sub: 'Person', wert: `${longestStreak.length} in Folge`, name: longestStreak.mitglied.spitzname || longestStreak.mitglied.name, datum: null, href: `/mitglied/${longestStreak.mitglied.id}` },
        ].filter(Boolean)
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, marginTop: 40 }}>
            {tiles.map((t, i) => (
              <div key={t.label + t.sub} style={{
                background: 'var(--paper)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)',
                padding: '20px 22px', animation: `fadeUp 0.5s cubic-bezier(0.4,0,0.2,1) ${i * 0.07 + 0.05}s both`,
                transition: 'box-shadow 0.2s, transform 0.2s', cursor: 'pointer',
              }}
                onClick={() => navigate(t.href)}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.transform = 'translateY(0)' }}
              >
                <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 2 }}>{t.label}</div>
                <div style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 8, opacity: 0.6 }}>{t.sub}</div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)', marginBottom: 4 }}>{t.wert}</div>
                {t.name && <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 2 }}>{t.name}</div>}
                {t.datum && <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{t.datum}</div>}
              </div>
            ))}
          </div>
        )
      })()}
    </div>
  )
}

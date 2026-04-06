import { useState, useEffect, useRef } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { getMitglied, getMitgliedAnwesenheit, getAnwesenheitDaten } from '../lib/supabase'

const CELL = 14
const GAP = 3

export default function MitgliedAnwesenheitDetail() {
  const { mitgliedId } = useParams()
  const navigate = useNavigate()
  const [mitglied, setMitglied] = useState(null)
  const [anwesenheit, setAnwesenheit] = useState({ abende: [], teilnahmen: new Set() })
  const [gruppenStats, setGruppenStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [heatmapW, setHeatmapW] = useState(600)
  const heatmapRef = useRef(null)

  useEffect(() => {
    if (!heatmapRef.current) return
    const obs = new ResizeObserver(entries => setHeatmapW(entries[0].contentRect.width))
    obs.observe(heatmapRef.current)
    return () => obs.disconnect()
  }, [loading])

  useEffect(() => {
    async function laden() {
      try {
        const [m, a, alle] = await Promise.all([
          getMitglied(mitgliedId),
          getMitgliedAnwesenheit(mitgliedId),
          getAnwesenheitDaten(),
        ])
        setMitglied(m)
        setAnwesenheit(a)
        if (alle.mitglieder.length > 0) {
          const n = alle.mitglieder.length
          const avgCount = alle.mitglieder.reduce((s, m) => s + m.count, 0) / n
          const avgFehlend = alle.abende.length - avgCount
          const avgPct = alle.abende.length > 0 ? (avgCount / alle.abende.length) * 100 : 0
          const streaks = alle.mitglieder.map(m => {
            let streak = 0, max = 0
            for (const ab of alle.abende) {
              if (alle.teilnahmen.has(`${m.id}:${ab.id}`)) { streak++; max = Math.max(max, streak) }
              else streak = 0
            }
            return max
          })
          const avgStreak = streaks.reduce((s, v) => s + v, 0) / n
          setGruppenStats({ avgCount, avgFehlend, avgPct, avgStreak })
        }
      } finally {
        setLoading(false)
      }
    }
    laden()
  }, [mitgliedId])

  if (loading) return <div className="page"><div className="empty"><p style={{ color: 'var(--ink-faint)' }}>Lade…</p></div></div>
  if (!mitglied) return <div className="page"><div className="empty"><p className="empty-title">Nicht gefunden</p></div></div>

  const anzeigeName = mitglied.spitzname || mitglied.name
  document.title = `Anwesenheit ${anzeigeName}`
  const { abende, teilnahmen } = anwesenheit
  const count = abende.filter(a => teilnahmen.has(a.id)).length
  const pct = abende.length > 0 ? Math.round(count / abende.length * 100) : 0
  const fehlend = abende.length - count

  const dynamicCell = abende.length > 0
    ? Math.min(20, Math.max(6, (heatmapW - (abende.length - 1) * GAP) / abende.length))
    : CELL

  let maxStreak = 0, currentStreak = 0
  for (const a of abende) {
    if (teilnahmen.has(a.id)) {
      currentStreak++
      maxStreak = Math.max(maxStreak, currentStreak)
    } else {
      currentStreak = 0
    }
  }

  return (
    <div className="page">
      <div style={{ marginTop: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => navigate(-1)} style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-faint)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
          ← Zurück
        </button>
        <Link to="/rangliste/anwesenheit" style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-faint)', textDecoration: 'none' }}>
          Alle Anwesenheit →
        </Link>
      </div>

      <div className="section-header">
        <h2 className="section-title">Anwesenheit {anzeigeName}</h2>
      </div>

      {/* Zusammenfassung */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10, marginBottom: 40 }}>
        {[
          { label: 'Anwesenheitsquote', wert: `${pct} %`, delta: gruppenStats ? pct - gruppenStats.avgPct : null, lowerBetter: false, fmt: v => `${Math.abs(v).toFixed(1)} %` },
          { label: 'Dabei', wert: count, delta: gruppenStats ? count - gruppenStats.avgCount : null, lowerBetter: false, fmt: v => `${Math.abs(v).toFixed(1)} Abende` },
          { label: 'Fehlend', wert: fehlend, delta: gruppenStats ? fehlend - gruppenStats.avgFehlend : null, lowerBetter: true, fmt: v => `${Math.abs(v).toFixed(1)} Abende` },
          { label: 'Längste Streak', wert: maxStreak, delta: gruppenStats ? maxStreak - gruppenStats.avgStreak : null, lowerBetter: false, fmt: v => `${Math.abs(v).toFixed(1)} Abende` },
        ].map((s, i) => {
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
                {isEqual ? '= Ø' : `${s.fmt(s.delta)} ${s.delta > 0 ? 'über' : 'unter'} Ø`}
              </div>
            )}
          </div>
        )}
        )}
      </div>

      {/* Heatmap */}
      {abende.length === 0 ? (
        <div className="empty"><p className="empty-title">Noch keine Abende</p></div>
      ) : (
        <div style={{
          background: 'var(--paper)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)',
          padding: '28px 28px 24px', animation: 'fadeUp 0.5s cubic-bezier(0.4,0,0.2,1) 0.26s both',
          overflowX: 'auto',
        }} ref={heatmapRef}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>
              Anwesenheitsverlauf
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

          <div style={{ display: 'flex', marginBottom: 14, paddingLeft: Math.round(dynamicCell * 0.4) }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: GAP }}>
            {abende.map(a => {
              const dabei = teilnahmen.has(a.id)
              return (
                <Link
                  key={a.id}
                  to={`/kegelabend/${a.id}`}
                  title={new Date(a.datum).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' })}
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
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: 40, marginBottom: 16 }}>
        <Link
          to={`/vergleich?m=${mitgliedId}&kat=anwesenheit`}
          className="btn btn-primary"
          style={{ fontSize: 12, letterSpacing: '0.08em' }}
        >
          Mit anderen Mitgliedern vergleichen →
        </Link>
      </div>
    </div>
  )
}

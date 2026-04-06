import { useState, useEffect, useRef } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { getMitglied, getMitglieder, getMitgliedEhrentitelAbende, getPudelkoenigRangliste, getKoenigRangliste } from '../lib/supabase'

const GAP = 3
const MEDALS = ['🥇', '🥈', '🥉']

export default function MitgliedEhrentitelDetail() {
  const { mitgliedId, typ } = useParams()
  const navigate = useNavigate()
  const [mitglied, setMitglied] = useState(null)
  const [abende, setAbende] = useState([])
  const [rang, setRang] = useState(null)
  const [schnitt, setSchnitt] = useState(null)
  const [rangSchnitt, setRangSchnitt] = useState(null)
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
        const ranglisteFn = typ === 'pudelkoenig' ? getPudelkoenigRangliste : getKoenigRangliste
        const [m, abendeData, rangliste, alleMitglieder] = await Promise.all([
          getMitglied(mitgliedId),
          getMitgliedEhrentitelAbende(mitgliedId, typ),
          ranglisteFn(),
          getMitglieder(),
        ])
        setMitglied(m)
        setAbende(abendeData)
        const idx = rangliste.findIndex(r => r.id === mitgliedId)
        setRang(idx !== -1 ? idx + 1 : null)
        const totalMitglieder = alleMitglieder.filter(m => !m.ist_gast).length
        const totalTitel = rangliste.reduce((s, r) => s + r.gesamt, 0)
        setSchnitt(totalMitglieder > 0 ? totalTitel / totalMitglieder : null)
        setRangSchnitt(rangliste.length > 0 ? (rangliste.length + 1) / 2 : null)
      } finally {
        setLoading(false)
      }
    }
    laden()
  }, [mitgliedId, typ])

  if (loading) return <div className="page"><div className="empty"><p style={{ color: 'var(--ink-faint)' }}>Lade…</p></div></div>
  if (!mitglied) return <div className="page"><div className="empty"><p className="empty-title">Nicht gefunden</p></div></div>

  const anzeigeName = mitglied.spitzname || mitglied.name
  document.title = `${typ === 'pudelkoenig' ? 'Pudelkönig' : 'König'} ${anzeigeName}`
  const titel = typ === 'pudelkoenig' ? 'Pudelkönig' : 'König'
  const ranglisteroute = typ === 'pudelkoenig' ? '/rangliste/pudelkoenig' : '/rangliste/koenig'

  const count = abende.filter(a => a.gewonnen).length
  const pct = abende.length > 0 ? Math.round(count / abende.length * 100) : 0

  const avgPct = schnitt != null && abende.length > 0 ? schnitt / abende.length * 100 : null

  const dynamicCell = abende.length > 0
    ? Math.min(20, Math.max(6, (heatmapW - (abende.length - 1) * GAP) / abende.length))
    : 14

  const stats = [
    { label: 'Titel', wert: `${count}×`, delta: schnitt != null ? count - schnitt : null, fmt: v => `${Math.abs(v).toFixed(1)}×`, lowerBetter: false },
    { label: 'Anteil aller Abende', wert: `${pct} %`, delta: avgPct != null ? pct - avgPct : null, fmt: v => `${Math.abs(v).toFixed(1)} %`, lowerBetter: false },
    { label: 'Rang', wert: rang ? (rang <= 3 ? MEDALS[rang - 1] : `Platz ${rang}`) : '–', delta: rang != null && rangSchnitt != null ? rangSchnitt - rang : null, fmt: v => `${Math.abs(Math.round(v))} Plätze`, lowerBetter: false },
  ]

  return (
    <div className="page">
      <div style={{ marginTop: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => navigate(-1)} style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-faint)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
          ← Zurück
        </button>
        <Link to={ranglisteroute} style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-faint)', textDecoration: 'none' }}>
          Alle {titel} →
        </Link>
      </div>

      <div className="section-header">
        <h2 className="section-title">{titel} {anzeigeName}</h2>
      </div>

      {/* Zusammenfassung */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10, marginBottom: 40 }}>
        {stats.map((s, i) => {
          const d = s.delta
          const eq = d != null && Math.abs(d) < 0.05
          const good = d != null && !eq && (s.lowerBetter ? d <= 0 : d >= 0)
          return (
            <div key={s.label} style={{
              background: 'var(--paper)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)',
              padding: '16px 20px', animation: `fadeUp 0.5s cubic-bezier(0.4,0,0.2,1) ${i * 0.07 + 0.05}s both`,
            }}>
              <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 8 }}>{s.label}</div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)' }}>{s.wert}</div>
              {d != null && (
                <div style={{ marginTop: 6, fontSize: 12, color: eq ? 'var(--ink)' : (good ? '#27ae60' : '#c0392b'), fontFamily: 'var(--sans)' }}>
                  {eq ? '= Ø' : `${s.fmt(d)} ${d > 0 ? 'über' : 'unter'} Ø`}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Verlauf-Heatmap */}
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
              Verlauf
            </span>
            <div style={{ display: 'flex', gap: 16 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--ink-faint)' }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--ink)', display: 'inline-block' }} />
                {titel}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--ink-faint)' }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--paper-subtle)', opacity: 0.5, display: 'inline-block' }} />
                Kein Titel
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
            {abende.map(a => (
              <Link
                key={a.id}
                to={`/kegelabend/${a.id}`}
                title={new Date(a.datum).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' })}
                style={{
                  width: dynamicCell, height: dynamicCell, flexShrink: 0, borderRadius: 3,
                  background: a.gewonnen ? 'var(--ink)' : 'var(--paper-subtle)',
                  opacity: a.gewonnen ? 1 : 0.4,
                  display: 'block', transition: 'opacity 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.55'}
                onMouseLeave={e => e.currentTarget.style.opacity = a.gewonnen ? '1' : '0.4'}
              />
            ))}
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: 40, marginBottom: 16 }}>
        <Link
          to={`/vergleich?m=${mitgliedId}&kat=ehrentitel`}
          className="btn btn-primary"
          style={{ fontSize: 12, letterSpacing: '0.08em' }}
        >
          Mit anderen Mitgliedern vergleichen →
        </Link>
      </div>
    </div>
  )
}

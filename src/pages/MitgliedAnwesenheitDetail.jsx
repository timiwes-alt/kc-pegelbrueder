import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { getMitglied, getMitgliedAnwesenheit } from '../lib/supabase'

const CELL = 14
const GAP = 3

export default function MitgliedAnwesenheitDetail() {
  const { mitgliedId } = useParams()
  const navigate = useNavigate()
  const [mitglied, setMitglied] = useState(null)
  const [anwesenheit, setAnwesenheit] = useState({ abende: [], teilnahmen: new Set() })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function laden() {
      try {
        const [m, a] = await Promise.all([
          getMitglied(mitgliedId),
          getMitgliedAnwesenheit(mitgliedId),
        ])
        setMitglied(m)
        setAnwesenheit(a)
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginBottom: 40 }}>
        {[
          { label: 'Quote', wert: `${pct} %` },
          { label: 'Dabei', wert: count },
          { label: 'Fehlend', wert: fehlend },
          { label: 'Längste Serie', wert: maxStreak },
        ].map((s, i) => (
          <div key={s.label} style={{
            background: 'var(--paper)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)',
            padding: '16px 20px', animation: `fadeUp 0.5s cubic-bezier(0.4,0,0.2,1) ${i * 0.07 + 0.05}s both`,
          }}>
            <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)' }}>{s.wert}</div>
          </div>
        ))}
      </div>

      {/* Heatmap */}
      {abende.length === 0 ? (
        <div className="empty"><p className="empty-title">Noch keine Abende</p></div>
      ) : (
        <div style={{
          background: 'var(--paper)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)',
          padding: '28px 28px 24px', animation: 'fadeUp 0.5s cubic-bezier(0.4,0,0.2,1) 0.26s both',
          overflowX: 'auto',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>
              Alle Abende
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

          <div style={{ display: 'flex', gap: GAP, marginBottom: 4 }}>
            {abende.map((a, i) => (
              <div key={a.id} style={{ width: CELL, flexShrink: 0, textAlign: 'center', fontSize: 8, color: 'var(--ink-faint)', lineHeight: 1 }}>
                {i + 1}
              </div>
            ))}
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
                    width: CELL, height: CELL, flexShrink: 0, borderRadius: 3,
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
    </div>
  )
}

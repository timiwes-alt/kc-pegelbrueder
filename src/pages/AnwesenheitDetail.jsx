import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getAnwesenheitDaten } from '../lib/supabase'

const CELL = 14
const GAP = 3
const LABEL_W = 100

export default function AnwesenheitDetail() {
  const [daten, setDaten] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAnwesenheitDaten().then(d => { setDaten(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="page"><div className="empty"><p style={{ color: 'var(--ink-faint)' }}>Lade…</p></div></div>
  if (!daten) return <div className="page"><div className="empty"><p className="empty-title">Fehler beim Laden</p></div></div>

  const { mitglieder, abende, teilnahmen } = daten
  const bester = mitglieder[0]

  const zusammenfassung = [
    { label: 'Mitglieder', wert: mitglieder.length, sub: 'ohne Gäste' },
    { label: 'Abende gesamt', wert: abende.length, sub: 'Kegelabende' },
    {
      label: 'Beste Quote',
      wert: bester && abende.length > 0 ? `${Math.round(bester.count / abende.length * 100)} %` : '—',
      sub: bester ? bester.spitzname || bester.name : '',
    },
  ]

  return (
    <div className="page">
      <div style={{ marginTop: 40 }}>
        <Link to="/rangliste" style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-faint)', textDecoration: 'none' }}>
          ← Alle Statistiken
        </Link>
      </div>

      <div className="section-header">
        <h2 className="section-title">Anwesenheit</h2>
        <span className="section-meta">Abende · {mitglieder.length} Mitglieder</span>
      </div>

      {/* Zusammenfassung */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 40 }}>
        {zusammenfassung.map((s, i) => (
          <div key={s.label} style={{
            background: 'var(--paper)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', padding: '20px 22px',
            animation: `fadeUp 0.5s cubic-bezier(0.4,0,0.2,1) ${i * 0.07 + 0.05}s both`,
            transition: 'box-shadow 0.2s, transform 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.transform = 'translateY(0)' }}
          >
            <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 28, color: 'var(--ink)', marginBottom: 4 }}>{s.wert}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {mitglieder.length === 0 ? (
        <div className="empty"><p className="empty-title">Noch keine Einträge</p></div>
      ) : (
        <div style={{
          background: 'var(--paper)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)',
          padding: '32px 36px',
          animation: 'fadeUp 0.5s cubic-bezier(0.4,0,0.2,1) 0.26s both',
          overflowX: 'auto',
        }}>
          {/* Datum-Kopfzeile */}
          <div style={{ display: 'flex', paddingLeft: LABEL_W + 8, marginBottom: 6 }}>
            {abende.map(a => (
              <div key={a.id} style={{ width: CELL + GAP, flexShrink: 0, height: 46, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                <span style={{
                  fontSize: 8, color: 'var(--ink-faint)', whiteSpace: 'nowrap',
                  display: 'block', letterSpacing: '0.02em',
                  transform: 'rotate(-55deg)', transformOrigin: 'center bottom',
                }}>
                  {new Date(a.datum).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                </span>
              </div>
            ))}
          </div>

          {/* Heatmap-Zeilen */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: GAP + 2 }}>
            {mitglieder.map((m, mi) => {
              const pct = abende.length > 0 ? Math.round(m.count / abende.length * 100) : 0
              return (
                <div key={m.id} style={{
                  display: 'flex', alignItems: 'center',
                  animation: `fadeUp 0.4s cubic-bezier(0.4,0,0.2,1) ${Math.min(mi * 0.04, 0.4)}s both`,
                }}>
                  <Link to={`/mitglied/${m.id}`} style={{
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
                  <div style={{ flexShrink: 0, paddingLeft: 10, fontSize: 12, color: 'var(--ink-muted)', fontFamily: 'var(--serif)', minWidth: 52 }}>
                    {m.count}
                    <span style={{ fontSize: 10, color: 'var(--ink-faint)', marginLeft: 4 }}>({pct} %)</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

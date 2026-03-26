import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getMitglied, getStatistikenFuerMitglied, getRangliste, getRanglisteDurchschnitt, getMitgliedAnwesenheit } from '../lib/supabase'
import { SAISONS } from '../data/saisons'

function formatWert(wert, einheit, durchschnitt = false) {
  if (einheit === '€') return `${Number(wert).toFixed(2)}\u202f€${durchschnitt ? '\u202f/\u202fAbend' : ''}`
  return `${wert} ${einheit}`
}


export default function MitgliedDetail() {
  const { mitgliedId } = useParams()
  const [mitglied, setMitglied] = useState(null)
  const [statistiken, setStatistiken] = useState([])
  const [raenge, setRaenge] = useState({})

  const [anwesenheit, setAnwesenheit] = useState({ abende: [], teilnahmen: new Set() })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function laden() {
      try {
        const [m, stats, a] = await Promise.all([
          getMitglied(mitgliedId),
          getStatistikenFuerMitglied(mitgliedId),
          getMitgliedAnwesenheit(mitgliedId),
        ])
        setAnwesenheit(a)
        setMitglied(m)
        setStatistiken(stats)

        // Rang in jeder Kategorie ermitteln
        const raengeObj = {}
        await Promise.all(stats.map(async (s) => {
          const fn = s.einheit === '€' ? getRanglisteDurchschnitt : getRangliste
          const rangliste = await fn(s.id)
          const idx = rangliste.findIndex(r => r.id === mitgliedId)
          raengeObj[s.id] = idx >= 0 ? idx + 1 : null
        }))
        setRaenge(raengeObj)
      } finally {
        setLoading(false)
      }
    }
    laden()
  }, [mitgliedId])

  if (loading) return <div className="page"><div className="empty"><p style={{ color: 'var(--ink-faint)' }}>Lade…</p></div></div>
  if (!mitglied) return <div className="page"><div className="empty"><p className="empty-title">Nicht gefunden</p></div></div>

  const anzeigeName = mitglied.spitzname || mitglied.name
  const initialen = anzeigeName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  const MEDALS = ['🥇', '🥈', '🥉']

  // Ämter aller Saisons für diese Person (Spitzname oder Name)
  const aemterProSaison = SAISONS.map(saison => {
    const match = saison.aemter.filter(a =>
      a.namen.some(n =>
        n.toLowerCase() === anzeigeName.toLowerCase() ||
        n.toLowerCase() === mitglied.name.toLowerCase()
      )
    )
    return match.length > 0 ? { label: saison.label, aemter: match } : null
  }).filter(Boolean)

  return (
    <div className="page">
      <div style={{ marginTop: 40 }}>
        <Link to="/rangliste" style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-muted)', textDecoration: 'none' }}>
          ← Alle Statistiken
        </Link>
      </div>

      {/* Profil-Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 28,
        padding: '36px 0 32px',
        borderBottom: '1.5px solid var(--ink)',
        marginBottom: 40,
      }}>
        {/* Avatar */}
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'var(--ink)',
          color: 'var(--paper)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--serif)', fontSize: 28,
          flexShrink: 0,
        }}>
          {initialen}
        </div>

        <div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(28px, 5vw, 42px)', color: 'var(--ink)', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 6 }}>
            {anzeigeName}
          </h1>
          {mitglied.spitzname && (
            <p style={{ fontSize: 14, color: 'var(--ink-muted)', fontStyle: 'italic' }}>{mitglied.name}</p>
          )}
          {mitglied.ist_gast && (
            <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-muted)', background: 'var(--paper-warm)', border: '1px solid var(--paper-mid)', padding: '2px 8px', borderRadius: 2 }}>
              Gast
            </span>
          )}
        </div>

        {/* Beste Platzierung */}
        {statistiken.length > 0 && (() => {
          const besteRang = Math.min(...Object.values(raenge).filter(Boolean))
          return besteRang <= 3 ? (
            <div style={{ marginLeft: 'auto', textAlign: 'center' }}>
              <div style={{ fontSize: 36 }}>{MEDALS[besteRang - 1]}</div>
              <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
                Beste Platzierung
              </div>
            </div>
          ) : null
        })()}
      </div>

      {/* Ämter */}
      {aemterProSaison.length > 0 && (
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 16 }}>
            Ämter
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {aemterProSaison.map(({ label, aemter }) => (
              <div key={label}>
                <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 6 }}>
                  Saison {label}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {aemter.map(a => (
                    <span key={a.titel} style={{
                      fontSize: 12, letterSpacing: '0.06em',
                      border: '1px solid var(--paper-mid)',
                      background: 'var(--paper-warm)',
                      padding: '4px 12px', borderRadius: 2,
                      color: 'var(--ink-soft)',
                    }}>
                      {a.titel}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Anwesenheit */}
      {anwesenheit.abende.length > 0 && (() => {
        const { abende, teilnahmen } = anwesenheit
        const count = abende.filter(a => teilnahmen.has(a.id)).length
        const CELL = 22
        return (
          <div style={{ marginBottom: 48 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 }}>
              <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
                Anwesenheit
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
                <span style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--ink-soft)' }}>{count}</span>
                {' '}von {abende.length} · {Math.round(count / abende.length * 100)} %
              </div>
            </div>
            <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
              <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 0 }}>
                {/* Nummern-Labels */}
                <div style={{ display: 'flex', gap: 3, marginBottom: 4 }}>
                  {abende.map((a, i) => (
                    <div key={a.id} style={{ width: CELL - 3, flexShrink: 0, textAlign: 'center', fontSize: 9, color: 'var(--ink-faint)', lineHeight: 1 }}>
                      {i + 1}
                    </div>
                  ))}
                </div>
                {/* Zellen */}
                <div style={{ display: 'flex', gap: 3 }}>
                  {abende.map(a => {
                    const dabei = teilnahmen.has(a.id)
                    return (
                      <Link
                        key={a.id}
                        to={`/kegelabend/${a.id}`}
                        title={new Date(a.datum).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' })}
                        style={{
                          width: CELL - 3, height: CELL - 3, flexShrink: 0, borderRadius: 3,
                          background: dabei ? 'var(--ink)' : 'var(--paper-mid)',
                          opacity: dabei ? 1 : 0.55,
                          display: 'block', transition: 'opacity 0.1s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '0.6'}
                        onMouseLeave={e => e.currentTarget.style.opacity = dabei ? '1' : '0.55'}
                      />
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Statistiken */}
      {(() => {
        const gesamtAbende = anwesenheit.teilnahmen.size
        const gesamtStrafen = statistiken.filter(s => s.einheit === '€').reduce((acc, s) => acc + s.gesamt, 0)
        const hatStrafen = statistiken.some(s => s.einheit === '€')
        const virtualStats = [
          ...(gesamtAbende > 0 ? [{ id: '__anwesenheit', label: 'Anwesenheit', wert: `${gesamtAbende} Abende`, link: '/kegelabende' }] : []),
          ...(hatStrafen ? [{ id: '__strafen', label: 'Strafen gesamt', wert: `${Number(gesamtStrafen).toFixed(2)} €`, link: '/rangliste' }] : []),
        ]

        if (statistiken.length === 0 && virtualStats.length === 0) return (
          <div className="empty">
            <p className="empty-title">Noch keine Statistiken</p>
            <p style={{ fontSize: 14 }}>Für dieses Mitglied wurden noch keine Werte eingetragen.</p>
          </div>
        )

        return (
          <>
            <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 20 }}>
              {statistiken.length + virtualStats.length} {statistiken.length + virtualStats.length === 1 ? 'Statistik' : 'Statistiken'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 1, background: 'var(--paper-mid)', border: '1px solid var(--paper-mid)' }}>
              {virtualStats.map(v => (
                <Link
                  key={v.id}
                  to={v.link}
                  style={{ textDecoration: 'none', background: 'var(--paper)', padding: '24px 28px', display: 'block', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--paper-warm)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--paper)'}
                >
                  <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 12 }}>
                    {v.label}
                  </div>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 28, color: 'var(--ink)', marginBottom: 4 }}>
                    {v.wert}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Details →</div>
                </Link>
              ))}
              {statistiken.map((s) => {
              const rang = raenge[s.id]
              const medal = rang && rang <= 3 ? MEDALS[rang - 1] : null
              return (
                <Link
                  key={s.id}
                  to={`/rangliste/${s.id}`}
                  style={{ textDecoration: 'none', background: 'var(--paper)', padding: '24px 28px', display: 'block', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--paper-warm)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--paper)'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
                      {s.name}
                    </div>
                    {medal && <span style={{ fontSize: 18 }}>{medal}</span>}
                    {!medal && rang && (
                      <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Platz {rang}</span>
                    )}
                  </div>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 28, color: 'var(--ink)', marginBottom: 4 }}>
                    {formatWert(s.gesamt / (s.einheit === '€' ? Math.max(1, anwesenheit.teilnahmen.size) : 1), s.einheit, s.einheit === '€')}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
                    {s.eintraege} {s.eintraege === 1 ? 'Eintrag' : 'Einträge'} · Details →
                  </div>
                </Link>
              )
            })}
          </div>
        </>
      )
      })()}
    </div>
  )
}

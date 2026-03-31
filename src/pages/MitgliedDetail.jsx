import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { getMitglied, getStatistikenFuerMitglied, getRangliste, getRanglisteDurchschnitt, getMitgliedAnwesenheit, getAnwesenheitDaten, getMitgliedRekorde } from '../lib/supabase'
import { SAISONS } from '../data/saisons'

function formatWert(wert, einheit, durchschnitt = false) {
  if (einheit === '€') return `${Number(wert).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}\u202f€${durchschnitt ? '\u202f/\u202fAbend' : ''}`
  return `${wert} ${einheit}`
}

export default function MitgliedDetail() {
  const { mitgliedId } = useParams()
  const navigate = useNavigate()
  const [mitglied, setMitglied] = useState(null)
  const [statistiken, setStatistiken] = useState([])
  const [raenge, setRaenge] = useState({})
  const [anwesenheit, setAnwesenheit] = useState({ abende: [], teilnahmen: new Set() })
  const [anwesenheitRang, setAnwesenheitRang] = useState(null)
  const [rekorde, setRekorde] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function laden() {
      try {
        const [m, stats, a, allAnwesenheit, rek] = await Promise.all([
          getMitglied(mitgliedId),
          getStatistikenFuerMitglied(mitgliedId),
          getMitgliedAnwesenheit(mitgliedId),
          getAnwesenheitDaten(),
          getMitgliedRekorde(mitgliedId),
        ])
        setRekorde(rek)
        setAnwesenheit(a)
        setMitglied(m)
        setStatistiken(stats)

        const idx = allAnwesenheit.mitglieder.findIndex(r => r.id === mitgliedId)
        setAnwesenheitRang(idx >= 0 ? idx + 1 : null)

        const raengeObj = {}
        await Promise.all(stats.map(async (s) => {
          const fn = s.einheit === '€' ? getRanglisteDurchschnitt : getRangliste
          const rangliste = await fn(s.id)
          const idx2 = rangliste.findIndex(r => r.id === mitgliedId)
          raengeObj[s.id] = idx2 >= 0 ? idx2 + 1 : null
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

  const aemterProSaison = SAISONS.map((saison, saisonIndex) => {
    const match = saison.aemter.filter(a =>
      a.namen.some(n =>
        n.toLowerCase() === anzeigeName.toLowerCase() ||
        n.toLowerCase() === mitglied.name.toLowerCase()
      )
    )
    return match.length > 0 ? { label: saison.label, saisonIndex, aemter: match } : null
  }).filter(Boolean)

  return (
    <div className="page">
      <div style={{ marginTop: 40 }}>
        <button onClick={() => navigate(-1)} style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-faint)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
          ← Zurück
        </button>
      </div>

      {/* Profil-Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 28,
        padding: '40px 0 36px',
        borderBottom: '1px solid var(--paper-subtle)',
        marginBottom: 44,
        animation: 'fadeUp 0.55s cubic-bezier(0.4,0,0.2,1) 0.05s both',
      }}>
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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
            {mitglied.ist_gast && (
              <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-muted)', background: 'var(--paper-warm)', border: '1px solid var(--paper-subtle)', padding: '2px 8px', borderRadius: 4 }}>
                Gast
              </span>
            )}
            {rekorde.map(r => (
              <span
                key={r.label + r.kategorie}
                onClick={() => navigate(r.href)}
                style={{
                  fontSize: 12, letterSpacing: '0.05em',
                  background: 'var(--paper)', boxShadow: 'var(--shadow-xs)',
                  border: '1px solid var(--paper-subtle)',
                  padding: '3px 12px', borderRadius: 980,
                  color: 'var(--ink-soft)',
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  cursor: 'pointer', transition: 'box-shadow 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--shadow-xs)'}
              >
                <span>{r.emoji}</span>{r.label}
              </span>
            ))}
          </div>
        </div>

        {statistiken.length > 0 && (() => {
          const besteRang = Math.min(...Object.values(raenge).filter(Boolean))
          return besteRang <= 3 ? (
            <div style={{ marginLeft: 'auto', textAlign: 'center' }}>
              <div style={{ fontSize: 36 }}>{MEDALS[besteRang - 1]}</div>
              <div style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginTop: 4 }}>
                Beste Platzierung
              </div>
            </div>
          ) : null
        })()}
      </div>

      {/* Ämter */}
      {aemterProSaison.length > 0 && (
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 16 }}>
            Ämter
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {aemterProSaison.map(({ label, saisonIndex, aemter }) => (
              <div key={label}>
                <div style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 8 }}>
                  Saison {label}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {aemter.map(a => (
                    <span key={a.titel}
                      onClick={() => navigate('/', { state: { saisonIndex } })}
                      style={{
                        fontSize: 12, letterSpacing: '0.05em',
                        background: 'var(--paper)',
                        boxShadow: 'var(--shadow-xs)',
                        border: '1px solid var(--paper-subtle)',
                        padding: '5px 14px', borderRadius: 980,
                        color: 'var(--ink-soft)',
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        cursor: 'pointer', transition: 'box-shadow 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--shadow-xs)'}
                    >
                      {a.emoji && <span style={{ fontSize: 13 }}>{a.emoji}</span>}
                      {a.titel}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Statistiken */}
      {(() => {
        const { abende, teilnahmen } = anwesenheit
        const hatAnwesenheit = abende.length > 0
        const count = abende.filter(a => teilnahmen.has(a.id)).length


        if (statistiken.length === 0 && !hatAnwesenheit) return (
          <div className="empty">
            <p className="empty-title">Noch keine Statistiken</p>
            <p style={{ fontSize: 14 }}>Für dieses Mitglied wurden noch keine Werte eingetragen.</p>
          </div>
        )

        const totalCount = statistiken.length + (hatAnwesenheit ? 1 : 0)

        return (
          <>
            <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 20 }}>
              {totalCount} {totalCount === 1 ? 'Statistik' : 'Statistiken'}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
              {[
                ...(hatAnwesenheit ? [{ type: 'anwesenheit', rang: anwesenheitRang }] : []),
                ...statistiken.map(s => ({ type: 'statistik', s, rang: raenge[s.id] })),
              ].sort((a, b) => {
                if (!a.rang && !b.rang) return 0
                if (!a.rang) return 1
                if (!b.rang) return -1
                return a.rang - b.rang
              }).map((tile, ti) => {
                if (tile.type === 'anwesenheit') return (
                  <Link key="anwesenheit" to={`/mitglied/${mitgliedId}/anwesenheit`} style={{ textDecoration: 'none', display: 'block', background: 'var(--paper)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', padding: '24px 26px 22px', animation: `fadeUp 0.5s cubic-bezier(0.4,0,0.2,1) ${ti * 0.08 + 0.15}s both`, transition: 'box-shadow 0.2s, transform 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.transform = 'translateY(0)' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>Anwesenheit</div>
                      {tile.rang && tile.rang <= 3
                        ? <span style={{ fontSize: 18, lineHeight: 1, display: 'inline-block' }}>{MEDALS[tile.rang - 1]}</span>
                        : tile.rang ? <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Platz {tile.rang}</span> : null
                      }
                    </div>
                    <div style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)', lineHeight: 1.2 }}>
                      {count} <span style={{ color: 'var(--ink-muted)' }}>/ {abende.length}</span>
                      <span style={{ fontSize: 14, color: 'var(--ink-faint)', fontFamily: 'var(--sans)', marginLeft: 8, verticalAlign: 'middle' }}>· {Math.round(count / abende.length * 100)} %</span>
                    </div>
                  </Link>
                )
                const { s } = tile
                const rang = tile.rang
                const medal = rang && rang <= 3 ? MEDALS[rang - 1] : null
                return (
                  <Link
                    key={s.id}
                    to={`/mitglied/${mitgliedId}/statistik/${s.id}`}
                    style={{ textDecoration: 'none', background: 'var(--paper)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', padding: '24px 26px 22px', display: 'block', transition: 'box-shadow 0.2s, transform 0.2s', animation: `fadeUp 0.5s cubic-bezier(0.4,0,0.2,1) ${ti * 0.08 + 0.15}s both` }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.transform = 'translateY(0)' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>{s.name}</div>
                      {medal && <span style={{ fontSize: 18, lineHeight: 1, display: 'inline-block' }}>{medal}</span>}
                      {!medal && rang && <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Platz {rang}</span>}
                    </div>
                    <div style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)', lineHeight: 1.2 }}>
                      {formatWert(s.gesamt / (s.einheit === '€' ? Math.max(1, anwesenheit.teilnahmen.size) : 1), s.einheit, s.einheit === '€')}
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

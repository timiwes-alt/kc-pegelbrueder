import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { getPudelkoenigRangliste, getKoenigRangliste, getEhrentitelVerlauf } from '../lib/supabase'
import ZeitstrahlNav from '../components/ZeitstrahlNav'

const MEDALS = ['🥇', '🥈', '🥉']


function VollTabelle({ daten, prevDaten }) {
  const max = daten.length > 0 ? daten[0].gesamt : 1
  const prevRankMap = {}
  if (prevDaten) prevDaten.forEach((m, i) => { prevRankMap[m.id] = i })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {daten.map((m, i) => {
        const anzeigeName = m.spitzname || m.name
        const pct = (m.gesamt / max) * 100
        const isFirst = i === 0

        const prevRank = prevDaten ? (prevRankMap[m.id] ?? null) : null
        const delta = prevRank !== null ? prevRank - i : 0
        const moved = delta !== 0
        const movedUp = delta > 0

        return (
          <div key={m.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            animation: `fadeUp 0.45s cubic-bezier(0.4,0,0.2,1) ${i * 0.055}s both`,
            position: 'relative', borderRadius: 8, padding: '2px 6px', margin: '0 -6px',
          }}>
            {moved && (
              <div
                key={`flash-${m.id}-${i}`}
                style={{
                  position: 'absolute', inset: 0, borderRadius: 8, pointerEvents: 'none',
                  background: movedUp ? 'rgba(39,174,96,0.09)' : 'rgba(192,57,43,0.07)',
                  animation: 'flashFade 10s ease forwards',
                }}
              />
            )}
            <div style={{ width: 26, flexShrink: 0, textAlign: 'center', lineHeight: 1, fontSize: i < 3 ? 15 : 11, color: 'var(--ink-faint)', fontFamily: 'var(--serif)' }}>
              {i < 3 ? MEDALS[i] : i + 1}
              {moved && (
                <div
                  key={`delta-${m.id}-${i}`}
                  style={{
                    fontSize: 8, lineHeight: 1, marginTop: 3, letterSpacing: 0,
                    color: movedUp ? '#27ae60' : '#c0392b',
                    animation: 'flashFade 10s ease forwards',
                  }}
                >
                  {movedUp ? `↑${delta}` : `↓${Math.abs(delta)}`}
                </div>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <Link to={`/mitglied/${m.id}`} style={{ fontFamily: 'var(--serif)', fontSize: isFirst ? 18 : 16, color: 'var(--ink)', textDecoration: 'none', transition: 'opacity 0.15s' }}
                    onMouseEnter={e => e.target.style.opacity = '0.6'}
                    onMouseLeave={e => e.target.style.opacity = '1'}>
                    {anzeigeName}
                  </Link>
                  {m.spitzname && <span style={{ fontSize: 10, color: 'var(--ink-faint)', fontStyle: 'italic' }}>{m.name}</span>}
                </div>
                <span style={{ fontFamily: 'var(--serif)', fontSize: isFirst ? 22 : 17, color: isFirst ? 'var(--ink)' : 'var(--ink-muted)', flexShrink: 0, paddingLeft: 16 }}>
                  {m.gesamt}×
                </span>
              </div>
              <div style={{ height: isFirst ? 7 : 5, background: 'var(--paper-subtle)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: isFirst ? 'linear-gradient(to right, #1d1d1f 0%, #6e6e73 100%)' : 'linear-gradient(to right, #6e6e73 0%, #aeaeb2 100%)', opacity: Math.max(0.45, 1 - i * 0.08), transformOrigin: 'left', animation: `barGrow 0.65s cubic-bezier(0.4,0,0.2,1) ${i * 0.06}s both`, transition: 'width 0.55s cubic-bezier(0.4,0,0.2,1)' }} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function EhrentitelDetail({ typ }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const bis = searchParams.get('bis') || null
  const [rangliste, setRangliste] = useState([])
  const [verlauf, setVerlauf] = useState([])
  const [loading, setLoading] = useState(true)

  const latestRangRef = useRef([])
  latestRangRef.current = rangliste
  const prevRangRef = useRef([])

  const titel = typ === 'pudelkoenig' ? 'Pudelkönig' : 'König'

  useEffect(() => {
    prevRangRef.current = latestRangRef.current
    const ladefn = typ === 'pudelkoenig' ? getPudelkoenigRangliste : getKoenigRangliste
    Promise.all([ladefn(bis), getEhrentitelVerlauf(typ, bis)])
      .then(([rang, verl]) => { setRangliste(rang); setVerlauf(verl) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [typ, bis])

  if (loading) return <div className="page"><div className="empty"><p style={{ color: 'var(--ink-faint)' }}>Lade…</p></div></div>

  const spitzenreiter = rangliste[0]

  const zusammenfassung = [
    ...(spitzenreiter ? [{ label: 'Rekordhalter', wert: spitzenreiter.spitzname || spitzenreiter.name, sub: `${spitzenreiter.gesamt}× ${titel}`, href: `/mitglied/${spitzenreiter.id}` }] : []),
  ]

  return (
    <div className="page">
      <div style={{ marginTop: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => navigate(-1)} style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-faint)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
          ← Zurück
        </button>
        <Link to="/rangliste" style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-faint)', textDecoration: 'none' }}>
          Alle Statistiken →
        </Link>
      </div>

      <div className="section-header">
        <h2 className="section-title">{titel}</h2>
      </div>

      <ZeitstrahlNav bis={bis} basisRoute={`/rangliste/${typ}`} />

      {/* Zusammenfassung */}
      {zusammenfassung.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10, marginBottom: 40 }}>
          {zusammenfassung.map((s, i) => (
            <div key={s.label} style={{ background: 'var(--paper)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', padding: '20px 22px', animation: `fadeUp 0.5s cubic-bezier(0.4,0,0.2,1) ${i * 0.07 + 0.05}s both`, transition: 'box-shadow 0.2s, transform 0.2s', cursor: s.href ? 'pointer' : 'default' }}
              onClick={() => s.href && navigate(s.href)}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.transform = 'translateY(0)' }}>
              <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 8 }}>{s.label}</div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 24, color: 'var(--ink)', lineHeight: 1.2 }}>{s.wert}</div>
              {s.sub && <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 4 }}>{s.sub}</div>}
            </div>
          ))}
        </div>
      )}

      {rangliste.length === 0 ? (
        <div className="empty"><p className="empty-title">Noch keine Einträge</p></div>
      ) : (
        <div style={{ background: 'var(--paper)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', padding: '28px 32px', marginBottom: 40 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 20 }}>Rangliste</div>
          <VollTabelle daten={rangliste} prevDaten={prevRangRef.current} />
        </div>
      )}

      {/* Verlauf */}
      {verlauf.length > 0 && (
        <>
          <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 16 }}>
            Verlauf
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {verlauf.map((v, i) => {
              const anzeigeName = v.mitglied ? (v.mitglied.spitzname || v.mitglied.name) : '–'
              const datum = new Date(v.datum).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
              return (
                <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 0', borderBottom: '1px solid var(--paper-subtle)', animation: `fadeUp 0.4s cubic-bezier(0.4,0,0.2,1) ${Math.min(i * 0.03, 0.3)}s both` }}>
                  <span style={{ fontSize: 12, color: 'var(--ink-faint)', minWidth: 200, flexShrink: 0 }}>{datum}</span>
                  {v.mitglied
                    ? <Link to={`/mitglied/${v.mitglied.id}`} style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--ink)', textDecoration: 'none', transition: 'opacity 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '0.6'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                        {anzeigeName}
                      </Link>
                    : <span style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--ink-faint)' }}>{anzeigeName}</span>}
                  <Link to={`/kegelabend/${v.id}`} style={{ marginLeft: 'auto', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-faint)', textDecoration: 'none' }}>Details →</Link>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

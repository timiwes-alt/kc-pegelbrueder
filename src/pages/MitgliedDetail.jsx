import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { getMitglied, getMitglieder, getStatistikenFuerMitglied, getRangliste, getRanglisteDurchschnitt, getMitgliedAnwesenheit, getAnwesenheitDaten, getMitgliedRekorde, getMitgliedEhrentitel, getPudelkoenigRangliste, getKoenigRangliste } from '../lib/supabase'
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
  const [gruppenSchnitte, setGruppenSchnitte] = useState({})
  const [anwesenheitGruppenSchnitt, setAnwesenheitGruppenSchnitt] = useState(null)
  const [rekorde, setRekorde] = useState([])
  const [ehrentitel, setEhrentitel] = useState({ pudelkoenig: 0, koenig: 0 })
  const [ehrentitelRaenge, setEhrentitelRaenge] = useState({ pudelkoenig: null, koenig: null })
  const [ehrentitelSchnitte, setEhrentitelSchnitte] = useState({ pudelkoenig: null, koenig: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function laden() {
      try {
        const [m, stats, a, allAnwesenheit, rek, ehre, pudelRang, koenigRang, alleMitglieder] = await Promise.all([
          getMitglied(mitgliedId),
          getStatistikenFuerMitglied(mitgliedId),
          getMitgliedAnwesenheit(mitgliedId),
          getAnwesenheitDaten(),
          getMitgliedRekorde(mitgliedId),
          getMitgliedEhrentitel(mitgliedId),
          getPudelkoenigRangliste(),
          getKoenigRangliste(),
          getMitglieder(),
        ])
        setRekorde(rek)
        setEhrentitel(ehre)
        const pudelIdx = pudelRang.findIndex(r => r.id === mitgliedId)
        const koenigIdx = koenigRang.findIndex(r => r.id === mitgliedId)
        setEhrentitelRaenge({
          pudelkoenig: pudelIdx !== -1 ? pudelIdx + 1 : null,
          koenig: koenigIdx !== -1 ? koenigIdx + 1 : null,
        })
        const totalMitglieder = alleMitglieder.filter(m => !m.ist_gast).length
        setEhrentitelSchnitte({
          pudelkoenig: totalMitglieder > 0 ? pudelRang.reduce((s, r) => s + r.gesamt, 0) / totalMitglieder : null,
          koenig: totalMitglieder > 0 ? koenigRang.reduce((s, r) => s + r.gesamt, 0) / totalMitglieder : null,
        })
        setAnwesenheit(a)
        setMitglied(m)
        setStatistiken(stats)

        const thisMemberAnw = allAnwesenheit.mitglieder.find(r => r.id === mitgliedId)
        if (thisMemberAnw) {
          const rang = allAnwesenheit.mitglieder.filter(r =>
            r.count > thisMemberAnw.count ||
            (r.count === thisMemberAnw.count && (r.maxStreak ?? 0) > (thisMemberAnw.maxStreak ?? 0))
          ).length + 1
          setAnwesenheitRang(rang)
        }

        const raengeObj = {}
        const gruppenSchnitteObj = {}
        await Promise.all(stats.map(async (s) => {
          const fn = s.einheit === '€' ? getRanglisteDurchschnitt : getRangliste
          const rangliste = await fn(s.id)
          const thisMemberStat = rangliste.find(r => r.id === mitgliedId)
          if (thisMemberStat) {
            raengeObj[s.id] = s.einheit === '€'
              ? rangliste.filter(r => r.gesamt < thisMemberStat.gesamt).length + 1
              : rangliste.filter(r => r.gesamt > thisMemberStat.gesamt).length + 1
          } else {
            raengeObj[s.id] = null
          }
          if (rangliste.length > 0)
            gruppenSchnitteObj[s.id] = rangliste.reduce((acc, r) => acc + r.gesamt, 0) / rangliste.length
        }))
        setRaenge(raengeObj)
        setGruppenSchnitte(gruppenSchnitteObj)

        if (allAnwesenheit.mitglieder.length > 0)
          setAnwesenheitGruppenSchnitt(allAnwesenheit.mitglieder.reduce((acc, m) => acc + m.count, 0) / allAnwesenheit.mitglieder.length)
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
                      onClick={() => navigate('/', { state: { saisonIndex, scrollTo: 'aemter' } })}
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

        return (
          <>
            <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 20 }}>
              Statistiken
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
                    {anwesenheitGruppenSchnitt !== null && (() => {
                      const delta = count - anwesenheitGruppenSchnitt
                      const isEqual = Math.abs(delta) < 0.05
                      const isGood = !isEqual && delta >= 0
                      return (
                        <div style={{ marginTop: 6, fontSize: 12, color: isEqual ? 'var(--ink)' : (isGood ? '#27ae60' : '#c0392b'), fontFamily: 'var(--sans)' }}>
                          {isEqual ? '= Ø' : `${Math.abs(delta).toFixed(1)} Abende ${delta > 0 ? 'über' : 'unter'} Ø`}
                        </div>
                      )
                    })()}
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
                    {gruppenSchnitte[s.id] != null && (() => {
                      const personWert = s.gesamt / (s.einheit === '€' ? Math.max(1, anwesenheit.teilnahmen.size) : 1)
                      const delta = personWert - gruppenSchnitte[s.id]
                      const isEqual = Math.abs(delta) < 0.05
                      const isGood = !isEqual && (s.einheit === '€' ? delta <= 0 : delta >= 0)
                      const fmt = s.einheit === '€'
                        ? `${Math.abs(delta).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} €`
                        : `${Math.abs(delta) % 1 === 0 ? Math.abs(delta) : Math.abs(delta).toFixed(1)} ${s.einheit}`
                      return (
                        <div style={{ marginTop: 6, fontSize: 12, color: isEqual ? 'var(--ink)' : (isGood ? '#27ae60' : '#c0392b'), fontFamily: 'var(--sans)' }}>
                          {isEqual ? '= Ø' : `${fmt} ${delta > 0 ? 'über' : 'unter'} Ø`}
                        </div>
                      )
                    })()}
                  </Link>
                )
              })}

              {[
                { label: 'Pudelkönig', typ: 'pudelkoenig', count: ehrentitel.pudelkoenig, rang: ehrentitelRaenge.pudelkoenig, schnitt: ehrentitelSchnitte.pudelkoenig },
                { label: 'König', typ: 'koenig', count: ehrentitel.koenig, rang: ehrentitelRaenge.koenig, schnitt: ehrentitelSchnitte.koenig },
              ].map((e) => {
                const medal = e.rang && e.rang <= 3 ? MEDALS[e.rang - 1] : null
                const delta = e.schnitt != null ? e.count - e.schnitt : null
                const isEqual = delta != null && Math.abs(delta) < 0.05
                const isGood = delta != null && !isEqual && delta >= 0
                return (
                  <Link key={e.label} to={`/mitglied/${mitgliedId}/ehrentitel/${e.typ}`}
                    style={{ textDecoration: 'none', display: 'block', background: 'var(--paper)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', padding: '24px 26px 22px', transition: 'box-shadow 0.2s, transform 0.2s' }}
                    onMouseEnter={el => { el.currentTarget.style.boxShadow = 'var(--shadow-md)'; el.currentTarget.style.transform = 'translateY(-2px)' }}
                    onMouseLeave={el => { el.currentTarget.style.boxShadow = 'var(--shadow-sm)'; el.currentTarget.style.transform = 'translateY(0)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>{e.label}</div>
                      {medal
                        ? <span style={{ fontSize: 18, lineHeight: 1, display: 'inline-block' }}>{medal}</span>
                        : e.rang ? <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Platz {e.rang}</span> : null
                      }
                    </div>
                    <div style={{ fontFamily: 'var(--serif)', fontSize: 32, color: e.count > 0 ? 'var(--ink)' : 'var(--ink-faint)', lineHeight: 1.1 }}>
                      {e.count}×
                    </div>
                    {delta != null && (
                      <div style={{ marginTop: 6, fontSize: 12, color: isEqual ? 'var(--ink)' : (isGood ? '#27ae60' : '#c0392b'), fontFamily: 'var(--sans)' }}>
                        {isEqual ? '= Ø' : `${Math.abs(delta).toFixed(1)} ${delta > 0 ? 'über' : 'unter'} Ø`}
                      </div>
                    )}
                    {e.count === 0 && delta == null && <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 4, fontStyle: 'italic' }}>Noch nie</div>}
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

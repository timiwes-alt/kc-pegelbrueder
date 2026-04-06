import { useState, useEffect, useRef } from 'react'
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { getKategorie, getRangliste, getRanglisteDurchschnitt, getKategorieRohDaten, getKategorieExtrema } from '../lib/supabase'
import ZeitstrahlNav from '../components/ZeitstrahlNav'

function formatWert(wert, einheit, durchschnitt = false) {
  if (einheit === '€') return `${Number(wert).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} €${durchschnitt ? '\u202f/\u202fAbend' : ''}`
  return `${wert} ${einheit}`
}

function Podium({ daten, einheit, durchschnitt }) {
  const top = daten.slice(0, 3)
  const reihenfolge = [1, 0, 2]
  const hoehen = [110, 80, 60]
  const MEDALS = ['🥇', '🥈', '🥉']

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 8, marginBottom: 48, marginTop: 8 }}>
      {reihenfolge.map((rankIdx, di) => {
        const m = top[rankIdx]
        if (!m) return <div key={rankIdx} style={{ width: 140 }} />
        const anzeigeName = m.spitzname || m.name
        const initialen = anzeigeName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
        const h = hoehen[rankIdx]
        const isGold = rankIdx === 0

        return (
          <div key={m.id} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', width: 150,
            animation: `fadeUp 0.5s cubic-bezier(0.4,0,0.2,1) ${di * 0.08 + 0.05}s both`,
          }}>
            <Link to={`/mitglied/${m.id}`} style={{ textDecoration: 'none' }}>
              <div style={{
                width: isGold ? 54 : 44,
                height: isGold ? 54 : 44,
                borderRadius: '50%',
                background: isGold ? 'var(--ink)' : 'var(--paper-subtle)',
                color: isGold ? 'var(--paper)' : 'var(--ink-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--serif)',
                fontSize: isGold ? 18 : 15,
                marginBottom: 8,
                transition: 'opacity 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                {initialen}
              </div>
            </Link>
            <Link to={`/mitglied/${m.id}`} style={{
              fontFamily: 'var(--serif)', fontSize: isGold ? 16 : 14,
              color: 'var(--ink)', textDecoration: 'none',
              borderBottom: '1px solid var(--paper-mid)',
              marginBottom: 4, textAlign: 'center',
              transition: 'border-color 0.15s',
            }}
              onMouseEnter={e => e.target.style.borderColor = 'var(--ink)'}
              onMouseLeave={e => e.target.style.borderColor = 'var(--paper-mid)'}
            >
              {anzeigeName}
            </Link>
            <div style={{ fontSize: 12, fontFamily: 'var(--serif)', color: 'var(--ink-muted)', marginBottom: 10 }}>
              {formatWert(m.gesamt, einheit, durchschnitt)}
            </div>
            <div style={{
              width: '100%',
              height: h,
              background: isGold ? 'var(--ink)' : 'var(--paper-warm)',
              border: '1px solid var(--paper-subtle)',
              borderRadius: '4px 4px 0 0',
              display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
              paddingTop: 10,
            }}>
              <span style={{ fontSize: 20 }}>{MEDALS[rankIdx]}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function VollTabelle({ daten, einheit, durchschnitt, prevDaten }) {
  const prevRankMap = {}
  if (prevDaten) prevDaten.forEach((m, i) => { prevRankMap[m.id] = i })

  const max = daten.length > 0 ? daten[0].gesamt : 1
  const MEDALS = ['🥇', '🥈', '🥉']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {daten.map((m, i) => {
        const anzeigeName = m.spitzname || m.name
        const pct = (m.gesamt / max) * 100
        const isFirst = i === 0

        const prevRank = prevDaten ? (prevRankMap[m.id] ?? null) : null
        const delta    = prevRank !== null ? prevRank - i : 0
        const moved    = delta !== 0
        const movedUp  = delta > 0

        return (
          <div
            key={m.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              animation: `fadeUp 0.45s cubic-bezier(0.4,0,0.2,1) ${i * 0.055}s both`,
              position: 'relative',
              borderRadius: 8,
              padding: '2px 6px',
              margin: '0 -6px',
            }}
          >
            {/* Flash background overlay — key includes new rank so it remounts on change */}
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

            {/* Rank number + delta badge */}
            <div style={{
              width: 26, flexShrink: 0, textAlign: 'center', lineHeight: 1,
              fontSize: i < 3 ? 15 : 11, color: 'var(--ink-faint)', fontFamily: 'var(--serif)',
            }}>
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
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flex: 1, minWidth: 0 }}>
                  <Link
                    to={`/mitglied/${m.id}`}
                    style={{
                      fontFamily: 'var(--serif)', fontSize: isFirst ? 18 : 16,
                      color: 'var(--ink)', textDecoration: 'none',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      transition: 'opacity 0.15s',
                    }}
                    onMouseEnter={e => e.target.style.opacity = '0.6'}
                    onMouseLeave={e => e.target.style.opacity = '1'}
                  >
                    {anzeigeName}
                  </Link>
                  {m.spitzname && <span style={{ fontSize: 10, color: 'var(--ink-faint)', fontStyle: 'italic', flexShrink: 0 }}>{m.name}</span>}
                </div>
                <span style={{
                  fontFamily: 'var(--serif)',
                  fontSize: isFirst ? 22 : 17,
                  color: isFirst ? 'var(--ink)' : 'var(--ink-muted)',
                  flexShrink: 0, paddingLeft: 16,
                }}>
                  {formatWert(m.gesamt, einheit, durchschnitt)}
                </span>
              </div>
              <div style={{ height: isFirst ? 7 : 5, background: 'var(--paper-subtle)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${pct}%`, borderRadius: 99,
                  background: isFirst
                    ? 'linear-gradient(to right, #1d1d1f 0%, #6e6e73 100%)'
                    : 'linear-gradient(to right, #6e6e73 0%, #aeaeb2 100%)',
                  opacity: Math.max(0.45, 1 - i * 0.08),
                  transformOrigin: 'left',
                  animation: `barGrow 0.65s cubic-bezier(0.4,0,0.2,1) ${i * 0.06}s both`,
                  transition: 'width 0.55s cubic-bezier(0.4,0,0.2,1)',
                }} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function RanglisteDetail() {
  const { kategorieId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const bis = searchParams.get('bis') || null
  const [kategorie, setKategorie] = useState(null)
  const [daten, setDaten] = useState([])
  const [gesamtDaten, setGesamtDaten] = useState([])
  const [rohDaten, setRohDaten] = useState(null)
  const [extrema, setExtrema] = useState(null)
  const [loading, setLoading] = useState(true)
  const latestDatenRef = useRef([])
  latestDatenRef.current = daten
  const prevDatenRef = useRef([])
  const latestGesamtRef = useRef([])
  latestGesamtRef.current = gesamtDaten
  const prevGesamtRef = useRef([])

  useEffect(() => {
    async function laden() {
      prevDatenRef.current = latestDatenRef.current
      prevGesamtRef.current = latestGesamtRef.current
      try {
        const kat = await getKategorie(kategorieId)
        const rang = await (kat.einheit === '€' ? getRanglisteDurchschnitt : getRangliste)(kategorieId, bis)
        setKategorie(kat)
        setDaten(rang)
        // Rekordkacheln für € Kategorien (mit bis-Filter wenn gesetzt)
        if (kat.einheit === '€') {
          const [roh, ext, gesamt] = await Promise.all([
            getKategorieRohDaten(kategorieId, bis),
            getKategorieExtrema(kategorieId, bis),
            getRangliste(kategorieId, bis),
          ])
          setRohDaten(roh)
          setExtrema(ext)
          setGesamtDaten(gesamt)
        }
      } finally {
        setLoading(false)
      }
    }
    laden()
  }, [kategorieId, bis])

  if (loading) return <div className="page"><div className="empty"><p style={{ color: 'var(--ink-faint)' }}>Lade…</p></div></div>
  if (!kategorie) return <div className="page"><div className="empty"><p className="empty-title">Nicht gefunden</p></div></div>

  const gesamt = daten.reduce((s, m) => s + m.gesamt, 0)

  const zusammenfassung = kategorie.einheit === '€' && rohDaten ? [
    { label: 'Gesamt (Alle Abende)', wert: `${Number(rohDaten.totalSumme).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} €`, sub: `${daten.reduce((s,m) => s + m.eintraege, 0)} Einträge` },
    { label: 'Durchschnitt pro Abend', wert: `${Number(rohDaten.totalSumme / Math.max(1, rohDaten.anzahlAbende)).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} €`, sub: `über ${rohDaten.anzahlAbende} Abende` },
    { label: 'Durchschnitt pro Mitglied', wert: `${Number(gesamt / daten.length).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} €`, sub: `bei ${daten.length} Mitgliedern` },
  ] : [
    { label: 'Führend', wert: formatWert(daten[0]?.gesamt, kategorie.einheit), sub: daten[0]?.spitzname || daten[0]?.name },
    { label: 'Gesamt', wert: formatWert(gesamt, kategorie.einheit), sub: `${daten.reduce((s,m) => s + m.eintraege, 0)} Einträge` },
    { label: 'Durchschnitt', wert: formatWert(gesamt / daten.length, kategorie.einheit), sub: 'pro Mitglied' },
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
        <h2 className="section-title">{kategorie.name}</h2>
      </div>

      <ZeitstrahlNav bis={bis} basisRoute={`/rangliste/${kategorieId}`} />

      {/* Zusammenfassung */}
      {daten.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10, marginBottom: 40 }}>
          {zusammenfassung.map((s, i) => (
            <div key={s.label} style={{
              background: 'var(--paper)',
              borderRadius: 'var(--radius)',
              boxShadow: 'var(--shadow-sm)',
              padding: '20px 22px',
              animation: `fadeUp 0.5s cubic-bezier(0.4,0,0.2,1) ${i * 0.07 + 0.05}s both`,
              transition: 'box-shadow 0.2s, transform 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 8 }}>{s.label}</div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)' }}>{s.wert}</div>
            </div>
          ))}
        </div>
      )}

      {daten.length === 0 ? (
        <div className="empty"><p className="empty-title">Noch keine Einträge</p></div>
      ) : (
        <div style={{
          background: 'var(--paper)',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow-sm)',
          padding: '32px 36px',
        }}>
          {kategorie.einheit === '€' && (
            <div style={{ marginBottom: 20 }}>
              <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>
                Durchschnitt pro Abend
              </span>
            </div>
          )}
          <VollTabelle daten={daten} einheit={kategorie.einheit} durchschnitt={kategorie.einheit === '€'} prevDaten={prevDatenRef.current} />
        </div>
      )}

      {/* Gesamtstrafen Tabelle für € Kategorien */}
      {kategorie.einheit === '€' && gesamtDaten.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ background: 'var(--paper)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', padding: '32px 36px' }}>
            <div style={{ marginBottom: 20 }}>
              <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>
                Insgesamt
              </span>
            </div>
            <VollTabelle daten={gesamtDaten} einheit={kategorie.einheit} durchschnitt={false} prevDaten={prevGesamtRef.current} />
          </div>
        </div>
      )}

      {/* Rekordkacheln für € Kategorien */}
      {kategorie.einheit === '€' && extrema && (() => {
        const fmt = v => Number(v).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '\u202f€'
        const fmtDat = d => d ? new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' }) : '–'
        const gP = extrema.guenstigstePerson
        const tP = extrema.teuertstePerson
        const gA = extrema.guenstigsterAbend
        const tA = extrema.teuerterAbend
        const tiles = [
          { label: 'Günstigster Abend jemals', sub: 'Person', name: gP.spitzname || gP.name, wert: fmt(gP.summe), datum: fmtDat(gP.datum), href: `/kegelabend/${gP.kegelabend_id}`, badge: '⭐️ Günstigster Abend jemals', kegelabend_id: gP.kegelabend_id, color: '#27ae60' },
          { label: 'Teuerster Abend jemals', sub: 'Person', name: tP.spitzname || tP.name, wert: fmt(tP.summe), datum: fmtDat(tP.datum), href: `/kegelabend/${tP.kegelabend_id}`, badge: '💀 Teuerster Abend jemals', kegelabend_id: tP.kegelabend_id, color: '#c0392b' },
          { label: 'Günstigster Abend jemals', sub: 'Gesamt', name: null, wert: fmt(gA.summe), datum: fmtDat(gA.datum), href: `/kegelabend/${gA.kegelabend_id}`, badge: '⭐️ Günstigster Abend jemals', color: '#27ae60' },
          { label: 'Teuerster Abend jemals', sub: 'Gesamt', name: null, wert: fmt(tA.summe), datum: fmtDat(tA.datum), href: `/kegelabend/${tA.kegelabend_id}`, badge: '💀 Teuerster Abend jemals', color: '#c0392b' },
        ]
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10, marginTop: 40 }}>
            {tiles.map((t, i) => (
              <div key={t.label + t.sub} style={{
                background: 'var(--paper)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)',
                padding: '20px 22px', animation: `fadeUp 0.5s cubic-bezier(0.4,0,0.2,1) ${i * 0.07 + 0.05}s both`,
                transition: 'box-shadow 0.2s, transform 0.2s', cursor: 'pointer',
              }}
                onClick={() => navigate(t.href, { state: { badge: t.badge, kegelabend_id: t.kegelabend_id ?? null } })}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.transform = 'translateY(0)' }}
              >
                <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 2 }}>{t.label}</div>
                <div style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 10, opacity: 0.6 }}>{t.sub}</div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 17, color: 'var(--ink)', marginBottom: 2 }}>{t.name ?? t.datum}</div>
                <div style={{ fontSize: 17, fontFamily: 'var(--serif)', color: t.color, marginBottom: t.name ? 6 : 0 }}>{t.wert}</div>
              </div>
            ))}
          </div>
        )
      })()}
    </div>
  )
}

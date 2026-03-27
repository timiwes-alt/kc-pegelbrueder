import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getKategorie, getRangliste, getRanglisteDurchschnitt, getKategorieRohDaten } from '../lib/supabase'

function formatWert(wert, einheit, durchschnitt = false) {
  if (einheit === '€') return `${Number(wert).toFixed(1)} €${durchschnitt ? '\u202f/\u202fAbend' : ''}`
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

function VollTabelle({ daten, einheit, durchschnitt }) {
  const max = daten.length > 0 ? daten[0].gesamt : 1
  const MEDALS = ['🥇', '🥈', '🥉']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {daten.map((m, i) => {
        const anzeigeName = m.spitzname || m.name
        const pct = (m.gesamt / max) * 100
        const isFirst = i === 0
        return (
          <div key={m.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            animation: `fadeUp 0.45s cubic-bezier(0.4,0,0.2,1) ${i * 0.055}s both`,
          }}>
            <div style={{
              width: 26, flexShrink: 0, textAlign: 'center', lineHeight: 1,
              fontSize: i < 3 ? 15 : 11, color: 'var(--ink-faint)', fontFamily: 'var(--serif)',
            }}>
              {i < 3 ? MEDALS[i] : i + 1}
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
  const [kategorie, setKategorie] = useState(null)
  const [daten, setDaten] = useState([])
  const [rohDaten, setRohDaten] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function laden() {
      try {
        const kat = await getKategorie(kategorieId)
        const rang = await (kat.einheit === '€' ? getRanglisteDurchschnitt : getRangliste)(kategorieId)
        setKategorie(kat)
        setDaten(rang)
        if (kat.einheit === '€') {
          setRohDaten(await getKategorieRohDaten(kategorieId))
        }
      } finally {
        setLoading(false)
      }
    }
    laden()
  }, [kategorieId])

  if (loading) return <div className="page"><div className="empty"><p style={{ color: 'var(--ink-faint)' }}>Lade…</p></div></div>
  if (!kategorie) return <div className="page"><div className="empty"><p className="empty-title">Nicht gefunden</p></div></div>

  const gesamt = daten.reduce((s, m) => s + m.gesamt, 0)

  const zusammenfassung = kategorie.einheit === '€' && rohDaten ? [
    { label: 'Gesamt (Alle Abende)', wert: `${Number(rohDaten.totalSumme).toFixed(1)} €`, sub: `${daten.reduce((s,m) => s + m.eintraege, 0)} Einträge` },
    { label: 'Durchschnitt pro Abend', wert: `${Number(rohDaten.totalSumme / Math.max(1, rohDaten.anzahlAbende)).toFixed(1)} €`, sub: `über ${rohDaten.anzahlAbende} Abende` },
    { label: 'Durchschnitt Mitglied pro Abend', wert: `${Number(gesamt / daten.length).toFixed(1)} €`, sub: `bei ${daten.length} Mitgliedern` },
  ] : [
    { label: 'Führend', wert: formatWert(daten[0]?.gesamt, kategorie.einheit), sub: daten[0]?.spitzname || daten[0]?.name },
    { label: 'Gesamt', wert: formatWert(gesamt, kategorie.einheit), sub: `${daten.reduce((s,m) => s + m.eintraege, 0)} Einträge` },
    { label: 'Durchschnitt', wert: formatWert(gesamt / daten.length, kategorie.einheit), sub: 'pro Mitglied' },
  ]

  return (
    <div className="page">
      <div style={{ marginTop: 40 }}>
        <Link to="/rangliste" style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-faint)', textDecoration: 'none' }}>
          ← Alle Statistiken
        </Link>
      </div>

      <div className="section-header">
        <h2 className="section-title">{kategorie.name}</h2>
        <span className="section-meta">{kategorie.einheit} · {daten.length} Mitglieder</span>
      </div>

      {/* Zusammenfassung */}
      {daten.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 40 }}>
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
              <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)', marginBottom: 4 }}>{s.wert}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{s.sub}</div>
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
          {daten.length >= 2 && <Podium daten={daten} einheit={kategorie.einheit} durchschnitt={kategorie.einheit === '€'} />}
          <VollTabelle daten={daten} einheit={kategorie.einheit} durchschnitt={kategorie.einheit === '€'} />
        </div>
      )}
    </div>
  )
}

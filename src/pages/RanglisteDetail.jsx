import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getKategorie, getRangliste, getRanglisteDurchschnitt, getKategorieRohDaten } from '../lib/supabase'

function formatWert(wert, einheit, durchschnitt = false) {
  if (einheit === '€') return `${Number(wert).toFixed(2)} €${durchschnitt ? '\u202f/\u202fAbend' : ''}`
  return `${wert} ${einheit}`
}

// ── Podium für Top 3 ─────────────────────────────────────────
function Podium({ daten, einheit, durchschnitt }) {
  const top = daten.slice(0, 3)
  const reihenfolge = [1, 0, 2] // Silber links, Gold mitte, Bronze rechts
  const hoehen = [110, 80, 60]
  const MEDALS = ['🥇', '🥈', '🥉']

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 4, marginBottom: 40, marginTop: 8 }}>
      {reihenfolge.map((rankIdx) => {
        const m = top[rankIdx]
        if (!m) return <div key={rankIdx} style={{ width: 140 }} />
        const anzeigeName = m.spitzname || m.name
        const initialen = anzeigeName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
        const h = hoehen[rankIdx]
        const isGold = rankIdx === 0

        return (
          <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 160 }}>
            {/* Avatar */}
            <Link to={`/mitglied/${m.id}`} style={{ textDecoration: 'none' }}>
              <div style={{
                width: isGold ? 56 : 44,
                height: isGold ? 56 : 44,
                borderRadius: '50%',
                background: isGold ? 'var(--ink)' : 'var(--paper-mid)',
                color: isGold ? 'var(--paper)' : 'var(--ink-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--serif)',
                fontSize: isGold ? 20 : 16,
                marginBottom: 8,
                border: isGold ? '2px solid var(--ink)' : '1px solid var(--paper-mid)',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                {initialen}
              </div>
            </Link>
            {/* Name */}
            <Link to={`/mitglied/${m.id}`} style={{
              fontFamily: 'var(--serif)', fontSize: isGold ? 16 : 14,
              color: 'var(--ink)', textDecoration: 'none',
              borderBottom: '1px solid var(--ink-faint)',
              marginBottom: 4, textAlign: 'center',
            }}
            onMouseEnter={e => e.target.style.borderColor = 'var(--ink)'}
            onMouseLeave={e => e.target.style.borderColor = 'var(--ink-faint)'}
            >
              {anzeigeName}
            </Link>
            <div style={{ fontSize: 12, fontFamily: 'var(--serif)', color: 'var(--ink-muted)', marginBottom: 8 }}>
              {formatWert(m.gesamt, einheit, durchschnitt)}
            </div>
            {/* Podiumsblock */}
            <div style={{
              width: '100%',
              height: h,
              background: isGold ? 'var(--ink)' : 'var(--paper-warm)',
              border: '1px solid var(--paper-mid)',
              borderRadius: '3px 3px 0 0',
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

// ── Vollständige Tabelle ─────────────────────────────────────
function VollTabelle({ daten, einheit, durchschnitt }) {
  const max = daten.length > 0 ? daten[0].gesamt : 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {daten.map((m, i) => {
        const anzeigeName = m.spitzname || m.name
        const pct = (m.gesamt / max) * 100
        return (
          <div key={m.id} style={{
            display: 'flex', alignItems: 'center', gap: 16,
            padding: '14px 0', borderBottom: '1px solid var(--paper-mid)',
          }}>
            <span style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink-faint)', width: 28, textAlign: 'right', flexShrink: 0 }}>
              {i + 1}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                <Link to={`/mitglied/${m.id}`} style={{
                  fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--ink)',
                  textDecoration: 'none', borderBottom: '1px solid var(--ink-faint)',
                }}
                onMouseEnter={e => e.target.style.borderColor = 'var(--ink)'}
                onMouseLeave={e => e.target.style.borderColor = 'var(--ink-faint)'}
                >
                  {anzeigeName}
                </Link>
                {m.spitzname && <span style={{ fontSize: 11, color: 'var(--ink-muted)', fontStyle: 'italic' }}>{m.name}</span>}
              </div>
              <div style={{ height: 4, background: 'var(--paper-mid)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${pct}%`,
                  background: i === 0 ? 'var(--ink)' : 'var(--ink-muted)',
                  borderRadius: 2, opacity: Math.max(0.3, 1 - i * 0.07),
                  transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
                }} />
              </div>
            </div>
            <span style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)', flexShrink: 0 }}>
              {formatWert(m.gesamt, einheit, durchschnitt)}
            </span>
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

  return (
    <div className="page">
      <div style={{ marginTop: 40 }}>
        <Link to="/rangliste" style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-muted)', textDecoration: 'none' }}>
          ← Alle Statistiken
        </Link>
      </div>

      <div className="section-header">
        <h2 className="section-title">{kategorie.name}</h2>
        <span className="section-meta">{kategorie.einheit} · {daten.length} Mitglieder</span>
      </div>

      {/* Zusammenfassung */}
      {daten.length > 0 && (
        <div style={{ display: 'flex', gap: 1, background: 'var(--paper-mid)', border: '1px solid var(--paper-mid)', marginBottom: 40 }}>
          {(kategorie.einheit === '€' && rohDaten ? [
            { label: 'Gesamt (Alle Abende)', wert: `${Number(rohDaten.totalSumme).toFixed(2)} €`, sub: `${daten.reduce((s,m) => s + m.eintraege, 0)} Einträge` },
            { label: 'Durchschnitt pro Abend', wert: `${Number(rohDaten.totalSumme / Math.max(1, rohDaten.anzahlAbende)).toFixed(2)} €`, sub: `über ${rohDaten.anzahlAbende} Abende` },
            { label: 'Durchschnitt Mitglied pro Abend', wert: `${Number(gesamt / daten.length).toFixed(2)} €`, sub: `bei ${daten.length} Mitgliedern` },
          ] : [
            { label: 'Führend', wert: formatWert(daten[0].gesamt, kategorie.einheit), sub: daten[0].spitzname || daten[0].name },
            { label: 'Gesamt', wert: formatWert(gesamt, kategorie.einheit), sub: `${daten.reduce((s,m) => s + m.eintraege, 0)} Einträge` },
            { label: 'Durchschnitt', wert: formatWert(gesamt / daten.length, kategorie.einheit), sub: 'pro Mitglied' },
          ]).map(s => (
            <div key={s.label} style={{ flex: 1, background: 'var(--paper)', padding: '20px 24px' }}>
              <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)', marginBottom: 2 }}>{s.wert}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{s.sub}</div>
            </div>
          ))}
        </div>
      )}

      {daten.length === 0 ? (
        <div className="empty"><p className="empty-title">Noch keine Einträge</p></div>
      ) : (
        <>
          {daten.length >= 2 && <Podium daten={daten} einheit={kategorie.einheit} durchschnitt={kategorie.einheit === '€'} />}
          <VollTabelle daten={daten} einheit={kategorie.einheit} durchschnitt={kategorie.einheit === '€'} />
        </>
      )}
    </div>
  )
}

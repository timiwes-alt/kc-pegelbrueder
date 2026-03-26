import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getKategorien, getRangliste, getRanglisteDurchschnitt, getRanglisteAnwesenheit, getRanglisteStrafen } from '../lib/supabase'

function formatWert(wert, einheit, durchschnitt = false) {
  if (einheit === '€') return `${Number(wert).toFixed(2)} €${durchschnitt ? '\u202f/\u202fAbend' : ''}`
  return `${wert} ${einheit}`
}

function BalkenChart({ daten, einheit, durchschnitt }) {
  const max = daten.length > 0 ? daten[0].gesamt : 1
  const MEDALS = ['🥇', '🥈', '🥉']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {daten.map((m, i) => {
        const pct = (m.gesamt / max) * 100
        const anzeigeName = m.spitzname || m.name
        return (
          <div key={m.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, width: 22, flexShrink: 0 }}>{MEDALS[i] || `${i+1}.`}</span>
                <Link
                  to={`/mitglied/${m.id}`}
                  style={{ fontFamily: 'var(--serif)', fontSize: 17, color: 'var(--ink)', textDecoration: 'none', borderBottom: '1px solid var(--paper-mid)', transition: 'border-color 0.15s' }}
                  onMouseEnter={e => e.target.style.borderColor = 'var(--ink)'}
                  onMouseLeave={e => e.target.style.borderColor = 'var(--paper-mid)'}
                >
                  {anzeigeName}
                </Link>
                {m.spitzname && (
                  <span style={{ fontSize: 11, color: 'var(--ink-faint)', fontStyle: 'italic' }}>{m.name}</span>
                )}
              </div>
              <span style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--ink)', marginLeft: 12 }}>
                {formatWert(m.gesamt, einheit, durchschnitt)}
              </span>
            </div>
            <div style={{ height: 4, background: 'var(--paper-subtle)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${pct}%`,
                background: i === 0 ? 'var(--ink)' : 'var(--ink-faint)',
                borderRadius: 4,
                transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
              }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function StatistikKarte({ kategorie }) {
  const [daten, setDaten] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fn = kategorie.einheit === '€' ? getRanglisteDurchschnitt : getRangliste
    fn(kategorie.id).then(d => { setDaten(d); setLoading(false) }).catch(() => setLoading(false))
  }, [kategorie.id])

  return (
    <div style={{
      background: 'var(--paper)',
      borderRadius: 'var(--radius)',
      boxShadow: 'var(--shadow-sm)',
      padding: '28px 32px 32px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--paper-subtle)' }}>
        <div>
          <Link
            to={`/rangliste/${kategorie.id}`}
            style={{ fontFamily: 'var(--serif)', fontSize: 24, color: 'var(--ink)', textDecoration: 'none' }}
            onMouseEnter={e => e.target.style.opacity = '0.6'}
            onMouseLeave={e => e.target.style.opacity = '1'}
          >
            {kategorie.name}
          </Link>
          {kategorie.beschreibung && (
            <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 4 }}>{kategorie.beschreibung}</div>
          )}
        </div>
        <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)', paddingTop: 6 }}>
          {kategorie.einheit}
        </span>
      </div>

      {loading ? (
        <div style={{ color: 'var(--ink-faint)', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>Lade…</div>
      ) : daten.length === 0 ? (
        <div style={{ color: 'var(--ink-faint)', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>Noch keine Einträge</div>
      ) : (
        <BalkenChart daten={daten} einheit={kategorie.einheit} durchschnitt={kategorie.einheit === '€'} />
      )}

      <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--paper-subtle)' }}>
        <Link
          to={`/rangliste/${kategorie.id}`}
          style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-faint)', textDecoration: 'none' }}
          onMouseEnter={e => e.target.style.color = 'var(--ink)'}
          onMouseLeave={e => e.target.style.color = 'var(--ink-faint)'}
        >
          Details ansehen →
        </Link>
      </div>
    </div>
  )
}

function VirtualStatKarte({ titel, einheit, ladeFn, beschreibung }) {
  const [daten, setDaten] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ladeFn().then(d => { setDaten(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  function fmt(wert) {
    if (einheit === '€') return `${Number(wert).toFixed(2)} €`
    return `${wert} ${einheit}`
  }

  return (
    <div style={{
      background: 'var(--paper)',
      borderRadius: 'var(--radius)',
      boxShadow: 'var(--shadow-sm)',
      padding: '28px 32px 32px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--paper-subtle)' }}>
        <div>
          <span style={{ fontFamily: 'var(--serif)', fontSize: 24, color: 'var(--ink)' }}>{titel}</span>
          {beschreibung && (
            <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 4 }}>{beschreibung}</div>
          )}
        </div>
        <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)', paddingTop: 6 }}>
          {einheit}
        </span>
      </div>

      {loading ? (
        <div style={{ color: 'var(--ink-faint)', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>Lade…</div>
      ) : daten.length === 0 ? (
        <div style={{ color: 'var(--ink-faint)', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>Noch keine Einträge</div>
      ) : (
        <BalkenChart daten={daten} einheit={einheit} durchschnitt={false} />
      )}
    </div>
  )
}

export default function Rangliste() {
  const [kategorien, setKategorien] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getKategorien().then(k => { setKategorien(k); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  return (
    <div className="page">
      <div className="section-header">
        <h2 className="section-title">Statistiken</h2>
        <span className="section-meta">Alle Kategorien</span>
      </div>

      {loading ? (
        <div className="empty"><p style={{ color: 'var(--ink-faint)' }}>Lade…</p></div>
      ) : kategorien.length === 0 ? (
        <div className="empty">
          <p className="empty-title">Noch keine Kategorien</p>
          <p style={{ fontSize: 14 }}>Lege unter „Verwaltung" eine Statistik-Kategorie an.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {kategorien.map(kat => <StatistikKarte key={kat.id} kategorie={kat} />)}
          <VirtualStatKarte
            titel="Anwesenheit"
            einheit="Abende"
            ladeFn={getRanglisteAnwesenheit}
            beschreibung="Anzahl besuchter Kegelabende pro Mitglied"
          />
          <VirtualStatKarte
            titel="Strafen gesamt"
            einheit="€"
            ladeFn={getRanglisteStrafen}
            beschreibung="Summe aller Strafen über alle Kategorien"
          />
        </div>
      )}
    </div>
  )
}

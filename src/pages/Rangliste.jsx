import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getKategorien, getRangliste, getRanglisteDurchschnitt, getAnwesenheitDaten } from '../lib/supabase'

function formatWert(wert, einheit, durchschnitt = false) {
  if (einheit === '€') return `${Number(wert).toFixed(1)} €${durchschnitt ? '\u202f/\u202fAbend' : ''}`
  return `${wert} ${einheit}`
}

function BalkenChart({ daten, einheit, durchschnitt }) {
  const max = daten.length > 0 ? daten[0].gesamt : 1
  const MEDALS = ['🥇', '🥈', '🥉']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {daten.map((m, i) => {
        const pct = (m.gesamt / max) * 100
        const anzeigeName = m.spitzname || m.name
        const isFirst = i === 0
        return (
          <div key={m.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            animation: `fadeUp 0.45s cubic-bezier(0.4,0,0.2,1) ${i * 0.06}s both`,
          }}>
            <div style={{
              width: 26, flexShrink: 0, textAlign: 'center', lineHeight: 1,
              fontSize: i < 3 ? 15 : 11,
              color: 'var(--ink-faint)', fontFamily: 'var(--serif)',
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
                  {m.spitzname && (
                    <span style={{ fontSize: 10, color: 'var(--ink-faint)', fontStyle: 'italic', flexShrink: 0 }}>{m.name}</span>
                  )}
                </div>
                <span style={{
                  fontFamily: 'var(--serif)',
                  fontSize: isFirst ? 21 : 17,
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

function StatistikKarte({ kategorie, index = 0 }) {
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
      animation: `fadeUp 0.5s cubic-bezier(0.4,0,0.2,1) ${index * 0.09 + 0.1}s both`,
      transition: 'box-shadow 0.2s, transform 0.2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--paper-subtle)' }}>
        <div>
          <Link
            to={`/rangliste/${kategorie.id}`}
            style={{ fontFamily: 'var(--serif)', fontSize: 24, color: 'var(--ink)', textDecoration: 'none', transition: 'opacity 0.15s' }}
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
          style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-faint)', textDecoration: 'none', transition: 'color 0.15s' }}
          onMouseEnter={e => e.target.style.color = 'var(--ink)'}
          onMouseLeave={e => e.target.style.color = 'var(--ink-faint)'}
        >
          Details ansehen →
        </Link>
      </div>
    </div>
  )
}

function AnwesenheitHeatmapKarte({ index = 0 }) {
  const [daten, setDaten] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAnwesenheitDaten().then(d => { setDaten(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const CELL = 10

  return (
    <Link to="/rangliste/anwesenheit" style={{ textDecoration: 'none' }}>
      <div style={{
        background: 'var(--paper)',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow-sm)',
        padding: '28px 32px 32px',
        animation: `fadeUp 0.5s cubic-bezier(0.4,0,0.2,1) ${index * 0.09 + 0.1}s both`,
        transition: 'box-shadow 0.2s, transform 0.2s',
        cursor: 'pointer',
      }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.transform = 'translateY(0)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--paper-subtle)' }}>
          <div>
            <span style={{ fontFamily: 'var(--serif)', fontSize: 24, color: 'var(--ink)' }}>Anwesenheit</span>
            {daten && <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 4 }}>{daten.abende.length} Abende</div>}
          </div>
          <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)', paddingTop: 6 }}>Abende</span>
        </div>

        {loading ? (
          <div style={{ color: 'var(--ink-faint)', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>Lade…</div>
        ) : !daten || daten.mitglieder.length === 0 ? (
          <div style={{ color: 'var(--ink-faint)', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>Noch keine Einträge</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {daten.mitglieder.map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--ink-muted)', width: 76, flexShrink: 0, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.spitzname || m.name}
                  </span>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {daten.abende.map(a => {
                      const dabei = daten.teilnahmen.has(`${m.id}:${a.id}`)
                      return (
                        <div key={a.id} style={{
                          width: CELL, height: CELL, borderRadius: 2, flexShrink: 0,
                          background: dabei ? 'var(--ink)' : 'var(--paper-subtle)',
                          opacity: dabei ? 1 : 0.5,
                        }} />
                      )
                    })}
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--serif)', flexShrink: 0 }}>{m.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--paper-subtle)', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>
          Details ansehen →
        </div>
      </div>
    </Link>
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
          {kategorien.map((kat, i) => <StatistikKarte key={kat.id} kategorie={kat} index={i} />)}
          <AnwesenheitHeatmapKarte index={kategorien.length} />
        </div>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getKategorien, getRangliste, getRanglisteDurchschnitt, getMitglieder } from '../lib/supabase'
import { SAISONS } from '../data/saisons'


function MiniStatKarte({ kategorie }) {
  const [daten, setDaten] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fn = kategorie.einheit === '€' ? getRanglisteDurchschnitt : getRangliste
    fn(kategorie.id)
      .then(d => { setDaten(d.slice(0, 5)); setLoading(false) })
      .catch(() => setLoading(false))
  }, [kategorie.id])

  const max = daten.length > 0 ? daten[0].gesamt : 1

  return (
    <Link to={`/rangliste/${kategorie.id}`} style={{ textDecoration: 'none' }}>
      <div style={{
        background: 'var(--paper)',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow-sm)',
        padding: '24px 26px 22px',
        cursor: 'pointer',
        transition: 'box-shadow 0.2s, transform 0.15s',
        height: '100%',
      }}
        onMouseEnter={e => {
          e.currentTarget.style.boxShadow = 'var(--shadow-md)'
          e.currentTarget.style.transform = 'translateY(-2px)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
          e.currentTarget.style.transform = 'translateY(0)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <span style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)', lineHeight: 1.2 }}>
            {kategorie.name}
          </span>
          {kategorie.einheit !== '€' && (
            <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginTop: 4 }}>
              {kategorie.einheit}
            </span>
          )}
        </div>

        {loading ? (
          <div style={{ fontSize: 12, color: 'var(--ink-faint)', padding: '8px 0' }}>Lade…</div>
        ) : daten.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--ink-faint)', padding: '8px 0' }}>Noch keine Einträge</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {daten.map((m, i) => (
              <div key={m.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: i === 0 ? 'var(--ink)' : 'var(--ink-muted)', fontWeight: i === 0 ? 500 : 400 }}>
                    {m.spitzname || m.name}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--ink-muted)' }}>
                    {kategorie.einheit === '€' ? `${Number(m.gesamt).toFixed(2)}\u202f€/Abend` : m.gesamt}
                  </span>
                </div>
                <div style={{ height: 2, background: 'var(--paper-subtle)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${(m.gesamt / max) * 100}%`,
                    background: i === 0 ? 'var(--ink)' : 'var(--ink-faint)',
                    borderRadius: 2,
                  }} />
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 18, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>
          Details ansehen →
        </div>
      </div>
    </Link>
  )
}

export default function Home() {
  const [saisonIndex, setSaisonIndex] = useState(0)
  const [kategorien, setKategorien] = useState([])
  const [mitglieder, setMitglieder] = useState([])

  useEffect(() => {
    getKategorien().then(k => setKategorien(k)).catch(() => {})
    getMitglieder().then(m => setMitglieder(m)).catch(() => {})
  }, [])

  const mitgliedByName = {}
  for (const m of mitglieder) {
    if (m.spitzname) mitgliedByName[m.spitzname.toLowerCase()] = m.id
    mitgliedByName[m.name.toLowerCase()] = m.id
  }

  const saison = SAISONS[saisonIndex]
  const vorschauKategorien = kategorien.slice(0, 3)

  return (
    <>
      {/* Hero */}
      <div className="hero">
        <img src="/gruppenfoto.jpg" alt="KC Pegelbrüder Gruppenfoto" className="hero-img" />
        <div className="hero-gradient" />
        <div className="hero-overlay">
          <p className="hero-eyebrow">Est. 2025 · Haus Niederrhein</p>
          <h1 className="hero-name">KC Pegelbrüder</h1>
        </div>
        <div className="hero-scroll">
          <div className="hero-scroll-line" />
        </div>
      </div>

      <div className="page" style={{ paddingTop: 0 }}>

        {/* ── Ämter ─────────────────────────────────────────── */}
        <div className="section-header">
          <h2 className="section-title">Ämter</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => setSaisonIndex(i => i + 1)}
              disabled={saisonIndex >= SAISONS.length - 1}
              style={{
                background: 'none', border: 'none',
                cursor: saisonIndex >= SAISONS.length - 1 ? 'default' : 'pointer',
                color: saisonIndex >= SAISONS.length - 1 ? 'var(--ink-faint)' : 'var(--ink)',
                fontSize: 20, padding: '0 4px', lineHeight: 1,
              }}
            >←</button>
            <span className="section-meta">Saison {saison.label}</span>
            <button
              onClick={() => setSaisonIndex(i => i - 1)}
              disabled={saisonIndex <= 0}
              style={{
                background: 'none', border: 'none',
                cursor: saisonIndex <= 0 ? 'default' : 'pointer',
                color: saisonIndex <= 0 ? 'var(--ink-faint)' : 'var(--ink)',
                fontSize: 20, padding: '0 4px', lineHeight: 1,
              }}
            >→</button>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 12,
          marginBottom: 64,
        }}>
          {saison.aemter.map((amt) => (
            <div key={amt.titel} style={{
              background: 'var(--paper)',
              borderRadius: 'var(--radius)',
              boxShadow: 'var(--shadow-sm)',
              padding: '24px 26px 22px',
            }}>
              <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 10 }}>
                {amt.titel}
              </div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)', lineHeight: 1.2 }}>
                {amt.namen.map((name, i) => {
                  const id = mitgliedByName[name.toLowerCase()]
                  return (
                    <span key={name}>
                      {i > 0 && <span style={{ fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--ink-faint)', margin: '0 4px' }}>&amp;</span>}
                      {id
                        ? <Link to={`/mitglied/${id}`} style={{ color: 'inherit', textDecoration: 'none' }}
                            onMouseEnter={e => e.currentTarget.style.opacity = '0.6'}
                            onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                            {name}
                          </Link>
                        : name}
                    </span>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* ── Statistik-Vorschau ─────────────────────────────── */}
        {vorschauKategorien.length > 0 && (
          <>
            <div className="section-header">
              <h2 className="section-title">Statistiken</h2>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 12,
              marginBottom: 36,
            }}>
              {vorschauKategorien.map(kat => (
                <MiniStatKarte key={kat.id} kategorie={kat} />
              ))}
            </div>

            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <Link to="/rangliste" className="btn btn-primary" style={{ fontSize: 12, letterSpacing: '0.08em' }}>
                Alle Statistiken ansehen →
              </Link>
            </div>
          </>
        )}

      </div>
    </>
  )
}

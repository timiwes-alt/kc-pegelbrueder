import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getKategorien, getRangliste, getMitglieder } from '../lib/supabase'
import { SAISONS } from '../data/saisons'


function MiniStatKarte({ kategorie }) {
  const [daten, setDaten] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getRangliste(kategorie.id)
      .then(d => { setDaten(d.slice(0, 5)); setLoading(false) })
      .catch(() => setLoading(false))
  }, [kategorie.id])

  const max = daten.length > 0 ? daten[0].gesamt : 1

  return (
    <Link to={`/rangliste/${kategorie.id}`} style={{ textDecoration: 'none' }}>
      <div
        style={{
          background: 'var(--paper)',
          border: '1px solid var(--paper-mid)',
          borderRadius: 4,
          padding: '20px 22px 18px',
          cursor: 'pointer',
          transition: 'border-color 0.15s, background 0.15s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'var(--ink)'
          e.currentTarget.style.background = 'var(--paper-warm)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'var(--paper-mid)'
          e.currentTarget.style.background = 'var(--paper)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
          <span style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--ink)' }}>
            {kategorie.name}
          </span>
          {kategorie.einheit !== '€' && (
            <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>
              {kategorie.einheit}
            </span>
          )}
        </div>

        {loading ? (
          <div style={{ fontSize: 12, color: 'var(--ink-faint)', padding: '8px 0' }}>Lade…</div>
        ) : daten.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--ink-faint)', padding: '8px 0' }}>Noch keine Einträge</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {daten.map((m, i) => (
              <div key={m.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 12, color: i === 0 ? 'var(--ink)' : 'var(--ink-soft)', fontWeight: i === 0 ? 500 : 400 }}>
                    {m.spitzname || m.name}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                    {kategorie.einheit === '€' ? `${Number(m.gesamt).toFixed(2)} €` : m.gesamt}
                  </span>
                </div>
                <div style={{ height: 3, background: 'var(--paper-mid)', borderRadius: 2, overflow: 'hidden' }}>
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

        <div style={{ marginTop: 14, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>
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

  // Lookup: Spitzname oder Name → id
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
        <div className="hero-overlay">
          <img src="/logo2.png" alt="Logo" className="hero-logo" />
          <h1 className="hero-name">KC Pegelbrüder</h1>
          <p className="hero-sub">Est. 2025 · Haus Niederrhein</p>
        </div>
      </div>

      <div className="page">

        {/* ── Ämter ────────────────────────────────────────── */}
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
                fontSize: 18, padding: '0 4px', lineHeight: 1,
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
                fontSize: 18, padding: '0 4px', lineHeight: 1,
              }}
            >→</button>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 1,
          background: 'var(--paper-mid)',
          border: '1px solid var(--paper-mid)',
          marginBottom: 56,
        }}>
          {saison.aemter.map((amt) => (
            <div key={amt.titel} style={{ background: 'var(--paper)', padding: '28px 28px 24px' }}>
              <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 10 }}>
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
                            onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                            onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>
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

        {/* ── Statistik-Vorschau ────────────────────────────── */}
        {vorschauKategorien.length > 0 && (
          <>
            <div className="section-header">
              <h2 className="section-title">Statistiken</h2>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16,
              marginBottom: 32,
            }}>
              {vorschauKategorien.map(kat => (
                <MiniStatKarte key={kat.id} kategorie={kat} />
              ))}
            </div>

            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <Link to="/rangliste" className="btn btn-primary" style={{ fontSize: 12, letterSpacing: '0.1em' }}>
                Alle Statistiken ansehen →
              </Link>
            </div>
          </>
        )}

      </div>
    </>
  )
}

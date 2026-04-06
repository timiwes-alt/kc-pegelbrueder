import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getMitglieder, getAnwesenheitDaten, getKoenigRangliste } from '../lib/supabase'
import { SAISONS } from '../data/saisons'

// Spitzname → [{titel, emoji}] für die aktuelle Saison
const amtMap = {}
for (const amt of SAISONS[0].aemter) {
  for (const name of amt.namen) {
    const key = name.toLowerCase()
    if (!amtMap[key]) amtMap[key] = []
    amtMap[key].push({ titel: amt.titel, emoji: amt.emoji })
  }
}

export default function MitgliederListe() {
  const [mitglieder, setMitglieder] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function laden() {
      const [alle, anwesenheit, koenig] = await Promise.all([
        getMitglieder(),
        getAnwesenheitDaten(),
        getKoenigRangliste(),
      ])
      setMitglieder(alle.filter(m => !m.ist_gast))

      const koenigMap = Object.fromEntries(koenig.map(m => [m.id, m.gesamt]))
      const abende = anwesenheit?.abende ?? []
      const teilnahmen = anwesenheit?.teilnahmen ?? new Set()
      const anwesenheitMap = {}
      for (const a of abende) {
        for (const m of (anwesenheit?.mitglieder ?? [])) {
          if (teilnahmen.has(`${m.id}:${a.id}`)) {
            anwesenheitMap[m.id] = (anwesenheitMap[m.id] || 0) + 1
          }
        }
      }
      const combined = {}
      for (const m of alle) {
        combined[m.id] = {
          abende: anwesenheitMap[m.id] ?? 0,
          koenig: koenigMap[m.id] ?? 0,
        }
      }
      setStats(combined)
      setLoading(false)
    }
    laden()
  }, [])

  document.title = 'Mitglieder'

  return (
    <div className="page">
      <div className="section-header" style={{ marginTop: 40 }}>
        <h2 className="section-title">Mitglieder</h2>
      </div>

      {loading ? (
        <div className="empty"><p style={{ color: 'var(--ink-faint)' }}>Lade…</p></div>
      ) : (
        <div style={{
          background: 'var(--paper)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 80px 72px',
            padding: '10px 22px', borderBottom: '1px solid var(--paper-subtle)',
          }}>
            {['Name', 'Amt', 'Abende', 'König'].map(label => (
              <span key={label} style={{
                fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
                color: 'var(--ink-faint)', textAlign: label === 'Name' || label === 'Amt' ? 'left' : 'right',
              }}>{label}</span>
            ))}
          </div>

          {mitglieder.map((m, i) => {
            const s = stats[m.id] ?? {}
            const aemter = amtMap[(m.spitzname || m.name).toLowerCase()] ?? []
            return (
              <Link key={m.id} to={`/mitglied/${m.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr 80px 72px',
                  alignItems: 'center',
                  padding: '13px 22px',
                  borderBottom: i < mitglieder.length - 1 ? '1px solid var(--paper-subtle)' : 'none',
                  transition: 'background 0.12s',
                  animation: `fadeUp 0.4s cubic-bezier(0.4,0,0.2,1) ${i * 0.03 + 0.05}s both`,
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--paper-subtle)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div>
                    <span style={{ fontFamily: 'var(--serif)', fontSize: 17, color: 'var(--ink)' }}>
                      {m.spitzname || m.name}
                    </span>
                    {m.spitzname && (
                      <span style={{ fontSize: 12, color: 'var(--ink-faint)', marginLeft: 10 }}>{m.name}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {aemter.length > 0 ? aemter.map(a => (
                      <span key={a.titel} style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                        {a.emoji} {a.titel}
                      </span>
                    )) : (
                      <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>–</span>
                    )}
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--ink-muted)', textAlign: 'right' }}>{s.abende}</span>
                  <span style={{ fontSize: 13, color: 'var(--ink-muted)', textAlign: 'right' }}>
                    {s.koenig > 0 ? `${s.koenig}×` : '–'}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

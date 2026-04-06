import { useState, useEffect, useRef } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getKegelabend, getKategorien, getRanglisteKegelabend, getStatistikenKegelabend, getKegelabendFotos, uploadKegelabendFoto, deleteKegelabendFoto, getSitzordnung, saveSitzordnung, getMitglieder, getGaeste, getGastAnwesenheit, saveGastAnwesenheit, getAbendsRekorde, updateKegelabendEhrentitel, getAbendHighlightsDB, saveAbendHighlightsDB, getAlleHistorischenDaten } from '../lib/supabase'
import { generiereAbendHighlights } from '../lib/ai'
import { HighlightCard } from '../components/HighlightCards'

function formatDatum(iso) {
  return new Date(iso).toLocaleDateString('de-DE', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  })
}

function formatWert(wert, einheit) {
  if (einheit === '€') return `${Number(wert).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} €`
  return `${wert} ${einheit}`
}

function AdminBereich({ children }) {
  return (
    <div style={{ outline: '1.5px dashed rgba(210,30,30,0.38)', outlineOffset: 4, borderRadius: 8 }}>
      {children}
    </div>
  )
}

function BalkenChart({ daten, einheit }) {
  const max = daten.length > 0 ? daten[0].gesamt : 1
  const MEDALS = ['🥇', '🥈', '🥉']
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {daten.map((m, i) => {
        const pct = (m.gesamt / max) * 100
        const anzeigeName = m.spitzname || m.name
        const isFirst = i === 0
        return (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, animation: `fadeUp 0.45s cubic-bezier(0.4,0,0.2,1) ${i * 0.06}s both` }}>
            <div style={{ width: 26, flexShrink: 0, textAlign: 'center', lineHeight: 1, fontSize: i < 3 ? 15 : 11, color: 'var(--ink-faint)', fontFamily: 'var(--serif)' }}>
              {i < 3 ? MEDALS[i] : i + 1}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <Link to={`/mitglied/${m.id}`} style={{ fontFamily: 'var(--serif)', fontSize: isFirst ? 18 : 16, color: 'var(--ink)', textDecoration: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0, transition: 'opacity 0.15s' }}
                  onMouseEnter={e => e.target.style.opacity = '0.6'} onMouseLeave={e => e.target.style.opacity = '1'}>
                  {anzeigeName}
                </Link>
                <span style={{ fontFamily: 'var(--serif)', fontSize: isFirst ? 21 : 17, color: isFirst ? 'var(--ink)' : 'var(--ink-muted)', flexShrink: 0, paddingLeft: 16 }}>
                  {formatWert(m.gesamt, einheit)}
                </span>
              </div>
              <div style={{ height: isFirst ? 7 : 5, background: 'var(--paper-subtle)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: isFirst ? 'linear-gradient(to right, #1d1d1f 0%, #6e6e73 100%)' : 'linear-gradient(to right, #6e6e73 0%, #aeaeb2 100%)', opacity: Math.max(0.45, 1 - i * 0.08), animation: `barGrow 0.65s cubic-bezier(0.4,0,0.2,1) ${i * 0.06}s both` }} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// 9 Kegel im Diamant-Muster (von oben: Reihe 1-2-3-2-1)
const KEGEL_POS = [
  { cx: 50, cy: 8 },
  { cx: 34, cy: 22 }, { cx: 66, cy: 22 },
  { cx: 18, cy: 36 }, { cx: 50, cy: 36 }, { cx: 82, cy: 36 },
  { cx: 34, cy: 50 }, { cx: 66, cy: 50 },
  { cx: 50, cy: 64 },
]

function SitzSeat({ person, nameTop }) {
  const anzeigeName = person ? (person.spitzname || person.name) : null
  const initialen = anzeigeName ? anzeigeName.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2) : null
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '6px 2px', minWidth: 0 }}>
      {nameTop && (
        <span style={{ fontSize: 10, color: anzeigeName ? 'var(--ink-muted)' : 'transparent', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: '100%', textOverflow: 'ellipsis', lineHeight: 1.3 }}>
          {anzeigeName || '–'}
        </span>
      )}
      <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: person ? 'var(--ink)' : 'transparent', border: person ? 'none' : '1.5px dashed #ccc5bb', color: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--serif)', fontSize: 12, letterSpacing: '0.02em' }}>
        {initialen}
      </div>
      {!nameTop && (
        <span style={{ fontSize: 10, color: anzeigeName ? 'var(--ink-muted)' : 'transparent', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: '100%', textOverflow: 'ellipsis', lineHeight: 1.3 }}>
          {anzeigeName || '–'}
        </span>
      )}
    </div>
  )
}

function SitzordnungVisual({ seiteA, seiteB }) {
  const SLOTS = 7
  const bahnSVG = (
    <svg viewBox="0 0 380 160" style={{ width: '100%', height: '100%', display: 'block' }}>
      <defs>
        <linearGradient id="sz-holz" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#e2ddd4" />
          <stop offset="100%" stopColor="#d6d0c6" />
        </linearGradient>
        <linearGradient id="sz-kegelfeld" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#eae6de" />
          <stop offset="100%" stopColor="#dedad2" />
        </linearGradient>
      </defs>
      <rect width={380} height={160} fill="#edeae4" />
      <rect x={0} y={14} width={80} height={132} fill="url(#sz-kegelfeld)" />
      {[14, 28, 42, 56, 70].map(x => (
        <line key={x} x1={x} y1={14} x2={x} y2={146} stroke="rgba(0,0,0,0.05)" strokeWidth={1} />
      ))}
      <polygon points="80,14 180,60 180,100 80,146" fill="url(#sz-holz)" />
      {[100, 120, 140, 160].map(x => (
        <line key={x}
          x1={x} y1={14 + (x - 80) * 0.46}
          x2={x} y2={146 - (x - 80) * 0.46}
          stroke="rgba(0,0,0,0.04)" strokeWidth={1}
        />
      ))}
      <rect x={180} y={60} width={200} height={40} fill="url(#sz-holz)" />
      {[220, 260, 300, 340].map(x => (
        <line key={x} x1={x} y1={60} x2={x} y2={100} stroke="rgba(0,0,0,0.05)" strokeWidth={0.8} />
      ))}
      <line x1={180} y1={80} x2={380} y2={80} stroke="rgba(0,0,0,0.08)" strokeWidth={0.8} strokeDasharray="6,4" />
      <circle cx={348} cy={112} r={5} fill="#d6d0c6" stroke="#c4baa8" strokeWidth={1} />
      <circle cx={360} cy={112} r={5} fill="#d6d0c6" stroke="#c4baa8" strokeWidth={1} />
      <circle cx={372} cy={112} r={5} fill="#d6d0c6" stroke="#c4baa8" strokeWidth={1} />
      <line x1={0} y1={14} x2={80} y2={14} stroke="#c4baa8" strokeWidth={1.5} />
      <line x1={0} y1={146} x2={80} y2={146} stroke="#c4baa8" strokeWidth={1.5} />
      <line x1={80} y1={14} x2={180} y2={60} stroke="#c4baa8" strokeWidth={1.2} />
      <line x1={80} y1={146} x2={180} y2={100} stroke="#c4baa8" strokeWidth={1.2} />
      <line x1={180} y1={60} x2={380} y2={60} stroke="#c4baa8" strokeWidth={1.2} />
      <line x1={180} y1={100} x2={380} y2={100} stroke="#c4baa8" strokeWidth={1.2} />
      {KEGEL_POS.map((p, i) => {
        const cx = (p.cx / 100) * 60 + 10
        const cy = (p.cy / 76) * 100 + 33
        return (
          <g key={i}>
            <circle cx={cx + 0.7} cy={cy + 0.7} r={5.5} fill="rgba(0,0,0,0.12)" />
            <circle cx={cx} cy={cy} r={5.5} fill="white" stroke="rgba(0,0,0,0.1)" strokeWidth={0.7} />
            <circle cx={cx - 1.5} cy={cy - 1.5} r={1.6} fill="rgba(255,255,255,0.85)" />
          </g>
        )
      })}
    </svg>
  )

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'inline-flex', minWidth: 800, border: '1.5px solid #d4ccc0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', gap: 20, background: '#edeae4' }}>
        <div style={{ width: 380, flexShrink: 0, background: '#edeae4' }}>
          {bahnSVG}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: '#edeae4' }}>
            <div style={{ display: 'flex', flex: 1 }}>
              {Array.from({ length: SLOTS }, (_, i) => (
                <SitzSeat key={i} person={seiteA.find(s => s.position === i) || null} nameTop={true} />
              ))}
            </div>
            <span style={{ fontSize: 9, color: 'var(--ink-faint)', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '0 10px', whiteSpace: 'nowrap' }}>Türseite</span>
          </div>
          <div style={{ height: 40, background: 'linear-gradient(to bottom, #e2d8c8, #d6ccba)', borderTop: '1px solid #cec4b0', borderBottom: '1px solid #cec4b0', boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.06)' }} />
          <div style={{ display: 'flex', alignItems: 'center', background: '#edeae4' }}>
            <div style={{ display: 'flex', flex: 1 }}>
              {Array.from({ length: SLOTS }, (_, i) => (
                <SitzSeat key={i} person={seiteB.find(s => s.position === i) || null} nameTop={false} />
              ))}
            </div>
            <span style={{ fontSize: 9, color: 'var(--ink-faint)', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '0 10px', whiteSpace: 'nowrap' }}>Wandseite</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function GaesteSektion({ kegelabendId, isAdmin }) {
  const [gaeste, setGaeste] = useState([])
  const [anwesend, setAnwesend] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [entwurf, setEntwurf] = useState(new Set())
  const [saving, setSaving] = useState(false)
  const [fehler, setFehler] = useState(null)

  useEffect(() => {
    Promise.all([getGaeste(), getGastAnwesenheit(kegelabendId)])
      .then(([g, a]) => { setGaeste(g); setAnwesend(a) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [kegelabendId])

  function handleBearbeiten() {
    setEntwurf(new Set(anwesend))
    setEditing(true)
  }

  async function handleSpeichern() {
    setSaving(true); setFehler(null)
    try {
      await saveGastAnwesenheit(kegelabendId, [...entwurf])
      setAnwesend(new Set(entwurf))
      setEditing(false)
    } catch (err) {
      setFehler(`Speichern fehlgeschlagen: ${err?.message || err}`)
    } finally {
      setSaving(false)
    }
  }

  function toggleGast(id) {
    setEntwurf(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (loading || (gaeste.length === 0 && !isAdmin)) return null

  const anwesendeListe = gaeste.filter(g => anwesend.has(g.id))

  return (
    <div style={{ marginTop: 56 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid var(--paper-subtle)' }}>
        <span style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)' }}>Gäste</span>
        {isAdmin && !editing && (
          <AdminBereich>
            <button className="btn btn-primary btn-sm" onClick={handleBearbeiten}>
              {anwesend.size > 0 ? 'Bearbeiten' : '+ Eintragen'}
            </button>
          </AdminBereich>
        )}
      </div>
      {fehler && <div className="alert alert-error" style={{ marginBottom: 16 }}>{fehler}</div>}
      {editing ? (
        <div style={{ background: 'var(--paper)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', padding: '24px' }}>
          {gaeste.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--ink-faint)' }}>Noch keine Gäste angelegt. Füge sie unter <Link to="/mitglieder" style={{ color: 'var(--ink)' }}>Mitglieder</Link> hinzu.</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {gaeste.map(g => {
                const aktiv = entwurf.has(g.id)
                return (
                  <button
                    key={g.id}
                    onClick={() => toggleGast(g.id)}
                    style={{
                      fontSize: 13, padding: '7px 16px', borderRadius: 980, cursor: 'pointer',
                      border: aktiv ? 'none' : '1.5px solid var(--paper-subtle)',
                      background: aktiv ? 'var(--ink)' : 'var(--paper)',
                      color: aktiv ? 'var(--paper)' : 'var(--ink-muted)',
                      transition: 'background 0.15s, color 0.15s',
                    }}
                  >
                    {g.spitzname || g.name}
                  </button>
                )
              })}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={handleSpeichern} disabled={saving}>{saving ? 'Speichert…' : 'Speichern'}</button>
            <button className="btn btn-sm" onClick={() => setEditing(false)} disabled={saving}>Abbrechen</button>
          </div>
        </div>
      ) : anwesendeListe.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--ink-faint)', padding: '12px 0' }}>
          {isAdmin ? 'Keine Gäste eingetragen.' : 'Keine Gäste bei diesem Abend.'}
        </p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {anwesendeListe.map(g => (
            <span key={g.id} style={{
              fontSize: 13, padding: '7px 16px', borderRadius: 980,
              background: 'var(--paper)', boxShadow: 'var(--shadow-xs)',
              border: '1px solid var(--paper-subtle)', color: 'var(--ink-soft)',
            }}>
              {g.spitzname || g.name}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function SitzordnungSektion({ kegelabendId, isAdmin }) {
  const [sitzordnung, setSitzordnung] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fehler, setFehler] = useState(null)
  const [editing, setEditing] = useState(false)
  const [mitglieder, setMitglieder] = useState([])
  const [entwurf, setEntwurf] = useState({})

  useEffect(() => {
    getSitzordnung(kegelabendId).then(d => { setSitzordnung(d); setLoading(false) }).catch(() => setLoading(false))
  }, [kegelabendId])

  async function handleBearbeiten() {
    let liste = mitglieder
    if (!liste.length) {
      const alle = await getMitglieder()
      liste = alle.filter(m => !m.ist_gast)
      setMitglieder(liste)
    }
    const initial = {}
    for (let i = 0; i < 7; i++) {
      const a = (sitzordnung?.sitzplaetze || []).find(s => s.seite === 'A' && s.position === i)
      const b = (sitzordnung?.sitzplaetze || []).find(s => s.seite === 'B' && s.position === i)
      initial[`A-${i}`] = a?.mitglied_id || ''
      initial[`B-${i}`] = b?.mitglied_id || ''
    }
    setEntwurf(initial)
    setEditing(true)
  }

  async function handleSpeichern() {
    setSaving(true); setFehler(null)
    try {
      const sitzplaetze = []
      for (let i = 0; i < 7; i++) {
        for (const seite of ['A', 'B']) {
          const mid = entwurf[`${seite}-${i}`]
          if (mid) {
            const m = mitglieder.find(x => x.id === mid)
            if (m) sitzplaetze.push({ position: i, seite, mitglied_id: m.id, name: m.name, spitzname: m.spitzname })
          }
        }
      }
      const saved = await saveSitzordnung(kegelabendId, sitzplaetze)
      setSitzordnung(saved)
      setEditing(false)
    } catch (err) {
      setFehler(`Speichern fehlgeschlagen: ${err?.message || err}`)
    } finally {
      setSaving(false)
    }
  }

  const seiteA = (sitzordnung?.sitzplaetze || []).filter(s => s.seite === 'A')
  const seiteB = (sitzordnung?.sitzplaetze || []).filter(s => s.seite === 'B')

  return (
    <div style={{ marginTop: 56 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid var(--paper-subtle)' }}>
        <span style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)' }}>Sitzordnung</span>
        {isAdmin && !editing && (
          <AdminBereich>
            <button className="btn btn-primary btn-sm" onClick={handleBearbeiten}>
              {sitzordnung ? 'Bearbeiten' : '+ Eintragen'}
            </button>
          </AdminBereich>
        )}
      </div>
      {fehler && <div className="alert alert-error" style={{ marginBottom: 16 }}>{fehler}</div>}
      {loading ? (
        <p style={{ fontSize: 13, color: 'var(--ink-faint)' }}>Lade…</p>
      ) : editing ? (
        <div style={{ background: 'var(--paper)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', padding: '24px' }}>
          {['A', 'B'].map((seite, si) => (
            <div key={seite}>
              {si === 1 && <div style={{ height: 20, background: 'linear-gradient(to bottom, #e2d8c8, #d6ccba)', borderRadius: 3, border: '1px solid #cec4b0', margin: '8px 0' }} />}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {Array.from({ length: 7 }, (_, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: '1 1 80px', minWidth: 72 }}>
                    <span style={{ fontSize: 9, color: 'var(--ink-faint)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{seite}{i + 1}</span>
                    <select value={entwurf[`${seite}-${i}`] || ''} onChange={e => setEntwurf(prev => ({ ...prev, [`${seite}-${i}`]: e.target.value }))}
                      style={{ fontSize: 12, padding: '5px 6px', border: '1px solid var(--paper-subtle)', borderRadius: 6, background: 'var(--paper)', color: 'var(--ink)', cursor: 'pointer' }}>
                      <option value="">— leer —</option>
                      {mitglieder.map(m => <option key={m.id} value={m.id}>{m.spitzname || m.name}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            <button className="btn btn-primary btn-sm" onClick={handleSpeichern} disabled={saving}>{saving ? 'Speichert…' : 'Speichern'}</button>
            <button className="btn btn-sm" onClick={() => setEditing(false)} disabled={saving}>Abbrechen</button>
          </div>
        </div>
      ) : !sitzordnung ? (
        <p style={{ fontSize: 13, color: 'var(--ink-faint)', padding: '12px 0' }}>
          {isAdmin ? 'Noch keine Sitzordnung eingetragen.' : 'Noch keine Sitzordnung für diesen Abend.'}
        </p>
      ) : (
        <div style={{ background: 'var(--paper)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', padding: '24px' }}>
          <SitzordnungVisual seiteA={seiteA} seiteB={seiteB} />
        </div>
      )}
    </div>
  )
}

function HighlightsSektion({ kegelabendId, datum, isAdmin, kategorien }) {
  const [highlights, setHighlights] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [fehler, setFehler] = useState(null)

  useEffect(() => {
    getAbendHighlightsDB(kegelabendId)
      .then(h => { setHighlights(h ? h.map((item, i) => ({ sichtbar: i < 3, ...item })) : h); setLoading(false) })
      .catch(() => setLoading(false))
  }, [kegelabendId])

  async function handleGenerieren() {
    setGenerating(true); setFehler(null)
    try {
      const [statistiken, historischeDaten] = await Promise.all([
        getStatistikenKegelabend(kegelabendId),
        getAlleHistorischenDaten(datum),
      ])
      const h = await generiereAbendHighlights(kegelabendId, datum, statistiken, historischeDaten, kategorien)
      await saveAbendHighlightsDB(kegelabendId, h)
      setHighlights(h)
    } catch (err) {
      setFehler(`Fehler: ${err.message}`)
    } finally {
      setGenerating(false)
    }
  }

  async function toggleSichtbar(idx) {
    const updated = highlights.map((h, i) => i === idx ? { ...h, sichtbar: h.sichtbar === false } : h)
    setHighlights(updated)
    try { await saveAbendHighlightsDB(kegelabendId, updated) } catch (err) { console.error('toggleSichtbar:', err) }
  }

  if (loading) return null
  if (!highlights && !isAdmin) return null

  const sichtbareHighlights = isAdmin ? highlights : highlights?.filter(h => h.sichtbar !== false)

  return (
    <div style={{ marginTop: 56 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid var(--paper-subtle)' }}>
        <span style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)' }}>Highlights</span>
        {isAdmin && (
          <AdminBereich>
            <button className="btn btn-primary btn-sm" onClick={handleGenerieren} disabled={generating}>
              {generating ? 'Generiert…' : highlights ? 'Neu generieren' : '+ Generieren'}
            </button>
          </AdminBereich>
        )}
      </div>
      {fehler && <div className="alert alert-error" style={{ marginBottom: 16 }}>{fehler}</div>}
      {generating && <p style={{ fontSize: 13, color: 'var(--ink-faint)' }}>Highlights werden generiert…</p>}
      {sichtbareHighlights && !generating && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {sichtbareHighlights.map((h, i) => {
            const hidden = h.sichtbar === false
            return (
              <div key={i} style={{ position: 'relative', background: 'var(--paper)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', padding: '20px 22px', animation: `fadeUp 0.45s cubic-bezier(0.4,0,0.2,1) ${i * 0.04}s both`, opacity: hidden ? 0.45 : 1, transition: 'opacity 0.2s', ...(hidden ? { outline: '1.5px dashed rgba(210,30,30,0.38)', outlineOffset: 4 } : {}) }}>
                <HighlightCard item={h} bisDatum={datum} />
                {isAdmin && (
                  <div style={{ position: 'absolute', top: 8, right: 8, outline: '1.5px dashed rgba(210,30,30,0.38)', outlineOffset: 4, borderRadius: 8 }}>
                    <button
                      onClick={() => toggleSichtbar(highlights.indexOf(h))}
                      title={hidden ? 'Sichtbar schalten' : 'Verstecken'}
                      style={{ display: 'block', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, opacity: 0.5, padding: 2, lineHeight: 1 }}
                    >
                      {hidden ? '🙈' : '👁️'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      {!highlights && !generating && isAdmin && (
        <p style={{ fontSize: 13, color: 'var(--ink-faint)', padding: '12px 0' }}>Noch keine Highlights für diesen Abend. Klicke auf „+ Generieren".</p>
      )}
    </div>
  )
}

export default function KegelabendDetail() {
  const { isAdmin } = useAuth()
  const { kegelabendId } = useParams()
  const navigate = useNavigate()
  const [abend, setAbend] = useState(null)
  const [kategorien, setKategorien] = useState([])
  const [ranglistenDaten, setRanglistenDaten] = useState({})
  const [fotos, setFotos] = useState([])
  const [uploadLoading, setUploadLoading] = useState(false)
  const [fotoFehler, setFotoFehler] = useState(null)
  const [loading, setLoading] = useState(true)
  const [abendRekorde, setAbendRekorde] = useState([])
  const [editingEhre, setEditingEhre] = useState(null)
  const [ehreEntwurf, setEhreEntwurf] = useState('')
  const [ehreSaving, setEhreSaving] = useState(false)
  const [alleMitglieder, setAlleMitglieder] = useState([])
  const fotoInputRef = useRef(null)

  useEffect(() => {
    async function laden() {
      try {
        const [a, kats, eintraege, fotos, rekorde, mitgliederListe] = await Promise.all([
          getKegelabend(kegelabendId), getKategorien(),
          getStatistikenKegelabend(kegelabendId), getKegelabendFotos(kegelabendId),
          getAbendsRekorde(kegelabendId), getMitglieder(),
        ])
        setAlleMitglieder(mitgliederListe.filter(m => !m.ist_gast))
        setAbendRekorde(rekorde)
        setFotos(fotos); setAbend(a)
        const kategorieIds = [...new Set(eintraege.map(e => e.statistik_kategorien.id))]
        const relevanteKats = kats.filter(k => kategorieIds.includes(k.id))
        setKategorien(relevanteKats)
        const ranglisten = {}
        await Promise.all(relevanteKats.map(async k => { ranglisten[k.id] = await getRanglisteKegelabend(kegelabendId, k.id) }))
        setRanglistenDaten(ranglisten)
      } finally { setLoading(false) }
    }
    laden()
  }, [kegelabendId])

  async function handleFotoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadLoading(true); setFotoFehler(null)
    try {
      const foto = await uploadKegelabendFoto(kegelabendId, file)
      setFotos(prev => [...prev, { ...foto, name: foto.path.split('/').pop() }])
    } catch { setFotoFehler('Upload fehlgeschlagen.') }
    finally { setUploadLoading(false); if (fotoInputRef.current) fotoInputRef.current.value = '' }
  }

  async function handleFotoDelete(foto) {
    if (!confirm('Foto wirklich löschen?')) return
    try { await deleteKegelabendFoto(foto.path); setFotos(prev => prev.filter(f => f.path !== foto.path)) }
    catch { setFotoFehler('Löschen fehlgeschlagen.') }
  }

  async function saveEhre(field) {
    setEhreSaving(true)
    try {
      const wert = ehreEntwurf || null
      await updateKegelabendEhrentitel(kegelabendId, { [field]: wert })
      setAbend(prev => ({ ...prev, [field]: wert }))
      setEditingEhre(null)
    } catch (err) {
      console.error('saveEhre Fehler:', err)
      alert(`Fehler beim Speichern: ${err.message}`)
    } finally { setEhreSaving(false) }
  }

  if (loading) return <div className="page"><div className="empty"><p style={{ color: 'var(--ink-faint)' }}>Lade…</p></div></div>
  if (!abend) return <div className="page"><div className="empty"><p className="empty-title">Nicht gefunden</p></div></div>

  const allePersonenIds = new Set()
  const strafenProPerson = {}
  for (const kat of kategorien) {
    for (const m of ranglistenDaten[kat.id] || []) {
      allePersonenIds.add(m.id)
      if (kat.einheit === '€') {
        if (!strafenProPerson[m.id]) strafenProPerson[m.id] = { ...m, gesamt: 0 }
        strafenProPerson[m.id].gesamt += m.gesamt
      }
    }
  }
  const strafenGesamt = Object.values(strafenProPerson).reduce((s, m) => s + m.gesamt, 0)

  return (
    <div className="page">
      <div style={{ marginTop: 40 }}>
        <button onClick={() => navigate(-1)} style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-faint)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>← Zurück</button>
      </div>

      <div className="section-header">
        <h2 className="section-title">{formatDatum(abend.datum)}</h2>
      </div>

      {abendRekorde.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 32 }}>
          {abendRekorde.map((r, i) => (
            <span key={i}
              onClick={r.mitglied_id ? () => navigate(`/mitglied/${r.mitglied_id}`) : undefined}
              style={{
                fontSize: 12, letterSpacing: '0.05em',
                background: 'var(--paper)', boxShadow: 'var(--shadow-xs)',
                border: '1px solid var(--paper-subtle)',
                padding: '3px 12px', borderRadius: 980,
                color: 'var(--ink-soft)',
                display: 'inline-flex', alignItems: 'center', gap: 5,
                cursor: r.mitglied_id ? 'pointer' : 'default',
                transition: 'box-shadow 0.15s',
              }}
              onMouseEnter={r.mitglied_id ? e => e.currentTarget.style.boxShadow = 'var(--shadow-sm)' : undefined}
              onMouseLeave={r.mitglied_id ? e => e.currentTarget.style.boxShadow = 'var(--shadow-xs)' : undefined}
            >
              <span>{r.emoji}</span>{r.label}
            </span>
          ))}
        </div>
      )}

      {allePersonenIds.size > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10, marginBottom: 40 }}>
          {[
            { label: 'Teilnehmer', wert: allePersonenIds.size },
            ...(strafenGesamt > 0 ? [
              { label: 'Gesamtstrafen', wert: `${Number(strafenGesamt).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} €` },
              { label: 'Ø pro Mitglied', wert: `${Number(strafenGesamt / Object.keys(strafenProPerson).length).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} €` },
            ] : []),
          ].map((tile, i) => (
            <div key={tile.label} style={{ background: 'var(--paper)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', padding: '20px 22px', animation: `fadeUp 0.5s cubic-bezier(0.4,0,0.2,1) ${i * 0.07 + 0.05}s both`, transition: 'box-shadow 0.2s, transform 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.transform = 'translateY(0)' }}>
              <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 8 }}>{tile.label}</div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 28, color: 'var(--ink)' }}>{tile.wert}</div>
            </div>
          ))}

          {[
            { label: 'Pudelkönig', field: 'pudelkoenig_id', leer: 'Nicht dokumentiert' },
            { label: 'König', field: 'koenig_id', leer: 'Nicht ausgespielt' },
          ].map((tile, i) => {
            const isEditing = editingEhre === tile.field
            const mitgliedId = abend[tile.field]
            const mitglied = alleMitglieder.find(m => m.id === mitgliedId)
            const anzeigeName = mitglied ? (mitglied.spitzname || mitglied.name) : null
            return (
              <div key={tile.field} style={{ background: 'var(--paper)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', padding: '20px 22px', animation: `fadeUp 0.5s cubic-bezier(0.4,0,0.2,1) ${i * 0.07 + 0.19}s both`, transition: 'box-shadow 0.2s, transform 0.2s', cursor: isAdmin && !isEditing ? 'pointer' : 'default' }}
                onClick={() => { if (isAdmin && !isEditing) { setEhreEntwurf(mitgliedId || ''); setEditingEhre(tile.field) } }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.transform = 'translateY(0)' }}>
                <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 8 }}>{tile.label}</div>
                {isEditing ? (
                  <div onClick={e => e.stopPropagation()}>
                    <select
                      autoFocus
                      value={ehreEntwurf}
                      onChange={e => setEhreEntwurf(e.target.value)}
                      style={{ width: '100%', fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--ink)', background: 'var(--paper)', border: 'none', borderBottom: '1px solid var(--paper-mid)', outline: 'none', padding: '4px 0', boxSizing: 'border-box', cursor: 'pointer' }}
                    >
                      <option value="">— {tile.leer} —</option>
                      {alleMitglieder.map(m => (
                        <option key={m.id} value={m.id}>{m.spitzname || m.name}</option>
                      ))}
                    </select>
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <button onClick={() => saveEhre(tile.field)} disabled={ehreSaving} style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', background: 'var(--ink)', color: 'var(--paper)', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer' }}>
                        {ehreSaving ? '…' : 'Speichern'}
                      </button>
                      <button onClick={() => setEditingEhre(null)} style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', background: 'none', color: 'var(--ink-faint)', border: 'none', cursor: 'pointer' }}>Abbrechen</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontFamily: 'var(--serif)', fontSize: anzeigeName ? 28 : 16, color: anzeigeName ? 'var(--ink)' : 'var(--ink-faint)', fontStyle: anzeigeName ? 'normal' : 'italic' }}>
                    {anzeigeName
                      ? <Link to={`/mitglied/${mitglied.id}`} onClick={e => e.stopPropagation()} style={{ color: 'inherit', textDecoration: 'none' }}
                          onMouseEnter={e => e.currentTarget.style.opacity = '0.6'}
                          onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                          {anzeigeName}
                        </Link>
                      : tile.leer}
                    {isAdmin && <span style={{ fontSize: 10, color: 'rgba(210,30,30,0.5)', marginLeft: 6 }}>✎</span>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <SitzordnungSektion kegelabendId={kegelabendId} isAdmin={isAdmin} />

      <HighlightsSektion kegelabendId={kegelabendId} datum={abend.datum} isAdmin={isAdmin} kategorien={kategorien} />

      {kategorien.length === 0 ? (
        <div className="empty">
          <p className="empty-title">Noch keine Einträge</p>
          <p style={{ fontSize: 14 }}>Trag unter <Link to="/eintragen" style={{ color: 'var(--ink)' }}>Eintragen</Link> Werte für diesen Abend ein.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {kategorien.map((kat, ki) => (
            <div key={kat.id} style={{ background: 'var(--paper)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', padding: '28px 32px 32px', animation: `fadeUp 0.5s cubic-bezier(0.4,0,0.2,1) ${ki * 0.08 + 0.15}s both`, transition: 'box-shadow 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid var(--paper-subtle)' }}>
                <Link to={`/rangliste/${kat.id}`} style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)', textDecoration: 'none' }}
                  onMouseEnter={e => e.target.style.opacity = '0.6'} onMouseLeave={e => e.target.style.opacity = '1'}>{kat.name}</Link>
              </div>
              {ranglistenDaten[kat.id]?.length > 0 ? <BalkenChart daten={ranglistenDaten[kat.id]} einheit={kat.einheit} /> : <p style={{ fontSize: 14, color: 'var(--ink-faint)' }}>Keine Daten</p>}
            </div>
          ))}
        </div>
      )}

      <GaesteSektion kegelabendId={kegelabendId} isAdmin={isAdmin} />

      {/* Fotos */}
      <div style={{ marginTop: 56 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid var(--paper-subtle)' }}>
          <span style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)' }}>Fotos</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {uploadLoading && <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>Lädt hoch…</span>}
            {isAdmin && (
              <AdminBereich>
                <input ref={fotoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFotoUpload} />
                <button className="btn btn-primary btn-sm" disabled={uploadLoading} onClick={() => fotoInputRef.current?.click()}>+ Foto</button>
              </AdminBereich>
            )}
          </div>
        </div>
        {fotoFehler && <div className="alert alert-error" style={{ marginBottom: 16 }}>{fotoFehler}</div>}
        {fotos.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--ink-faint)', padding: '12px 0' }}>Noch keine Fotos für diesen Abend.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
            {fotos.map(foto => (
              <div key={foto.path} style={{ position: 'relative', aspectRatio: '4/3', overflow: 'hidden', borderRadius: 'var(--radius-sm)', background: 'var(--paper-subtle)' }}
                onMouseEnter={e => e.currentTarget.querySelector('.foto-del')?.style.setProperty('opacity', '1')}
                onMouseLeave={e => e.currentTarget.querySelector('.foto-del')?.style.setProperty('opacity', '0')}>
                <img src={foto.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                {isAdmin && <button className="foto-del" onClick={() => handleFotoDelete(foto)} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', borderRadius: 6, padding: '3px 10px', fontSize: 11, cursor: 'pointer', opacity: 0, transition: 'opacity 0.15s' }}>✕</button>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

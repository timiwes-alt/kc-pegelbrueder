import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getKategorien, getRangliste, getRanglisteDurchschnitt, getMitglieder, getAnwesenheitDaten, getAbendeVorschau, getStatistikenKegelabend, getAlleHistorischenDaten, getAbendHighlightsDB, saveAbendHighlightsDB, getPudelkoenigRangliste, getKoenigRangliste } from '../lib/supabase'
import { generiereAbendHighlights } from '../lib/ai'
import { HighlightCard } from '../components/HighlightCards'
import { useAuth } from '../contexts/AuthContext'
import { SAISONS } from '../data/saisons'


function MiniStatKarte({ kategorie, index = 0 }) {
  const [daten, setDaten] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fn = kategorie.einheit === '€' ? getRanglisteDurchschnitt : getRangliste
    fn(kategorie.id)
      .then(d => { setDaten(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [kategorie.id])

  const vorschau = daten.slice(0, 8)
  const max = vorschau.length > 0 ? vorschau[0].gesamt : 1

  return (
    <Link to={`/rangliste/${kategorie.id}`} style={{ textDecoration: 'none', display: 'block', borderRadius: 'var(--radius)', height: '100%' }}>
      <div style={{
        background: 'var(--paper)',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow-sm)',
        padding: '24px 26px 22px',
        cursor: 'pointer',
        transition: 'box-shadow 0.2s, transform 0.2s',
        animation: `fadeUp 0.5s cubic-bezier(0.4,0,0.2,1) ${index * 0.09 + 0.2}s both`,
        height: '100%', boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column',
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
          <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginTop: 4, marginLeft: 24 }}>
            {kategorie.einheit !== '€' ? kategorie.einheit : `Top ${vorschau.length}`}
          </span>
        </div>

        {loading ? (
          <div style={{ fontSize: 12, color: 'var(--ink-faint)', padding: '8px 0' }}>Lade…</div>
        ) : vorschau.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--ink-faint)', padding: '8px 0' }}>Noch keine Einträge</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {vorschau.map((m, i) => (
              <div key={m.id} style={{ flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: i === 0 ? 'var(--ink)' : 'var(--ink-muted)', fontWeight: i === 0 ? 500 : 400 }}>
                    {m.spitzname || m.name}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--ink-muted)' }}>
                    {kategorie.einheit === '€' ? `${Number(m.gesamt).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}\u202f€/Abend` : m.gesamt}
                  </span>
                </div>
                <div style={{ height: i === 0 ? 4 : 3, background: 'var(--paper-subtle)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${(m.gesamt / max) * 100}%`,
                    borderRadius: 99,
                    background: i === 0
                      ? 'linear-gradient(to right, #1d1d1f 0%, #6e6e73 100%)'
                      : 'linear-gradient(to right, #6e6e73 0%, #aeaeb2 100%)',
                    opacity: Math.max(0.45, 1 - i * 0.1),
                    transformOrigin: 'left',
                    animation: `barGrow 0.55s cubic-bezier(0.4,0,0.2,1) ${i * 0.06}s both`,
                  }} />
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 'auto', paddingTop: 18, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>
          Vollständige Statistik →
        </div>
      </div>
    </Link>
  )
}

const CELL = 14
const GAP = 3
const LABEL_W = 72

function MiniHeatmapKarte({ index = 0 }) {
  const [daten, setDaten] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cardW, setCardW] = useState(300)
  const cardRef = useRef(null)

  useEffect(() => {
    getAnwesenheitDaten().then(d => { setDaten(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!cardRef.current) return
    const obs = new ResizeObserver(entries => setCardW(entries[0].contentRect.width))
    obs.observe(cardRef.current)
    return () => obs.disconnect()
  }, [loading])

  const abende = daten ? daten.abende.slice(-10) : []
  const mitglieder = daten ? daten.mitglieder : []
  const teilnahmen = daten ? daten.teilnahmen : new Set()
  const dynamicCell = abende.length > 0
    ? Math.min(20, Math.max(6, (cardW - LABEL_W - 8 - (abende.length - 1) * GAP) / abende.length))
    : CELL

  return (
    <Link to="/rangliste/anwesenheit" style={{ textDecoration: 'none' }}>
      <div ref={cardRef} style={{
        background: 'var(--paper)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)',
        padding: '24px 26px 22px', cursor: 'pointer',
        transition: 'box-shadow 0.2s, transform 0.2s',
        animation: `fadeUp 0.5s cubic-bezier(0.4,0,0.2,1) ${index * 0.09 + 0.2}s both`,
      }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.transform = 'translateY(0)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <span style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)', lineHeight: 1.2 }}>Anwesenheit</span>
          <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginTop: 4, marginLeft: 24 }}>
            Letzte {abende.length} Abende
          </span>
        </div>

        {loading ? (
          <div style={{ fontSize: 12, color: 'var(--ink-faint)', padding: '8px 0' }}>Lade…</div>
        ) : !daten || mitglieder.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--ink-faint)', padding: '8px 0' }}>Noch keine Einträge</div>
        ) : (
          <>
            {/* Datum-Header */}
            <div style={{ display: 'flex', paddingLeft: LABEL_W + 8, marginBottom: 6 }}>
              {abende.map(a => (
                <div key={a.id} style={{ width: dynamicCell + GAP, flexShrink: 0, textAlign: 'center' }}>
                  <span style={{ fontSize: 8, color: 'var(--ink-faint)', whiteSpace: 'nowrap', display: 'block', transform: 'rotate(-55deg)', transformOrigin: 'center bottom' }}>
                    {new Date(a.datum).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>

            {/* Zeilen */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: GAP + 2 }}>
              {mitglieder.map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{
                    width: LABEL_W, flexShrink: 0, fontSize: 12, color: 'var(--ink-muted)',
                    paddingRight: 8, textAlign: 'right',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {m.spitzname || m.name}
                  </span>
                  <div style={{ display: 'flex', gap: GAP }}>
                    {abende.map(a => {
                      const dabei = teilnahmen.has(`${m.id}:${a.id}`)
                      return (
                        <div key={a.id} style={{
                          width: dynamicCell, height: dynamicCell, flexShrink: 0, borderRadius: 3,
                          background: dabei ? 'var(--ink)' : 'var(--paper-subtle)',
                          opacity: dabei ? 1 : 0.4,
                        }} />
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div style={{ marginTop: 18, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>
          Vollständige Statistik →
        </div>
      </div>
    </Link>
  )
}

function MiniEhrentitelKarte({ typ, index = 0 }) {
  const [daten, setDaten] = useState([])
  const [loading, setLoading] = useState(true)
  const name = typ === 'pudelkoenig' ? 'Pudelkönig' : 'König'
  const to = `/rangliste/${typ}`

  useEffect(() => {
    const fn = typ === 'pudelkoenig' ? getPudelkoenigRangliste : getKoenigRangliste
    fn().then(d => { setDaten(d); setLoading(false) }).catch(() => setLoading(false))
  }, [typ])

  const vorschau = daten.slice(0, 8)

  return (
    <Link to={to} style={{ textDecoration: 'none', display: 'block', borderRadius: 'var(--radius)', height: '100%' }}>
      <div style={{
        background: 'var(--paper)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)',
        padding: '24px 26px 22px', cursor: 'pointer',
        transition: 'box-shadow 0.2s, transform 0.2s',
        animation: `fadeUp 0.5s cubic-bezier(0.4,0,0.2,1) ${index * 0.09 + 0.2}s both`,
        height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column',
      }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.transform = 'translateY(0)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <span style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)', lineHeight: 1.2 }}>{name}</span>
          <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginTop: 4, marginLeft: 24 }}>
            Top {vorschau.length}
          </span>
        </div>
        {loading ? (
          <div style={{ fontSize: 12, color: 'var(--ink-faint)', padding: '8px 0' }}>Lade…</div>
        ) : vorschau.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--ink-faint)', padding: '8px 0' }}>Noch keine Einträge</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {vorschau.map((m, i) => (
              <div key={m.id} style={{ flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: i === 0 ? 'var(--ink)' : 'var(--ink-muted)', fontWeight: i === 0 ? 500 : 400 }}>
                    {m.spitzname || m.name}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--ink-muted)' }}>{m.gesamt}×</span>
                </div>
                <div style={{ height: i === 0 ? 4 : 3, background: 'var(--paper-subtle)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${(m.gesamt / vorschau[0].gesamt) * 100}%`, borderRadius: 99,
                    background: i === 0 ? 'linear-gradient(to right, #1d1d1f 0%, #6e6e73 100%)' : 'linear-gradient(to right, #6e6e73 0%, #aeaeb2 100%)',
                    opacity: Math.max(0.45, 1 - i * 0.1),
                    transformOrigin: 'left',
                    animation: `barGrow 0.55s cubic-bezier(0.4,0,0.2,1) ${i * 0.06}s both`,
                  }} />
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: 'auto', paddingTop: 18, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>
          Vollständige Statistik →
        </div>
      </div>
    </Link>
  )
}

function AbendeVorschau() {
  const { isAdmin } = useAuth()
  const [daten, setDaten] = useState(null)
  const [loading, setLoading] = useState(true)
  const [highlights, setHighlights] = useState(null)
  const [highlightsLoading, setHighlightsLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getAbendeVorschau().then(d => { setDaten(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!daten?.letzterAbend) return
    setHighlightsLoading(true)
    const id = daten.letzterAbend.id

    getAbendHighlightsDB(id)
      .then(async cached => {
        if (cached) return cached
        const [statistiken, historischeDaten, kategorien] = await Promise.all([
          getStatistikenKegelabend(id),
          getAlleHistorischenDaten(daten.letzterAbend.datum),
          getKategorien(),
        ])
        const h = await generiereAbendHighlights(id, daten.letzterAbend.datum, statistiken, historischeDaten, kategorien)
        await saveAbendHighlightsDB(id, h)
        return h
      })
      .then(h => { setHighlights(h ? h.map((item, i) => ({ sichtbar: i < 3, ...item })) : h); setHighlightsLoading(false) })
      .catch(err => { console.error('Highlights Fehler:', err); setHighlightsLoading(false) })
  }, [daten])

  const moveHighlight = async (fromIdx, toIdx) => {
    if (toIdx < 0 || toIdx >= highlights.length) return
    const neu = [...highlights]
    const [item] = neu.splice(fromIdx, 1)
    neu.splice(toIdx, 0, item)
    setHighlights(neu)
    setSaving(true)
    try { await saveAbendHighlightsDB(daten.letzterAbend.id, neu) }
    finally { setSaving(false) }
  }

  const toggleSichtbar = async (idx) => {
    const updated = highlights.map((h, i) => i === idx ? { ...h, sichtbar: h.sichtbar === false } : h)
    setHighlights(updated)
    setSaving(true)
    try { await saveAbendHighlightsDB(daten.letzterAbend.id, updated) }
    finally { setSaving(false) }
  }

  if (loading || !daten) return null

  const { letzterAbend, naechsterAbend } = daten
  const today = new Date()
  const fmt = d => new Date(d).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const daysUntil = naechsterAbend
    ? Math.ceil((new Date(naechsterAbend.datum) - today) / (1000 * 60 * 60 * 24))
    : null

  const cardStyle = {
    background: 'var(--paper)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)',
    padding: '24px 26px', boxSizing: 'border-box', transition: 'box-shadow 0.2s, transform 0.2s',
  }

  const sichtbar = highlights ? (isAdmin ? highlights : highlights.filter(h => h.sichtbar !== false)) : null

  return (
    <div style={{ marginBottom: 64 }}>
      <div className="section-header">
        <h2 className="section-title">Abende</h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

        {letzterAbend && (isAdmin ? (
          <div style={cardStyle}>
            <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 10 }}>Letzter Abend</div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)', lineHeight: 1.3, marginBottom: 16 }}>{fmt(letzterAbend.datum)}</div>

            <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 10 }}>
              Highlights des Abends {saving && <span style={{ fontWeight: 400, letterSpacing: 0, textTransform: 'none' }}>· Speichern…</span>}
            </div>

            {highlightsLoading && <div style={{ fontSize: 12, color: 'var(--ink-faint)', fontStyle: 'italic', marginBottom: 12 }}>Generiere Highlights…</div>}

            {sichtbar && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
                {sichtbar.map((h, i) => {
                  const hidden = h.sichtbar === false
                  const prevVisible = i > 0 && sichtbar[i - 1].sichtbar !== false
                  const showSeparator = hidden && (i === 0 || prevVisible)
                  return (
                    <div key={i} style={hidden ? { outline: '1.5px dashed rgba(210,30,30,0.38)', outlineOffset: 4, borderRadius: 8 } : {}}>
                    {showSeparator && (
                      <div style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-faint)', margin: '10px 0 8px', borderTop: '1px solid var(--paper-subtle)', paddingTop: 10 }}>
                        Nur für Admins sichtbar
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{
                        flex: 1, paddingLeft: 12,
                        borderLeft: `2px solid ${hidden ? 'var(--paper-subtle)' : 'var(--paper-mid)'}`,
                        opacity: hidden ? 0.45 : 1,
                        transition: 'opacity 0.2s',
                      }}>
                        <span style={{ fontSize: 10, color: 'var(--ink-faint)', display: 'block', marginBottom: 4 }}>#{i + 1}</span>
                        <HighlightCard item={h} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0, outline: '1.5px dashed rgba(210,30,30,0.38)', outlineOffset: 3, borderRadius: 6 }}>
                        <button onClick={() => moveHighlight(i, i - 1)} disabled={i === 0 || saving}
                          style={{ background: 'none', border: 'none', cursor: i === 0 ? 'default' : 'pointer', color: i === 0 ? 'var(--paper-subtle)' : 'var(--ink-faint)', fontSize: 14, padding: '0 4px', lineHeight: 1.2 }}>↑</button>
                        <button onClick={() => toggleSichtbar(i)} disabled={saving} title={hidden ? 'Sichtbar schalten' : 'Verstecken'}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, padding: '1px 4px', lineHeight: 1.2, opacity: 0.6 }}>{hidden ? '🙈' : '👁️'}</button>
                        <button onClick={() => moveHighlight(i, i + 1)} disabled={i === sichtbar.length - 1 || saving}
                          style={{ background: 'none', border: 'none', cursor: i === sichtbar.length - 1 ? 'default' : 'pointer', color: i === sichtbar.length - 1 ? 'var(--paper-subtle)' : 'var(--ink-faint)', fontSize: 14, padding: '0 4px', lineHeight: 1.2 }}>↓</button>
                      </div>
                    </div>
                    </div>
                  )
                })}
              </div>
            )}

            <Link to={`/kegelabend/${letzterAbend.id}`} style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-faint)', textDecoration: 'none' }}>Details →</Link>
          </div>
        ) : (
          <Link to={`/kegelabend/${letzterAbend.id}`} style={{ textDecoration: 'none' }}>
            <div style={cardStyle}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 10 }}>Letzter Abend</div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)', lineHeight: 1.3, marginBottom: 8 }}>{fmt(letzterAbend.datum)}</div>
              <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 10 }}>Highlights des Abends</div>
              {highlightsLoading && <div style={{ fontSize: 12, color: 'var(--ink-faint)', fontStyle: 'italic', marginBottom: 16 }}>Generiere Highlights…</div>}
              {sichtbar && sichtbar.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                    {sichtbar.map((h, i) => (
                      <div key={i} style={{ paddingLeft: 12, borderLeft: '2px solid var(--paper-mid)' }}>
                        <HighlightCard item={h} />
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--ink-faint)', letterSpacing: '0.05em' }}>Generiert mit Gemini KI</div>
                </div>
              )}
              <div style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>Details →</div>
            </div>
          </Link>
        ))}

        <div style={cardStyle}>
          <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 10 }}>Nächster Abend</div>
          {naechsterAbend ? (
            <>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)', lineHeight: 1.3, marginBottom: 8 }}>{fmt(naechsterAbend.datum)}</div>
              <div style={{ fontSize: 13, color: 'var(--ink-muted)' }}>
                {daysUntil === 0 ? 'Heute!' : daysUntil === 1 ? 'Morgen' : `In ${daysUntil} Tagen`}
              </div>
            </>
          ) : (
            <div style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--ink-faint)' }}>Noch nicht geplant</div>
          )}
        </div>

      </div>
    </div>
  )
}

export default function Home() {
  const location = useLocation()
  const [saisonIndex, setSaisonIndex] = useState(location.state?.saisonIndex ?? 0)
  const [mitglieder, setMitglieder] = useState([])
  const [statAuswahl, setStatAuswahl] = useState([])

  useEffect(() => {
    getKategorien().then(k => {
      const pool = [
        ...k.map(kat => ({ type: 'stat', kategorie: kat })),
        { type: 'anwesenheit' },
        { type: 'pudelkoenig' },
        { type: 'koenig' },
      ]
      setStatAuswahl([...pool].sort(() => Math.random() - 0.5).slice(0, 3))
    }).catch(() => {})
    getMitglieder().then(m => setMitglieder(m)).catch(() => {})
  }, [])

  useEffect(() => {
    if (location.state?.scrollTo === 'aemter') {
      const el = document.getElementById('aemter')
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  const mitgliedByName = {}
  for (const m of mitglieder) {
    if (m.spitzname) mitgliedByName[m.spitzname.toLowerCase()] = m.id
    mitgliedByName[m.name.toLowerCase()] = m.id
  }

  const saison = SAISONS[saisonIndex]

  return (
    <>
      {/* Hero */}
      <div className="hero">
        <img src="/gruppenfoto.jpg" alt="KC Pegelbrüder Gruppenfoto" className="hero-img" />
        <div className="hero-overlay">
          <h1 className="hero-name">KC Pegelbrüder</h1>
          <p className="hero-sub">Est. 2025 · Haus Niederrhein</p>
        </div>
      </div>

      <div className="page" style={{ paddingTop: 0 }}>

        {/* ── Mitglieder ─────────────────────────────────────── */}
        {(() => {
          const amtMap = {}
          for (const amt of saison.aemter) {
            for (const name of amt.namen) {
              const key = name.toLowerCase()
              if (!amtMap[key]) amtMap[key] = []
              amtMap[key].push({ titel: amt.titel, emoji: amt.emoji })
            }
          }
          return (
            <>
              <div id="aemter" className="section-header">
                <h2 className="section-title">Mitglieder</h2>
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
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: 12,
                marginBottom: 64,
              }}>
                {mitglieder.filter(m => !m.ist_gast).map((m, ai) => {
                  const key = (m.spitzname || m.name).toLowerCase()
                  const aemter = amtMap[key] ?? []
                  return (
                    <Link key={`${saisonIndex}-${m.id}`} to={`/mitglied/${m.id}`} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
                      <div style={{
                        background: 'var(--paper)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)',
                        padding: '20px 22px 18px', height: '100%', boxSizing: 'border-box',
                        animation: `fadeUp 0.5s cubic-bezier(0.4,0,0.2,1) ${ai * 0.05 + 0.1}s both`,
                        transition: 'box-shadow 0.2s, transform 0.2s',
                      }}
                        onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                        onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.transform = 'translateY(0)' }}
                      >
                        <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)', lineHeight: 1.2, marginBottom: 6 }}>
                          {m.spitzname || m.name}
                        </div>
                        {m.spitzname && (
                          <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginBottom: 10 }}>{m.name}</div>
                        )}
                        {aemter.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', marginTop: 4 }}>
                            {aemter.map(a => {
                              const top = a.titel === 'Präsident' || a.titel === 'Vizepräsident'
                              return top ? (
                                <span key={a.titel} style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 5,
                                  border: '1px solid var(--ink-muted)', borderRadius: 99,
                                  padding: '3px 9px 3px 7px',
                                }}>
                                  <span style={{ fontSize: 12 }}>{a.emoji}</span>
                                  <span style={{
                                    fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
                                    color: 'var(--ink-muted)', fontWeight: 500,
                                  }}>{a.titel}</span>
                                </span>
                              ) : (
                                <span key={a.titel} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                  <span style={{ fontSize: 13 }}>{a.emoji}</span>
                                  <span style={{
                                    fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
                                    color: 'var(--ink-faint)',
                                  }}>{a.titel}</span>
                                </span>
                              )
                            })}
                          </div>
                        ) : (
                          <div style={{ fontSize: 11, color: 'var(--paper-mid)', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 4 }}>Kein Amt</div>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </>
          )
        })()}

        {/* ── Abende ────────────────────────────────────────── */}
        <AbendeVorschau />

        {/* ── Statistik-Vorschau ─────────────────────────────── */}
        {statAuswahl.length > 0 && (
          <>
            <div className="section-header">
              <h2 className="section-title">Statistiken</h2>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 12,
              marginBottom: 36,
              alignItems: 'stretch',
            }}>
              {statAuswahl.map((s, i) => {
                if (s.type === 'stat') return <MiniStatKarte key={s.kategorie.id} kategorie={s.kategorie} index={i} />
                if (s.type === 'anwesenheit') return <MiniHeatmapKarte key="anwesenheit" index={i} />
                if (s.type === 'pudelkoenig') return <MiniEhrentitelKarte key="pudelkoenig" typ="pudelkoenig" index={i} />
                if (s.type === 'koenig') return <MiniEhrentitelKarte key="koenig" typ="koenig" index={i} />
              })}
            </div>

            <div style={{ textAlign: 'center', marginBottom: 20, marginTop: 36 }}>
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

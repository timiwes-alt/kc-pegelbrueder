import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  getMitglieder, getKategorien, getAnwesenheitDaten,
  getKoenigRangliste, getPudelkoenigRangliste,
  getRangliste, getRanglisteDurchschnitt, getEintraegeProMitglied,
} from '../lib/supabase'

const AVG_ID = '__avg__'

export default function Vergleich() {
  const [searchParams] = useSearchParams()
  const [mitglieder, setMitglieder] = useState([])
  const [ausgewaehlt, setAusgewaehlt] = useState([])
  const [baseData, setBaseData] = useState(null)
  const [detailCache, setDetailCache] = useState({})
  const [filterKat, setFilterKat] = useState('alle')
  const [filterStats, setFilterStats] = useState({}) // { [sectionId]: Set<statLabel> }
  const [hiddenSections, setHiddenSections] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const loadingRef = useRef(new Set())

  // ── Basisdaten laden ─────────────────────────────────────────
  useEffect(() => {
    async function laden() {
      const [alle, kats, anwesenheit, koenig, pudel] = await Promise.all([
        getMitglieder(), getKategorien(), getAnwesenheitDaten(),
        getKoenigRangliste(), getPudelkoenigRangliste(),
      ])
      const katRanglisten = await Promise.all(
        kats.map(k =>
          (k.einheit === '€' ? getRanglisteDurchschnitt : getRangliste)(k.id)
            .then(r => ({ ...k, rangliste: r }))
        )
      )

      const nichtGaeste = alle.filter(m => !m.ist_gast)
      const abende = anwesenheit?.abende ?? []
      const teilnahmen = anwesenheit?.teilnahmen ?? new Set()

      const anwMap = {}
      for (const m of (anwesenheit?.mitglieder ?? [])) {
        let c = 0
        for (const a of abende) if (teilnahmen.has(`${m.id}:${a.id}`)) c++
        anwMap[m.id] = c
      }
      const koenigMap = Object.fromEntries(koenig.map(m => [m.id, m.gesamt]))
      const pudelMap  = Object.fromEntries(pudel.map(m => [m.id, m.gesamt]))
      const katMap = {}
      for (const k of katRanglisten)
        katMap[k.id] = Object.fromEntries(k.rangliste.map(m => [m.id, m.gesamt]))

      const n = nichtGaeste.length
      const avgs = {
        anw_abende: n > 0 ? Object.values(anwMap).reduce((s, v) => s + v, 0) / n : 0,
        koenig: n > 0 ? koenig.reduce((s, m) => s + m.gesamt, 0) / n : 0,
        pudel:  n > 0 ? pudel.reduce((s, m) => s + m.gesamt, 0) / n : 0,
      }
      avgs.anw_pct = abende.length > 0 ? avgs.anw_abende / abende.length * 100 : 0
      for (const k of katRanglisten) {
        const vals = Object.values(katMap[k.id])
        avgs[`kat_${k.id}`] = vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0
      }

      setMitglieder(nichtGaeste)
      setBaseData({ totalAbende: abende.length, anwMap, koenigMap, pudelMap, katRanglisten, katMap, avgs, allIds: nichtGaeste.map(m => m.id) })

      const preId = searchParams.get('m')
      if (preId && nichtGaeste.find(m => m.id === preId)) setAusgewaehlt([preId])
      const preKat = searchParams.get('kat')
      const fixedSectionIds = ['anwesenheit', 'ehrentitel']
      if (preKat && (fixedSectionIds.includes(preKat) || katRanglisten.find(k => `kat_${k.id}` === preKat))) setFilterKat(preKat)
      setLoading(false)
    }
    laden()
  }, [])

  // ── Detail-Daten laden (alle Kategorien) ─────────────────────
  useEffect(() => {
    if (!baseData) return

    // Falls Ø ausgewählt → alle Mitglieder laden
    const memberIds = ausgewaehlt.includes(AVG_ID)
      ? baseData.allIds
      : ausgewaehlt.filter(id => id !== AVG_ID)

    const needed = []
    for (const mid of memberIds) {
      for (const k of baseData.katRanglisten) {
        const key = `${mid}_${k.id}`
        if (!(key in detailCache) && !loadingRef.current.has(key)) {
          needed.push({ mid, katId: k.id, key, einheit: k.einheit })
          loadingRef.current.add(key)
        }
      }
    }
    if (!needed.length) return

    Promise.all(needed.map(async ({ mid, katId, key }) => {
      const eintraege = await getEintraegeProMitglied(mid, katId)
      const ae = eintraege.filter(e => e.kegelabend_id)
      const count = ae.length
      const summe = ae.reduce((s, e) => s + e.summe, 0)
      return { key, d: {
        summe,
        abende: count,
        schnitt: count > 0 ? summe / count : 0,
        min: count > 0 ? Math.min(...ae.map(e => e.summe)) : 0,
        max: count > 0 ? Math.max(...ae.map(e => e.summe)) : 0,
      }}
    })).then(results => {
      const entries = Object.fromEntries(results.map(({ key, d }) => [key, d]))
      setDetailCache(prev => ({ ...prev, ...entries }))
      for (const { key } of needed) loadingRef.current.delete(key)
    })
  }, [ausgewaehlt, baseData])

  document.title = 'Vergleich'

  const toggle = id => setAusgewaehlt(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  )

  // ── Sections aufbauen ────────────────────────────────────────
  const sections = baseData ? [
    {
      id: 'anwesenheit', label: 'Anwesenheit',
      stats: [
        {
          label: 'Abende', lowerBetter: false,
          get: id => id === AVG_ID ? baseData.avgs.anw_abende : (baseData.anwMap[id] ?? 0),
          fmt: v => `${Math.round(v)}`,
        },
        {
          label: 'Quote', lowerBetter: false,
          get: id => id === AVG_ID ? baseData.avgs.anw_pct : (baseData.totalAbende > 0 ? (baseData.anwMap[id] ?? 0) / baseData.totalAbende * 100 : 0),
          fmt: v => `${Math.round(v)}\u202f%`,
        },
      ],
    },
    ...baseData.katRanglisten.map(k => ({
      id: `kat_${k.id}`, label: k.name,
      stats: k.einheit === '€' ? [
        {
          label: 'Ø pro Abend', lowerBetter: true,
          get: id => {
            if (id === AVG_ID) return baseData.avgs[`kat_${k.id}`]
            return detailCache[`${id}_${k.id}`]?.schnitt ?? baseData.katMap[k.id]?.[id] ?? 0
          },
          fmt: v => `${v.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}\u202f€`,
        },
        {
          label: 'Günstigster Abend', lowerBetter: true,
          get: id => {
            if (id === AVG_ID) {
              const vals = baseData.allIds.map(mid => detailCache[`${mid}_${k.id}`]?.min).filter(v => v != null)
              return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0
            }
            return detailCache[`${id}_${k.id}`]?.min ?? 0
          },
          fmt: v => `${v.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}\u202f€`,
        },
        {
          label: 'Teuerster Abend', lowerBetter: true,
          get: id => {
            if (id === AVG_ID) {
              const vals = baseData.allIds.map(mid => detailCache[`${mid}_${k.id}`]?.max).filter(v => v != null)
              return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0
            }
            return detailCache[`${id}_${k.id}`]?.max ?? 0
          },
          fmt: v => `${v.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}\u202f€`,
        },
        {
          label: 'Gesamt', lowerBetter: true,
          get: id => {
            if (id === AVG_ID) {
              const vals = baseData.allIds.map(mid => detailCache[`${mid}_${k.id}`]?.summe).filter(v => v != null)
              return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0
            }
            return detailCache[`${id}_${k.id}`]?.summe ?? 0
          },
          fmt: v => `${v.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}\u202f€`,
        },
      ] : [
        {
          label: 'Gesamt', lowerBetter: false,
          get: id => {
            if (id === AVG_ID) return baseData.avgs[`kat_${k.id}`]
            return detailCache[`${id}_${k.id}`]?.summe ?? baseData.katMap[k.id]?.[id] ?? 0
          },
          fmt: v => `${Math.round(v)}\u202f${k.einheit}`,
        },
        {
          label: 'Ø pro Abend', lowerBetter: false,
          get: id => {
            if (id === AVG_ID) {
              const vals = baseData.allIds.map(mid => detailCache[`${mid}_${k.id}`]?.schnitt).filter(v => v != null)
              return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0
            }
            return detailCache[`${id}_${k.id}`]?.schnitt ?? 0
          },
          fmt: v => `${(Math.round(v * 10) / 10).toLocaleString('de-DE')}\u202f${k.einheit}`,
        },
        {
          label: 'Abende', lowerBetter: false,
          get: id => {
            if (id === AVG_ID) {
              const vals = baseData.allIds.map(mid => detailCache[`${mid}_${k.id}`]?.abende).filter(v => v != null)
              return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0
            }
            return detailCache[`${id}_${k.id}`]?.abende ?? 0
          },
          fmt: v => `${Math.round(v)}`,
        },
      ],
    })),
    {
      id: 'ehrentitel', label: 'Ehrentitel',
      stats: [
        {
          label: 'König', lowerBetter: false,
          get: id => id === AVG_ID ? baseData.avgs.koenig : (baseData.koenigMap[id] ?? 0),
          fmt: v => Math.round(v) > 0 ? `${Math.round(v)}×` : '–',
        },
        {
          label: 'Pudelkönig', lowerBetter: false,
          get: id => id === AVG_ID ? baseData.avgs.pudel : (baseData.pudelMap[id] ?? 0),
          fmt: v => Math.round(v) > 0 ? `${Math.round(v)}×` : '–',
        },
      ],
    },
  ] : []

  const gewaehlt = [
    ...mitglieder.filter(m => ausgewaehlt.includes(m.id)),
    ...(ausgewaehlt.includes(AVG_ID) ? [{ id: AVG_ID, spitzname: 'Ø Schnitt', name: 'Ø Schnitt' }] : []),
  ]

  const toggleStat = (sectionId, statLabel) => {
    setFilterStats(prev => {
      const section = sections.find(s => s.id === sectionId)
      const cur = new Set(prev[sectionId] ?? section.stats.map(s => s.label))
      if (cur.has(statLabel)) cur.delete(statLabel)
      else cur.add(statLabel)
      return { ...prev, [sectionId]: new Set(cur) }
    })
  }

  const toggleSection = id => setHiddenSections(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })

  const visibleSections = filterKat === 'alle'
    ? sections.filter(s => !hiddenSections.has(s.id))
    : sections.filter(s => s.id === filterKat)

  // Grid: label column + one per player
  const LABEL_W = 110
  const gridCols = `${LABEL_W}px repeat(${gewaehlt.length}, 1fr)`

  return (
    <div className="page">
      <div className="section-header" style={{ marginTop: 40 }}>
        <h2 className="section-title">Vergleich</h2>
      </div>

      {/* ── Mitglieder-Chips ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
        {mitglieder.map(m => {
          const sel = ausgewaehlt.includes(m.id)
          return (
            <button key={m.id} onClick={() => toggle(m.id)} style={{
              padding: '7px 16px', borderRadius: 99,
              border: `1.5px solid ${sel ? 'var(--ink)' : 'var(--paper-subtle)'}`,
              background: sel ? 'var(--ink)' : 'transparent',
              color: sel ? 'var(--paper)' : 'var(--ink-muted)',
              fontSize: 13, fontFamily: 'var(--serif)', cursor: 'pointer', transition: 'all 0.15s',
            }}>
              {m.spitzname || m.name}
            </button>
          )
        })}
        <button onClick={() => toggle(AVG_ID)} style={{
          padding: '7px 16px', borderRadius: 99,
          border: `1.5px dashed ${ausgewaehlt.includes(AVG_ID) ? 'var(--ink-faint)' : 'var(--paper-mid)'}`,
          background: ausgewaehlt.includes(AVG_ID) ? 'var(--paper-subtle)' : 'transparent',
          color: ausgewaehlt.includes(AVG_ID) ? 'var(--ink)' : 'var(--ink-faint)',
          fontSize: 13, fontFamily: 'var(--serif)', fontStyle: 'italic',
          cursor: 'pointer', transition: 'all 0.15s',
        }}>
          Ø Durchschnitt
        </button>
      </div>

      {loading ? (
        <div className="empty"><p style={{ color: 'var(--ink-faint)' }}>Lade…</p></div>
      ) : gewaehlt.length < 2 ? (
        <div className="empty"><p className="empty-title">Mindestens 2 auswählen</p></div>
      ) : (
        <>
          {/* ── Filter ── */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            {[{ id: 'alle', label: 'Alle' }, ...sections.map(s => ({ id: s.id, label: s.label }))].map(opt => (
              <button key={opt.id} onClick={() => setFilterKat(opt.id)} style={{
                padding: '6px 14px', borderRadius: 99, border: '1px solid',
                borderColor: filterKat === opt.id ? 'var(--ink)' : 'var(--paper-mid)',
                background: filterKat === opt.id ? 'var(--ink)' : 'transparent',
                color: filterKat === opt.id ? 'var(--paper)' : 'var(--ink-muted)',
                fontSize: 12, letterSpacing: '0.04em', cursor: 'pointer', transition: 'all 0.15s',
              }}>
                {opt.label}
              </button>
            ))}
          </div>

          {/* ── Alle-Modus: Über- und Unterkategorien togglen ── */}
          {filterKat === 'alle' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 24 }}>
              {sections.map(section => {
                const sectionOn = !hiddenSections.has(section.id)
                const activeStats = filterStats[section.id] ?? new Set(section.stats.map(s => s.label))
                return (
                  <div key={section.id} style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {/* Überkategorie-Chip */}
                    <button onClick={() => toggleSection(section.id)} style={{
                      padding: '4px 12px', borderRadius: 99, border: '1px solid',
                      borderColor: sectionOn ? 'var(--ink-muted)' : 'var(--paper-mid)',
                      background: sectionOn ? 'var(--ink-muted)' : 'transparent',
                      color: sectionOn ? 'var(--paper)' : 'var(--ink-faint)',
                      fontSize: 11, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0,
                    }}>
                      {section.label}
                    </button>
                    {/* Unterkategorie-Chips (nur wenn Sektion aktiv und mehrere Stats) */}
                    {sectionOn && section.stats.length > 1 && section.stats.map(stat => {
                      const active = activeStats.has(stat.label)
                      return (
                        <button key={stat.label} onClick={() => toggleStat(section.id, stat.label)} style={{
                          padding: '4px 10px', borderRadius: 99, border: '1px solid',
                          borderColor: active ? 'var(--paper-mid)' : 'var(--paper-subtle)',
                          background: active ? 'var(--paper-subtle)' : 'transparent',
                          color: active ? 'var(--ink-faint)' : 'var(--paper-mid)',
                          fontSize: 10, cursor: 'pointer', transition: 'all 0.15s',
                        }}>
                          {stat.label}
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          ) : (
            /* ── Einzelkategorie: nur Unterkategorien ── */
            (() => {
              const section = sections.find(s => s.id === filterKat)
              if (!section || section.stats.length < 2) return <div style={{ marginBottom: 16 }} />
              const activeStats = filterStats[filterKat] ?? new Set(section.stats.map(s => s.label))
              return (
                <div style={{ display: 'flex', gap: 6, marginBottom: 20, marginTop: 6, flexWrap: 'wrap' }}>
                  {section.stats.map(stat => {
                    const active = activeStats.has(stat.label)
                    return (
                      <button key={stat.label} onClick={() => toggleStat(filterKat, stat.label)} style={{
                        padding: '4px 12px', borderRadius: 99, border: '1px solid',
                        borderColor: active ? 'var(--ink-muted)' : 'var(--paper-mid)',
                        background: active ? 'var(--paper-subtle)' : 'transparent',
                        color: active ? 'var(--ink-muted)' : 'var(--ink-faint)',
                        fontSize: 11, cursor: 'pointer', transition: 'all 0.15s',
                      }}>
                        {stat.label}
                      </button>
                    )
                  })}
                </div>
              )
            })()
          )}

          {/* ── Stat-Sektionen ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {visibleSections.map((section, si) => {
              const statFilter = filterStats[section.id]
              const activeStats = statFilter
                ? section.stats.filter(stat => statFilter.has(stat.label))
                : section.stats
              return (
              <div key={section.id} style={{
                background: 'var(--paper)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)',
                padding: '20px 24px 24px',
                animation: `fadeUp 0.4s cubic-bezier(0.4,0,0.2,1) ${si * 0.05}s both`,
              }}>

                {/* Section label */}
                <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 16 }}>
                  {section.label}
                </div>

                {/* Player name header */}
                <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 8, marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid var(--paper-subtle)' }}>
                  <div />
                  {gewaehlt.map(m => {
                    const isAvg = m.id === AVG_ID
                    return (
                      <div key={m.id} style={{ textAlign: 'center' }}>
                        <span style={{
                          fontSize: 12, fontFamily: 'var(--serif)',
                          color: isAvg ? 'var(--ink-faint)' : 'var(--ink-muted)',
                          fontStyle: isAvg ? 'italic' : 'normal',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          display: 'block',
                        }}>
                          {m.spitzname || m.name}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Stat rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {activeStats.map(stat => {
                    const werte = gewaehlt.map(m => ({ id: m.id, v: stat.get(m.id) }))
                    const realVals = werte.filter(w => w.id !== AVG_ID).map(w => w.v)
                    const maxV = Math.max(...werte.map(w => w.v), 0.001)
                    const allSame = realVals.length < 2 || realVals.every(v => v === realVals[0])
                    const bestV = stat.lowerBetter ? Math.min(...realVals) : Math.max(...realVals)
                    const worstV = stat.lowerBetter ? Math.max(...realVals) : Math.min(...realVals)

                    return (
                      <div key={stat.label}>
                        {/* Stat label */}
                        <div style={{ fontSize: 10, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 8 }}>
                          {stat.label}
                        </div>

                        {/* Value + bar columns */}
                        <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 8, alignItems: 'end' }}>
                          <div /> {/* empty label column */}
                          {werte.map(({ id, v }) => {
                            const isBest  = !allSame && id !== AVG_ID && v === bestV
                            const isWorst = !allSame && id !== AVG_ID && v === worstV && bestV !== worstV
                            const isAvg   = id === AVG_ID
                            const barPct  = maxV > 0 ? (v / maxV) * 100 : 0
                            const color   = isBest ? '#27ae60' : isWorst ? '#c0392b' : '#6e6e73'

                            return (
                              <div key={id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                                <span style={{
                                  fontSize: 14, fontFamily: 'var(--serif)',
                                  color: isBest ? '#27ae60' : isWorst ? '#c0392b' : (isAvg ? 'var(--ink-faint)' : 'var(--ink)'),
                                  fontWeight: isBest ? 600 : 400,
                                  fontStyle: isAvg ? 'italic' : 'normal',
                                  whiteSpace: 'nowrap',
                                }}>
                                  {stat.fmt(v)}
                                </span>
                                <div style={{ width: '100%', height: 5, background: 'var(--paper-subtle)', borderRadius: 99, overflow: 'hidden' }}>
                                  <div style={{
                                    height: '100%',
                                    width: `${barPct}%`,
                                    borderRadius: 99,
                                    background: isAvg
                                      ? `repeating-linear-gradient(90deg,${color}66 0,${color}66 4px,transparent 4px,transparent 8px)`
                                      : color,
                                    opacity: isBest ? 1 : isWorst ? 0.7 : (isAvg ? 0.6 : 0.45),
                                    transition: 'width 0.45s cubic-bezier(0.4,0,0.2,1)',
                                  }} />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )})}
          </div>
        </>
      )}
    </div>
  )
}

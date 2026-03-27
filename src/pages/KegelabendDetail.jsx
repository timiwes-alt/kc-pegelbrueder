import { useState, useEffect, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getKegelabend, getKategorien, getRanglisteKegelabend, getStatistikenKegelabend, getKegelabendFotos, uploadKegelabendFoto, deleteKegelabendFoto } from '../lib/supabase'

function formatDatum(iso) {
  return new Date(iso).toLocaleDateString('de-DE', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  })
}

function formatWert(wert, einheit) {
  if (einheit === '€') return `${Number(wert).toFixed(1)} €`
  return `${wert} ${einheit}`
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
          <div key={m.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            animation: `fadeUp 0.45s cubic-bezier(0.4,0,0.2,1) ${i * 0.06}s both`,
          }}>
            <div style={{
              width: 26, flexShrink: 0, textAlign: 'center', lineHeight: 1,
              fontSize: i < 3 ? 15 : 11, color: 'var(--ink-faint)', fontFamily: 'var(--serif)',
            }}>
              {i < 3 ? MEDALS[i] : i + 1}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <Link
                  to={`/mitglied/${m.id}`}
                  style={{
                    fontFamily: 'var(--serif)', fontSize: isFirst ? 18 : 16,
                    color: 'var(--ink)', textDecoration: 'none',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    flex: 1, minWidth: 0, transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={e => e.target.style.opacity = '0.6'}
                  onMouseLeave={e => e.target.style.opacity = '1'}
                >
                  {anzeigeName}
                </Link>
                <span style={{
                  fontFamily: 'var(--serif)',
                  fontSize: isFirst ? 21 : 17,
                  color: isFirst ? 'var(--ink)' : 'var(--ink-muted)',
                  flexShrink: 0, paddingLeft: 16,
                }}>
                  {formatWert(m.gesamt, einheit)}
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

export default function KegelabendDetail() {
  const { isAdmin } = useAuth()
  const { kegelabendId } = useParams()
  const [abend, setAbend] = useState(null)
  const [kategorien, setKategorien] = useState([])
  const [ranglistenDaten, setRanglistenDaten] = useState({})
  const [fotos, setFotos] = useState([])
  const [uploadLoading, setUploadLoading] = useState(false)
  const [fotoFehler, setFotoFehler] = useState(null)
  const [loading, setLoading] = useState(true)
  const fotoInputRef = useRef(null)

  useEffect(() => {
    async function laden() {
      try {
        const [a, kats, eintraege, fotos] = await Promise.all([
          getKegelabend(kegelabendId),
          getKategorien(),
          getStatistikenKegelabend(kegelabendId),
          getKegelabendFotos(kegelabendId),
        ])
        setFotos(fotos)
        setAbend(a)

        const kategorieIds = [...new Set(eintraege.map(e => e.statistik_kategorien.id))]
        const relevanteKats = kats.filter(k => kategorieIds.includes(k.id))
        setKategorien(relevanteKats)

        const ranglisten = {}
        await Promise.all(relevanteKats.map(async k => {
          ranglisten[k.id] = await getRanglisteKegelabend(kegelabendId, k.id)
        }))
        setRanglistenDaten(ranglisten)
      } finally {
        setLoading(false)
      }
    }
    laden()
  }, [kegelabendId])

  async function handleFotoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadLoading(true)
    setFotoFehler(null)
    try {
      const foto = await uploadKegelabendFoto(kegelabendId, file)
      setFotos(prev => [...prev, { ...foto, name: foto.path.split('/').pop() }])
    } catch {
      setFotoFehler('Upload fehlgeschlagen. Bitte prüfe ob der Storage-Bucket „kegelabend-fotos" angelegt ist.')
    } finally {
      setUploadLoading(false)
      if (fotoInputRef.current) fotoInputRef.current.value = ''
    }
  }

  async function handleFotoDelete(foto) {
    if (!confirm('Foto wirklich löschen?')) return
    try {
      await deleteKegelabendFoto(foto.path)
      setFotos(prev => prev.filter(f => f.path !== foto.path))
    } catch {
      setFotoFehler('Löschen fehlgeschlagen.')
    }
  }

  if (loading) return <div className="page"><div className="empty"><p style={{ color: 'var(--ink-faint)' }}>Lade…</p></div></div>
  if (!abend) return <div className="page"><div className="empty"><p className="empty-title">Nicht gefunden</p></div></div>

  // Zusammenfassung berechnen
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
        <Link to="/kegelabende" style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-faint)', textDecoration: 'none' }}>
          ← Alle Kegelabende
        </Link>
      </div>

      <div className="section-header">
        <h2 className="section-title">{formatDatum(abend.datum)}</h2>
        <span className="section-meta">{kategorien.length} Statistiken</span>
      </div>

      {/* Zusammenfassung */}
      {allePersonenIds.size > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 40 }}>
          {[
            { label: 'Teilnehmer', wert: allePersonenIds.size },
            ...(strafenGesamt > 0 ? [
              { label: 'Gesamtstrafen', wert: `${Number(strafenGesamt).toFixed(1)} €` },
              { label: 'Ø Strafen pro Mitglied', wert: `${Number(strafenGesamt / Object.keys(strafenProPerson).length).toFixed(1)} €` },
            ] : []),
          ].map((tile, i) => (
            <div key={tile.label} style={{
              background: 'var(--paper)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', padding: '20px 22px',
              animation: `fadeUp 0.5s cubic-bezier(0.4,0,0.2,1) ${i * 0.07 + 0.05}s both`,
              transition: 'box-shadow 0.2s, transform 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 8 }}>{tile.label}</div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 28, color: 'var(--ink)' }}>{tile.wert}</div>
            </div>
          ))}
        </div>
      )}

      {/* Statistiken */}
      {kategorien.length === 0 ? (
        <div className="empty">
          <p className="empty-title">Noch keine Einträge</p>
          <p style={{ fontSize: 14 }}>
            Trag unter{' '}
            <Link to="/eintragen" style={{ color: 'var(--ink)' }}>Eintragen</Link>
            {' '}Werte für diesen Abend ein.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {kategorien.map((kat, ki) => (
            <div key={kat.id} style={{
              background: 'var(--paper)',
              borderRadius: 'var(--radius)',
              boxShadow: 'var(--shadow-sm)',
              padding: '28px 32px 32px',
              animation: `fadeUp 0.5s cubic-bezier(0.4,0,0.2,1) ${ki * 0.08 + 0.15}s both`,
              transition: 'box-shadow 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid var(--paper-subtle)' }}>
                <Link
                  to={`/rangliste/${kat.id}`}
                  style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)', textDecoration: 'none' }}
                  onMouseEnter={e => e.target.style.opacity = '0.6'}
                  onMouseLeave={e => e.target.style.opacity = '1'}
                >
                  {kat.name}
                </Link>
                <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>
                  {kat.einheit}
                </span>
              </div>
              {ranglistenDaten[kat.id]?.length > 0 ? (
                <BalkenChart daten={ranglistenDaten[kat.id]} einheit={kat.einheit} />
              ) : (
                <p style={{ fontSize: 14, color: 'var(--ink-faint)' }}>Keine Daten</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Fotos */}
      <div style={{ marginTop: 56 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid var(--paper-subtle)' }}>
          <span style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)' }}>Fotos</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {uploadLoading && <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>Lädt hoch…</span>}
            {isAdmin && (
              <>
                <input ref={fotoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFotoUpload} />
                <button
                  className="btn btn-primary btn-sm"
                  disabled={uploadLoading}
                  onClick={() => fotoInputRef.current?.click()}
                >
                  + Foto
                </button>
              </>
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
                onMouseLeave={e => e.currentTarget.querySelector('.foto-del')?.style.setProperty('opacity', '0')}
              >
                <img src={foto.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                {isAdmin && <button className="foto-del" onClick={() => handleFotoDelete(foto)} style={{
                  position: 'absolute', top: 8, right: 8,
                  background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none',
                  borderRadius: 6, padding: '3px 10px', fontSize: 11, cursor: 'pointer',
                  opacity: 0, transition: 'opacity 0.15s',
                }}>✕</button>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

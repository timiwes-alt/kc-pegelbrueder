import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getKegelabende, createKegelabend, deleteKegelabend, getTeilnahmeMatrix } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const CELL = 22
const LABEL_W = 116

function AnwesenheitGrid({ abende, mitglieder, teilnahmen }) {
  const abendeAsc = [...abende].reverse()

  const sortiert = [...mitglieder].sort((a, b) => {
    const cntA = abendeAsc.filter(e => teilnahmen.has(`${a.id}:${e.id}`)).length
    const cntB = abendeAsc.filter(e => teilnahmen.has(`${b.id}:${e.id}`)).length
    return cntB - cntA
  })

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
      <div style={{ display: 'inline-block', minWidth: '100%' }}>

        {/* Datum-Kopfzeile */}
        <div style={{ display: 'flex', paddingLeft: LABEL_W, marginBottom: 6 }}>
          {abendeAsc.map(a => (
            <div key={a.id} style={{ width: CELL, flexShrink: 0, height: 52, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
              <span style={{
                fontSize: 9, color: 'var(--ink-faint)', whiteSpace: 'nowrap',
                display: 'block', letterSpacing: '0.02em',
                transform: 'rotate(-55deg)', transformOrigin: 'center bottom',
              }}>
                {new Date(a.datum).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
              </span>
            </div>
          ))}
          <div style={{ width: 32, flexShrink: 0 }} />
        </div>

        {/* Zeilen */}
        {sortiert.map(m => {
          const count = abendeAsc.filter(a => teilnahmen.has(`${m.id}:${a.id}`)).length
          return (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', marginBottom: 3 }}>
              <Link to={`/mitglied/${m.id}`} style={{
                width: LABEL_W, flexShrink: 0,
                fontSize: 12, color: 'var(--ink-muted)', textDecoration: 'none',
                paddingRight: 12, textAlign: 'right',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--ink)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--ink-muted)'}
              >
                {m.spitzname || m.name}
              </Link>
              {abendeAsc.map(a => {
                const dabei = teilnahmen.has(`${m.id}:${a.id}`)
                return (
                  <div
                    key={a.id}
                    title={`${m.spitzname || m.name} · ${new Date(a.datum).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}`}
                    style={{
                      width: CELL - 3, height: CELL - 3, marginRight: 3, flexShrink: 0,
                      borderRadius: 4,
                      background: dabei ? 'var(--ink)' : 'var(--paper-subtle)',
                      opacity: dabei ? 1 : 0.6,
                    }}
                  />
                )
              })}
              <div style={{ width: 32, flexShrink: 0, paddingLeft: 6, fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--serif)' }}>
                {count}
              </div>
            </div>
          )
        })}

        {/* Summenzeile */}
        {sortiert.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--paper-subtle)' }}>
            <div style={{ width: LABEL_W, flexShrink: 0, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-faint)', textAlign: 'right', paddingRight: 12 }}>
              Dabei
            </div>
            {abendeAsc.map(a => {
              const cnt = sortiert.filter(m => teilnahmen.has(`${m.id}:${a.id}`)).length
              return (
                <div key={a.id} style={{ width: CELL, flexShrink: 0, fontSize: 10, color: 'var(--ink-faint)', textAlign: 'center', fontFamily: 'var(--serif)' }}>
                  {cnt || ''}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function formatDatum(iso) {
  return new Date(iso).toLocaleDateString('de-DE', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  })
}

function formatDatumKurz(iso) {
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })
}

export default function Kegelabende() {
  const { isAdmin } = useAuth()
  const [abende, setAbende] = useState([])
  const [matrix, setMatrix] = useState(null)
  const [datum, setDatum] = useState('')
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [initLoading, setInitLoading] = useState(true)

  useEffect(() => {
    laden()
    getTeilnahmeMatrix().then(setMatrix).catch(() => {})
  }, [])

  async function laden() {
    try {
      const a = await getKegelabende()
      setAbende(a)
    } catch {
      setStatus({ type: 'error', msg: 'Kegelabende konnten nicht geladen werden.' })
    } finally {
      setInitLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!datum) { setStatus({ type: 'error', msg: 'Bitte ein Datum auswählen.' }); return }
    setLoading(true); setStatus(null)
    try {
      await createKegelabend(datum)
      setDatum('')
      setStatus({ type: 'success', msg: 'Kegelabend angelegt.' })
      await laden()
    } catch (err) {
      setStatus({ type: 'error', msg: 'Fehler: ' + err.message })
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id, dat) {
    if (!confirm(`Kegelabend vom ${formatDatumKurz(dat)} wirklich löschen? Alle Einträge dieses Abends gehen verloren.`)) return
    try {
      await deleteKegelabend(id)
      setAbende(prev => prev.filter(a => a.id !== id))
    } catch {
      setStatus({ type: 'error', msg: 'Löschen fehlgeschlagen.' })
    }
  }

  return (
    <div className="page">
      <div className="section-header">
        <h2 className="section-title">Kegelabende</h2>
        <span className="section-meta">{abende.length} Abende</span>
      </div>

      {status && <div className={`alert alert-${status.type}`}>{status.msg}</div>}

      {isAdmin && (
        <form className="form-card" onSubmit={handleSubmit} style={{ marginBottom: 40 }}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Datum *</label>
              <input
                className="form-input"
                type="date"
                value={datum}
                onChange={e => setDatum(e.target.value)}
              />
            </div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Anlegen…' : 'Kegelabend anlegen'}
          </button>
        </form>
      )}

      {initLoading ? (
        <div className="empty"><p style={{ color: 'var(--ink-faint)' }}>Lade…</p></div>
      ) : abende.length === 0 ? (
        <div className="empty">
          <p className="empty-title">Noch keine Kegelabende</p>
          <p style={{ fontSize: 14 }}>Lege oben den ersten Abend an.</p>
        </div>
      ) : (
        <div style={{
          background: 'var(--paper)',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow-sm)',
          overflow: 'hidden',
        }}>
          {abende.map((a, i) => (
            <div key={a.id} style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '18px 24px',
              borderBottom: i < abende.length - 1 ? '1px solid var(--paper-subtle)' : 'none',
              transition: 'background 0.12s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--paper-warm)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--ink-faint)', width: 32, textAlign: 'right', flexShrink: 0 }}>
                {abende.length - i}
              </div>
              <div style={{ flex: 1 }}>
                <Link
                  to={`/kegelabend/${a.id}`}
                  style={{ fontFamily: 'var(--serif)', fontSize: 19, color: 'var(--ink)', textDecoration: 'none' }}
                  onMouseEnter={e => e.target.style.opacity = '0.6'}
                  onMouseLeave={e => e.target.style.opacity = '1'}
                >
                  {formatDatum(a.datum)}
                </Link>
              </div>
              {isAdmin && (
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(a.id, a.datum)}>
                  Löschen
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Anwesenheits-Grid */}
      {matrix && matrix.mitglieder.length > 0 && abende.length > 0 && (
        <div style={{ marginTop: 64 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid var(--paper-subtle)' }}>
            <span style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)' }}>Anwesenheit</span>
            <span style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>
              {abende.length} Abende
            </span>
          </div>
          <AnwesenheitGrid
            abende={abende}
            mitglieder={matrix.mitglieder}
            teilnahmen={matrix.teilnahmen}
          />
        </div>
      )}
    </div>
  )
}

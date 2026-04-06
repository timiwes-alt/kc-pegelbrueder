import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getKegelabende, createKegelabend, deleteKegelabend } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'


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
  const [datum, setDatum] = useState('')
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [initLoading, setInitLoading] = useState(true)

  useEffect(() => {
    laden()
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
        <div style={{ outline: '1.5px dashed rgba(210,30,30,0.38)', outlineOffset: 4, borderRadius: 8, marginBottom: 40 }}>
          <form className="form-card" onSubmit={handleSubmit}>
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
        </div>
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
              animation: `fadeUp 0.4s cubic-bezier(0.4,0,0.2,1) ${Math.min(i * 0.04, 0.4)}s both`,
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
                <div style={{ outline: '1.5px dashed rgba(210,30,30,0.38)', outlineOffset: 4, borderRadius: 8 }}>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(a.id, a.datum)}>
                    Löschen
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  )
}

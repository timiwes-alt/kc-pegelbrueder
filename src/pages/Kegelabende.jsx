import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getKegelabende, createKegelabend, deleteKegelabend, getMitgliederMitStreaks, getTeilnahmeMatrix } from '../lib/supabase'

const CELL = 22
const LABEL_W = 116

function AnwesenheitGrid({ abende, mitglieder, teilnahmen }) {
  // Älteste links → jüngste rechts
  const abendeAsc = [...abende].reverse()

  // Mitglieder nach Gesamtanwesenheit sortieren
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
                fontSize: 12, color: 'var(--ink-soft)', textDecoration: 'none',
                paddingRight: 12, textAlign: 'right',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--ink)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--ink-soft)'}
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
                      borderRadius: 3,
                      background: dabei ? 'var(--ink)' : 'var(--paper-mid)',
                      opacity: dabei ? 1 : 0.55,
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
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--paper-mid)' }}>
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
  const [abende, setAbende] = useState([])
  const [streaks, setStreaks] = useState([])
  const [matrix, setMatrix] = useState(null)
  const [datum, setDatum] = useState('')
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [initLoading, setInitLoading] = useState(true)

  useEffect(() => {
    laden()
    getMitgliederMitStreaks().then(setStreaks).catch(() => {})
    getTeilnahmeMatrix().then(setMatrix).catch(() => {})
  }, [])

  async function laden() {
    try {
      const a = await getKegelabende()
      setAbende(a)
    } catch (e) {
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
    } catch (err) {
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

      {/* Neuer Abend */}
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

      {/* Streak-Leaderboard */}
      {streaks.length > 0 && (
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 16 }}>
            Aktuelle Streaks
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 1, background: 'var(--paper-mid)', border: '1px solid var(--paper-mid)' }}>
            {streaks.slice(0, 6).map((m, i) => (
              <Link key={m.id} to={`/mitglied/${m.id}`} style={{ textDecoration: 'none', background: 'var(--paper)', padding: '18px 20px', display: 'block', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--paper-warm)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--paper)'}
              >
                <div style={{ fontFamily: 'var(--serif)', fontSize: 28, color: i === 0 ? 'var(--ink)' : 'var(--ink-soft)', lineHeight: 1, marginBottom: 6 }}>
                  {m.streak}
                  <span style={{ fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--ink-faint)', marginLeft: 4 }}>in Folge</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{m.spitzname || m.name}</div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Liste */}
      {initLoading ? (
        <div className="empty"><p style={{ color: 'var(--ink-faint)' }}>Lade…</p></div>
      ) : abende.length === 0 ? (
        <div className="empty">
          <p className="empty-title">Noch keine Kegelabende</p>
          <p style={{ fontSize: 14 }}>Lege oben den ersten Abend an.</p>
        </div>
      ) : (
        <div className="rangliste">
          {abende.map((a, i) => (
            <div className="rangliste-row" key={a.id} style={{ alignItems: 'center' }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink-faint)', width: 36, textAlign: 'right', flexShrink: 0 }}>
                {abende.length - i}
              </div>
              <div style={{ flex: 1 }}>
                <Link
                  to={`/kegelabend/${a.id}`}
                  style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)', textDecoration: 'none', borderBottom: '1px solid var(--ink-faint)' }}
                  onMouseEnter={e => e.target.style.borderColor = 'var(--ink)'}
                  onMouseLeave={e => e.target.style.borderColor = 'var(--ink-faint)'}
                >
                  {formatDatum(a.datum)}
                </Link>
              </div>
              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(a.id, a.datum)}>
                Löschen
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Anwesenheits-Grid */}
      {matrix && matrix.mitglieder.length > 0 && abende.length > 0 && (
        <div style={{ marginTop: 56 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20, paddingBottom: 12, borderBottom: '1.5px solid var(--ink)' }}>
            <span style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)' }}>Anwesenheit</span>
            <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>
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

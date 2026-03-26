import { useState, useEffect } from 'react'
import { getMitglieder, createMitglied, deleteMitglied } from '../lib/supabase'

export default function Mitglieder() {
  const [mitglieder, setMitglieder] = useState([])
  const [form, setForm] = useState({ name: '', spitzname: '', ist_gast: false })
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [initLoading, setInitLoading] = useState(true)

  useEffect(() => {
    laden()
  }, [])

  async function laden() {
    try {
      const m = await getMitglieder()
      setMitglieder(m)
    } catch (e) {
      setStatus({ type: 'error', msg: 'Mitglieder konnten nicht geladen werden.' })
    } finally {
      setInitLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) {
      setStatus({ type: 'error', msg: 'Name ist Pflichtfeld.' })
      return
    }
    setLoading(true)
    setStatus(null)
    try {
      await createMitglied(form.name.trim(), form.spitzname.trim() || null, form.ist_gast)
      setForm({ name: '', spitzname: '', ist_gast: false })
      setStatus({ type: 'success', msg: 'Mitglied hinzugefügt.' })
      await laden()
    } catch (err) {
      setStatus({ type: 'error', msg: 'Fehler: ' + err.message })
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id, name) {
    if (!confirm(`„${name}" wirklich löschen? Alle Statistik-Einträge gehen verloren.`)) return
    try {
      await deleteMitglied(id)
      setMitglieder(prev => prev.filter(m => m.id !== id))
    } catch (err) {
      setStatus({ type: 'error', msg: 'Löschen fehlgeschlagen.' })
    }
  }

  const mitgliederNormal = mitglieder.filter(m => !m.ist_gast)
  const gaeste = mitglieder.filter(m => m.ist_gast)

  return (
    <div className="page">
      <div className="section-header">
        <h2 className="section-title">Mitglieder</h2>
        <span className="section-meta">{mitgliederNormal.length} Mitglieder · {gaeste.length} Gäste</span>
      </div>

      {status && <div className={`alert alert-${status.type}`}>{status.msg}</div>}

      {/* Formular */}
      <form className="form-card" onSubmit={handleSubmit} style={{ marginBottom: 40 }}>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Vollständiger Name *</label>
            <input
              className="form-input"
              type="text"
              placeholder="z.B. Klaus Herrmann"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Spitzname (optional)</label>
            <input
              className="form-input"
              type="text"
              placeholder="z.B. Klausinho"
              value={form.spitzname}
              onChange={e => setForm(f => ({ ...f, spitzname: e.target.value }))}
            />
          </div>
          <div className="form-group" style={{ justifyContent: 'flex-end', paddingBottom: 2 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.ist_gast}
                onChange={e => setForm(f => ({ ...f, ist_gast: e.target.checked }))}
                style={{ width: 16, height: 16, accentColor: 'var(--ink)' }}
              />
              <span style={{ fontSize: 14, color: 'var(--ink-soft)' }}>Gast (kein festes Mitglied)</span>
            </label>
          </div>
        </div>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Speichert…' : 'Mitglied hinzufügen'}
        </button>
      </form>

      {/* Mitgliederliste */}
      {initLoading ? (
        <div className="empty"><p style={{ color: 'var(--ink-faint)' }}>Lade…</p></div>
      ) : mitglieder.length === 0 ? (
        <div className="empty">
          <p className="empty-title">Noch keine Mitglieder</p>
          <p style={{ fontSize: 14 }}>Füge oben das erste Mitglied hinzu.</p>
        </div>
      ) : (
        <>
          {mitgliederNormal.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Spitzname</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {mitgliederNormal.map((m, i) => (
                    <tr key={m.id}>
                      <td style={{ color: 'var(--ink-faint)', fontFamily: 'var(--serif)', fontSize: 18 }}>{i + 1}</td>
                      <td style={{ fontWeight: 500 }}>{m.name}</td>
                      <td style={{ color: 'var(--ink-muted)', fontStyle: 'italic' }}>{m.spitzname || '–'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(m.id, m.name)}>
                          Entfernen
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {gaeste.length > 0 && (
            <>
              <div className="section-header" style={{ marginTop: 40 }}>
                <h3 className="section-title" style={{ fontSize: 20 }}>Gäste</h3>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Spitzname</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {gaeste.map(m => (
                      <tr key={m.id}>
                        <td>{m.name}</td>
                        <td style={{ color: 'var(--ink-muted)', fontStyle: 'italic' }}>{m.spitzname || '–'}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(m.id, m.name)}>
                            Entfernen
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

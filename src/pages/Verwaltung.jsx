import { useState, useEffect } from 'react'
import { getKategorien, createKategorie } from '../lib/supabase'

const EINHEITEN_VORSCHLAEGE = ['€', 'Punkte', 'Mal', 'Neunen', 'Strikes', 'Spiele', 'Tore', 'km']

export default function Verwaltung() {
  const [kategorien, setKategorien] = useState([])
  const [form, setForm] = useState({ name: '', einheit: '€', einheit_custom: '', beschreibung: '', reihenfolge: '', gruppe: '' })
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [initLoading, setInitLoading] = useState(true)
  const [customEinheit, setCustomEinheit] = useState(false)

  useEffect(() => {
    laden()
  }, [])

  async function laden() {
    try {
      const k = await getKategorien()
      setKategorien(k)
    } catch (e) {
      setStatus({ type: 'error', msg: 'Kategorien konnten nicht geladen werden.' })
    } finally {
      setInitLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const einheit = customEinheit ? form.einheit_custom.trim() : form.einheit
    if (!form.name.trim() || !einheit) {
      setStatus({ type: 'error', msg: 'Name und Einheit sind Pflicht.' })
      return
    }
    setLoading(true)
    setStatus(null)
    try {
      const reihenfolge = form.reihenfolge ? parseInt(form.reihenfolge) : kategorien.length + 1
      await createKategorie(form.name.trim(), einheit, form.beschreibung.trim() || null, reihenfolge, form.gruppe.trim() || null)
      setForm({ name: '', einheit: '€', einheit_custom: '', beschreibung: '', reihenfolge: '', gruppe: '' })
      setCustomEinheit(false)
      setStatus({ type: 'success', msg: 'Kategorie angelegt.' })
      await laden()
    } catch (err) {
      setStatus({ type: 'error', msg: 'Fehler: ' + err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="section-header">
        <h2 className="section-title">Verwaltung</h2>
        <span className="section-meta">Statistik-Kategorien</span>
      </div>

      <div className="alert alert-info" style={{ marginBottom: 24 }}>
        Hier legst du Statistik-Kategorien an. Jede Kategorie erscheint automatisch in der Rangliste. 
        Neue Kategorien lassen sich jederzeit ergänzen — die Seite ist unbegrenzt erweiterbar.
      </div>

      {status && <div className={`alert alert-${status.type}`}>{status.msg}</div>}

      {/* Formular */}
      <form className="form-card" onSubmit={handleSubmit} style={{ marginBottom: 40 }}>
        <div style={{ marginBottom: 8, fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--ink)' }}>
          Neue Kategorie
        </div>
        <hr className="divider" style={{ margin: '12px 0 20px' }} />

        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Bezeichnung *</label>
            <input
              className="form-input"
              type="text"
              placeholder="z.B. Strafen, Neunen, Strikes …"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Einheit *</label>
            {!customEinheit ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <select
                  className="form-select"
                  value={form.einheit}
                  onChange={e => setForm(f => ({ ...f, einheit: e.target.value }))}
                  style={{ flex: 1 }}
                >
                  {EINHEITEN_VORSCHLAEGE.map(e => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setCustomEinheit(true)}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  Eigene
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Eigene Einheit…"
                  value={form.einheit_custom}
                  onChange={e => setForm(f => ({ ...f, einheit_custom: e.target.value }))}
                  style={{ flex: 1 }}
                  autoFocus
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setCustomEinheit(false)}
                >
                  ←
                </button>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Beschreibung (optional)</label>
            <input
              className="form-input"
              type="text"
              placeholder="z.B. Bezahlte Strafen in €"
              value={form.beschreibung}
              onChange={e => setForm(f => ({ ...f, beschreibung: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Gruppe (optional)</label>
            <input
              className="form-input"
              type="text"
              placeholder="z.B. Allgemein, Spiele …"
              value={form.gruppe}
              onChange={e => setForm(f => ({ ...f, gruppe: e.target.value }))}
              list="gruppen-vorschlaege"
            />
            <datalist id="gruppen-vorschlaege">
              <option value="Allgemein" />
              <option value="Spiele" />
            </datalist>
          </div>

          <div className="form-group">
            <label className="form-label">Reihenfolge (optional)</label>
            <input
              className="form-input"
              type="number"
              min="1"
              placeholder="z.B. 1 = zuerst"
              value={form.reihenfolge}
              onChange={e => setForm(f => ({ ...f, reihenfolge: e.target.value }))}
            />
          </div>
        </div>

        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Anlegen…' : 'Kategorie anlegen'}
        </button>
      </form>

      {/* Bestehende Kategorien */}
      <div className="section-header">
        <h3 className="section-title" style={{ fontSize: 20 }}>Aktive Kategorien</h3>
        <span className="section-meta">{kategorien.length} gesamt</span>
      </div>

      {initLoading ? (
        <div className="empty"><p style={{ color: 'var(--ink-faint)' }}>Lade…</p></div>
      ) : kategorien.length === 0 ? (
        <div className="empty">
          <p className="empty-title">Noch keine Kategorien</p>
          <p style={{ fontSize: 14 }}>Fang mit „Strafen (€)" an.</p>
        </div>
      ) : (
        <div className="kat-grid">
          {kategorien.map((k, i) => (
            <div key={k.id} className="kat-card" style={{ cursor: 'default' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className="kat-name">{k.name}</div>
                <span style={{
                  fontSize: 10,
                  fontFamily: 'var(--sans)',
                  letterSpacing: '0.06em',
                  background: 'var(--paper-mid)',
                  color: 'var(--ink-muted)',
                  padding: '2px 7px',
                  borderRadius: 2,
                  textTransform: 'uppercase'
                }}>#{k.reihenfolge}</span>
              </div>
              <div className="kat-einheit">{k.einheit}{k.gruppe ? ` · ${k.gruppe}` : ''}</div>
              {k.beschreibung && (
                <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 8 }}>{k.beschreibung}</div>
              )}
            </div>
          ))}
          {/* Platzhalter "Demnächst" */}
          <div className="kat-card" style={{ cursor: 'default', border: '1px dashed var(--paper-mid)', background: 'transparent' }}>
            <div style={{ fontSize: 12, color: 'var(--ink-faint)', textAlign: 'center', padding: '12px 0' }}>
              + Neue Kategorie<br />oben anlegen
            </div>
          </div>
        </div>
      )}

      {/* Technischer Hinweis */}
      <div style={{ marginTop: 56, padding: '24px 28px', background: 'var(--paper-warm)', borderLeft: '2px solid var(--ink)', borderRadius: '0 4px 4px 0' }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 17, marginBottom: 8 }}>Supabase einrichten</div>
        <p style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.7 }}>
          Erstelle ein kostenloses Projekt auf <strong>supabase.com</strong>, führe das SQL-Schema aus 
          (Datei <code style={{ background: 'var(--paper-mid)', padding: '1px 5px', borderRadius: 3 }}>schema.sql</code> im Projektordner),
          und trage URL und Anon-Key in die Datei <code style={{ background: 'var(--paper-mid)', padding: '1px 5px', borderRadius: 3 }}>.env</code> ein.
        </p>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getMitglieder, getKategorien, getKegelabende, addStatistikEintrag, getStatistiken, deleteStatistikEintrag } from '../lib/supabase'

function formatDatum(iso) {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatDatumLang(iso) {
  return new Date(iso).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function Eintragen() {
  const [mitglieder, setMitglieder] = useState([])
  const [kategorien, setKategorien] = useState([])
  const [kegelabende, setKegelabende] = useState([])
  const [eintraege, setEintraege] = useState([])

  const [form, setForm] = useState({ mitglied_id: '', kategorie_id: '', kegelabend_id: '', wert: '', notiz: '' })
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [initLoading, setInitLoading] = useState(true)

  useEffect(() => {
    async function laden() {
      try {
        const [m, k, a, e] = await Promise.all([getMitglieder(), getKategorien(), getKegelabende(), getStatistiken()])
        setMitglieder(m)
        setKategorien(k)
        setKegelabende(a)
        setEintraege(e)
        setForm(f => ({
          ...f,
          mitglied_id: m[0]?.id || '',
          kategorie_id: k[0]?.id || '',
          kegelabend_id: a[0]?.id || '',
        }))
      } catch (e) {
        setStatus({ type: 'error', msg: 'Daten konnten nicht geladen werden.' })
      } finally {
        setInitLoading(false)
      }
    }
    laden()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.mitglied_id || !form.kategorie_id || !form.kegelabend_id || !form.wert) {
      setStatus({ type: 'error', msg: 'Bitte alle Pflichtfelder ausfüllen.' }); return
    }
    setLoading(true); setStatus(null)
    try {
      await addStatistikEintrag(form.mitglied_id, form.kategorie_id, parseFloat(form.wert), form.notiz || null, form.kegelabend_id)
      const e = await getStatistiken()
      setEintraege(e)
      setForm(f => ({ ...f, wert: '', notiz: '' }))
      setStatus({ type: 'success', msg: 'Eintrag gespeichert.' })
    } catch (err) {
      setStatus({ type: 'error', msg: 'Fehler: ' + err.message })
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Eintrag wirklich löschen?')) return
    try {
      await deleteStatistikEintrag(id)
      setEintraege(prev => prev.filter(e => e.id !== id))
    } catch {
      setStatus({ type: 'error', msg: 'Löschen fehlgeschlagen.' })
    }
  }

  const aktivKategorie = kategorien.find(k => k.id === form.kategorie_id)
  const keineVoraussetzungen = !initLoading && (mitglieder.length === 0 || kategorien.length === 0 || kegelabende.length === 0)

  return (
    <div className="page">
      <div className="section-header">
        <h2 className="section-title">Eintragen</h2>
        <span className="section-meta">Neuer Datensatz</span>
      </div>

      {status && <div className={`alert alert-${status.type}`}>{status.msg}</div>}

      {initLoading ? (
        <div className="empty"><p style={{ color: 'var(--ink-faint)' }}>Lade…</p></div>
      ) : keineVoraussetzungen ? (
        <div className="alert alert-info">
          {kegelabende.length === 0
            ? <>Bitte zuerst unter <Link to="/kegelabende" style={{ color: 'var(--ink)' }}>Kegelabende</Link> einen Abend anlegen.</>
            : <>Bitte zuerst <strong>Mitglieder</strong> und <strong>Verwaltung</strong> einrichten.</>
          }
        </div>
      ) : (
        <form className="form-card" onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Kegelabend *</label>
              <select
                className="form-select"
                value={form.kegelabend_id}
                onChange={e => setForm(f => ({ ...f, kegelabend_id: e.target.value }))}
              >
                {kegelabende.map(a => (
                  <option key={a.id} value={a.id}>{formatDatumLang(a.datum)}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Mitglied *</label>
              <select
                className="form-select"
                value={form.mitglied_id}
                onChange={e => setForm(f => ({ ...f, mitglied_id: e.target.value }))}
              >
                {mitglieder.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.spitzname ? `${m.spitzname} (${m.name})` : m.name}
                    {m.ist_gast ? ' [Gast]' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Kategorie *</label>
              <select
                className="form-select"
                value={form.kategorie_id}
                onChange={e => setForm(f => ({ ...f, kategorie_id: e.target.value }))}
              >
                {kategorien.map(k => (
                  <option key={k.id} value={k.id}>{k.name} ({k.einheit})</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Wert{aktivKategorie ? ` (${aktivKategorie.einheit})` : ''} *</label>
              <input
                className="form-input"
                type="number"
                step="0.01"
                min="0"
                placeholder={aktivKategorie?.einheit === '€' ? 'z.B. 2.50' : 'z.B. 1'}
                value={form.wert}
                onChange={e => setForm(f => ({ ...f, wert: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Notiz (optional)</label>
              <input
                className="form-input"
                type="text"
                placeholder="z.B. Zu spät gekommen"
                value={form.notiz}
                onChange={e => setForm(f => ({ ...f, notiz: e.target.value }))}
              />
            </div>
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Speichert…' : 'Eintrag speichern'}
          </button>
        </form>
      )}

      {/* Letzte Einträge */}
      {eintraege.length > 0 && (
        <>
          <div className="section-header">
            <h2 className="section-title">Letzte Einträge</h2>
            <span className="section-meta">{eintraege.length} gesamt</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Abend</th>
                  <th>Mitglied</th>
                  <th>Kategorie</th>
                  <th>Wert</th>
                  <th>Notiz</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {eintraege.slice(0, 50).map(e => (
                  <tr key={e.id}>
                    <td style={{ fontSize: 13, color: 'var(--ink-muted)' }}>
                      {e.kegelabende ? formatDatum(e.kegelabende.datum) : '–'}
                    </td>
                    <td>{e.mitglieder?.spitzname || e.mitglieder?.name || '–'}</td>
                    <td>{e.statistik_kategorien?.name || '–'}</td>
                    <td style={{ fontFamily: 'var(--serif)', fontSize: 16 }}>
                      {e.statistik_kategorien?.einheit === '€'
                        ? `${Number(e.wert).toFixed(2)} €`
                        : `${e.wert} ${e.statistik_kategorien?.einheit || ''}`}
                    </td>
                    <td style={{ color: 'var(--ink-muted)', fontSize: 13 }}>{e.notiz || '–'}</td>
                    <td>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(e.id)}>Löschen</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

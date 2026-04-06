import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getKategorien, getRangliste, getRanglisteDurchschnitt, getRanglisteAnwesenheit, getAnwesenheitDaten, getPudelkoenigRangliste, getKoenigRangliste } from '../lib/supabase'

const MEDALS = ['🥇', '🥈', '🥉']

function formatWert(wert, einheit, durchschnitt = false) {
  if (einheit === '€') return `${Number(wert).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}\u202f€${durchschnitt ? '\u202f/\u202fAbend' : ''}`
  return `${wert} ${einheit}`
}

function KachelRahmen({ to, index, children }) {
  return (
    <Link to={to} style={{ textDecoration: 'none' }}>
      <div style={{
        background: 'var(--paper)',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow-sm)',
        padding: '24px 28px 20px',
        animation: `fadeUp 0.5s cubic-bezier(0.4,0,0.2,1) ${index * 0.07 + 0.05}s both`,
        transition: 'box-shadow 0.2s, transform 0.2s',
        height: '100%', boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column',
      }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.transform = 'translateY(0)' }}
      >
        {children}
      </div>
    </Link>
  )
}

function KachelHeader({ name, meta }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid var(--paper-subtle)' }}>
      <span style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)', lineHeight: 1.2 }}>{name}</span>
    </div>
  )
}

function Top3Liste({ eintraege }) {
  if (eintraege.length === 0) {
    return <div style={{ fontSize: 13, color: 'var(--ink-faint)', flex: 1, display: 'flex', alignItems: 'center' }}>Noch keine Einträge</div>
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
      {eintraege.slice(0, 3).map((m, i) => (
        <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: i === 0 ? 16 : 13, width: 20, flexShrink: 0 }}>{MEDALS[i]}</span>
          <span style={{
            fontFamily: 'var(--serif)', fontSize: i === 0 ? 17 : 15,
            color: i === 0 ? 'var(--ink)' : 'var(--ink-muted)',
            flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {m.anzeigeName}
          </span>
          <span style={{ fontSize: i === 0 ? 15 : 13, color: i === 0 ? 'var(--ink)' : 'var(--ink-faint)', fontFamily: 'var(--serif)', flexShrink: 0 }}>
            {m.wert}
          </span>
        </div>
      ))}
    </div>
  )
}

function KachelFooter({ anzahl }) {
  return (
    <div style={{ marginTop: 18, paddingTop: 12, borderTop: '1px solid var(--paper-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>Details →</span>
    </div>
  )
}

function StatistikKarte({ kategorie, index }) {
  const [eintraege, setEintraege] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fn = kategorie.einheit === '€' ? getRanglisteDurchschnitt : getRangliste
    fn(kategorie.id).then(d => {
      setEintraege(d.map(m => ({
        id: m.id,
        anzeigeName: m.spitzname || m.name,
        wert: formatWert(m.gesamt, kategorie.einheit, kategorie.einheit === '€'),
      })))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [kategorie.id, kategorie.einheit])

  return (
    <KachelRahmen to={`/rangliste/${kategorie.id}`} index={index}>
      <KachelHeader name={kategorie.name} meta={kategorie.einheit} />
      {loading
        ? <div style={{ fontSize: 13, color: 'var(--ink-faint)', flex: 1 }}>Lade…</div>
        : <Top3Liste eintraege={eintraege} />
      }
      <KachelFooter anzahl={eintraege.length} />
    </KachelRahmen>
  )
}

function EhrentitelKarte({ name, to, ladefn, index }) {
  const [eintraege, setEintraege] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ladefn().then(d => {
      setEintraege(d.map(m => ({ id: m.id, anzeigeName: m.spitzname || m.name, wert: `${m.gesamt}×` })))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  return (
    <KachelRahmen to={to} index={index}>
      <KachelHeader name={name} />
      {loading
        ? <div style={{ fontSize: 13, color: 'var(--ink-faint)', flex: 1 }}>Lade…</div>
        : <Top3Liste eintraege={eintraege} />
      }
      <KachelFooter anzahl={eintraege.length} />
    </KachelRahmen>
  )
}

function AnwesenheitKarte({ index }) {
  const [eintraege, setEintraege] = useState([])
  const [anzahlAbende, setAnzahlAbende] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getRanglisteAnwesenheit(), getAnwesenheitDaten()]).then(([rang, daten]) => {
      setAnzahlAbende(daten.abende.length)
      setEintraege(rang.map(m => ({
        id: m.id,
        anzeigeName: m.spitzname || m.name,
        wert: daten.abende.length > 0
          ? `${Math.round(m.gesamt / daten.abende.length * 100)} %`
          : `${m.gesamt}`,
      })))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  return (
    <KachelRahmen to="/rangliste/anwesenheit" index={index}>
      <KachelHeader name="Anwesenheit" meta={`${anzahlAbende} Abende`} />
      {loading
        ? <div style={{ fontSize: 13, color: 'var(--ink-faint)', flex: 1 }}>Lade…</div>
        : <Top3Liste eintraege={eintraege} />
      }
      <KachelFooter anzahl={eintraege.length} />
    </KachelRahmen>
  )
}

export default function Rangliste() {
  const [kategorien, setKategorien] = useState([])
  const [loading, setLoading] = useState(true)
  const [aktiverTab, setAktiverTab] = useState('Alle')

  useEffect(() => {
    getKategorien().then(k => { setKategorien(k); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const tabs = ['Alle', 'Allgemein', 'Spiele']
  const gefilterteKategorien = aktiverTab === 'Alle' ? kategorien
    : kategorien.filter(k => (k.gruppe || 'Allgemein') === aktiverTab)
  const zeigeAnwesenheit = aktiverTab === 'Alle' || aktiverTab === 'Allgemein'

  return (
    <div className="page">
      <div className="section-header">
        <h2 className="section-title">Statistiken</h2>
      </div>

      {!loading && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
          {tabs.map(g => (
            <button key={g} onClick={() => setAktiverTab(g)} style={{
              padding: '6px 14px', borderRadius: 99, border: '1px solid',
              borderColor: aktiverTab === g ? 'var(--ink)' : 'var(--paper-mid)',
              background: aktiverTab === g ? 'var(--ink)' : 'transparent',
              color: aktiverTab === g ? 'var(--paper)' : 'var(--ink-muted)',
              fontSize: 12, letterSpacing: '0.04em', cursor: 'pointer',
              transition: 'all 0.15s',
            }}>
              {g}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="empty"><p style={{ color: 'var(--ink-faint)' }}>Lade…</p></div>
      ) : kategorien.length === 0 ? (
        <div className="empty">
          <p className="empty-title">Noch keine Kategorien</p>
          <p style={{ fontSize: 14 }}>Lege unter „Verwaltung" eine Statistik-Kategorie an.</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {gefilterteKategorien.map((kat, i) => <StatistikKarte key={kat.id} kategorie={kat} index={i} />)}
            {zeigeAnwesenheit && <AnwesenheitKarte index={gefilterteKategorien.length} />}
            {zeigeAnwesenheit && <EhrentitelKarte name="Pudelkönig" to="/rangliste/pudelkoenig" ladefn={getPudelkoenigRangliste} index={gefilterteKategorien.length + 1} />}
            {zeigeAnwesenheit && <EhrentitelKarte name="König" to="/rangliste/koenig" ladefn={getKoenigRangliste} index={gefilterteKategorien.length + 2} />}
          </div>

          <div style={{ textAlign: 'center', marginTop: 40, marginBottom: 16 }}>
            <Link to="/vergleich" className="btn btn-primary" style={{ fontSize: 12, letterSpacing: '0.08em' }}>
              Vergleich von Mitgliedern →
            </Link>
          </div>
        </>
      )}
    </div>
  )
}

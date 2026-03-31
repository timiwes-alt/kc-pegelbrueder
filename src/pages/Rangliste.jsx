import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getKategorien, getRangliste, getRanglisteDurchschnitt, getRanglisteAnwesenheit, getAnwesenheitDaten } from '../lib/supabase'

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
      <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)', paddingTop: 5 }}>{meta}</span>
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
      <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{anzahl} Mitglieder</span>
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

  useEffect(() => {
    getKategorien().then(k => { setKategorien(k); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  return (
    <div className="page">
      <div className="section-header">
        <h2 className="section-title">Statistiken</h2>
        <span className="section-meta">Alle Kategorien</span>
      </div>

      {loading ? (
        <div className="empty"><p style={{ color: 'var(--ink-faint)' }}>Lade…</p></div>
      ) : kategorien.length === 0 ? (
        <div className="empty">
          <p className="empty-title">Noch keine Kategorien</p>
          <p style={{ fontSize: 14 }}>Lege unter „Verwaltung" eine Statistik-Kategorie an.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {kategorien.map((kat, i) => <StatistikKarte key={kat.id} kategorie={kat} index={i} />)}
          <AnwesenheitKarte index={kategorien.length} />
        </div>
      )}
    </div>
  )
}

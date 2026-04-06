import { useNavigate } from 'react-router-dom'

const MEDALS = ['🥇', '🥈', '🥉', '4.', '5.']

export function MvpLadderCard({ item }) {
  return (
    <div>
      <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 8 }}>
        MVP Race · Saison {item.saison}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {(item.entries || []).map((e, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: i < 3 ? 15 : 12, minWidth: 22, textAlign: 'center', lineHeight: 1, flexShrink: 0 }}>{MEDALS[i] ?? `${i + 1}.`}</span>
            <span style={{ fontSize: 13, fontWeight: i === 0 ? 500 : 400, color: i === 0 ? 'var(--ink)' : 'var(--ink-muted)', minWidth: 56, flexShrink: 0 }}>{e.name}</span>
            <span style={{ fontSize: 12, color: 'var(--ink-faint)', lineHeight: 1.35 }}>{e.reason}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function HeadToHeadCard({ item }) {
  const { player1, player2, context, stats = [] } = item
  return (
    <div>
      <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: context ? 2 : 10 }}>
        Head-to-Head
      </div>
      {context && <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginBottom: 10 }}>{context}</div>}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--ink)' }}>{player1}</span>
        <span style={{ fontSize: 10, color: 'var(--ink-faint)' }}>vs</span>
        <span style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--ink)' }}>{player2}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {stats.map((s, i) => {
          const v1 = Number(s.v1) || 0
          const v2 = Number(s.v2) || 0
          const max = Math.max(v1, v2, 0.001)
          const p1wins = s.lowerIsBetter ? v1 < v2 : v1 > v2
          const p2wins = s.lowerIsBetter ? v2 < v1 : v2 > v1
          const fmtVal = v => s.einheit === '€' ? `${Number(v).toFixed(2)} €` : String(Math.round(v * 10) / 10)
          return (
            <div key={i}>
              <div style={{ fontSize: 10, color: 'var(--ink-faint)', textAlign: 'center', marginBottom: 5, letterSpacing: '0.04em' }}>{s.label}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 8px 1fr', alignItems: 'center', gap: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                  <span style={{ fontSize: 12, color: p1wins ? 'var(--ink)' : 'var(--ink-faint)', fontWeight: p1wins ? 500 : 400 }}>{fmtVal(v1)}</span>
                  <div style={{ width: 56, height: 5, borderRadius: 99, background: 'var(--paper-subtle)', overflow: 'hidden', display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ height: '100%', width: `${(v1 / max) * 100}%`, borderRadius: 99, background: p1wins ? 'var(--ink)' : '#c0bcb5' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--paper-mid)' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 56, height: 5, borderRadius: 99, background: 'var(--paper-subtle)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(v2 / max) * 100}%`, borderRadius: 99, background: p2wins ? 'var(--ink)' : '#c0bcb5' }} />
                  </div>
                  <span style={{ fontSize: 12, color: p2wins ? 'var(--ink)' : 'var(--ink-faint)', fontWeight: p2wins ? 500 : 400 }}>{fmtVal(v2)}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function ShareCard({ item, navigate, bisDatum }) {
  const { content, share, label, link } = item
  const pct = Math.round((share || 0) * 100)
  const dest = link && bisDatum ? `${link}?bis=${bisDatum}` : link
  const clickable = dest && navigate
  return (
    <div
      onClick={clickable ? e => { e.stopPropagation(); navigate(dest) } : undefined}
      style={{ cursor: clickable ? 'pointer' : 'default' }}
    >
      <div style={{ fontSize: 13, color: 'var(--ink-muted)', lineHeight: 1.45, marginBottom: 10 }}>{content}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, height: 5, borderRadius: 99, background: 'var(--paper-subtle)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: 'var(--ink)' }} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', minWidth: 32, textAlign: 'right' }}>{pct}%</span>
      </div>
      {label && <div style={{ fontSize: 10, color: 'var(--ink-faint)', marginTop: 5, letterSpacing: '0.03em' }}>{label}</div>}
      {clickable && <div style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginTop: 6 }}>Rangliste ansehen →</div>}
    </div>
  )
}

export function CorrelationCard({ item }) {
  const { player1, player2, content } = item
  return (
    <div>
      <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 10 }}>
        Spieler-Korrelation
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--ink)' }}>{player1}</span>
        <span style={{ fontSize: 13, color: 'var(--ink-faint)', lineHeight: 1 }}>↔</span>
        <span style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--ink)' }}>{player2}</span>
      </div>
      <div style={{ fontSize: 13, color: 'var(--ink-muted)', lineHeight: 1.5 }}>{content}</div>
    </div>
  )
}

export function HighlightCard({ item, bisDatum }) {
  const navigate = useNavigate()
  const n = typeof item === 'string' ? { type: 'text', content: item } : item
  switch (n.type) {
    case 'mvp_ladder': return <MvpLadderCard item={n} />
    case 'head_to_head': return <HeadToHeadCard item={n} />
    case 'share': return <ShareCard item={n} navigate={navigate} bisDatum={bisDatum} />
    case 'correlation': return <CorrelationCard item={n} />
    default: {
      if (n.link) {
        const dest = bisDatum ? `${n.link}?bis=${bisDatum}` : n.link
        return (
          <div
            onClick={e => { e.stopPropagation(); navigate(dest) }}
            style={{ fontSize: 13, color: 'var(--ink-muted)', lineHeight: 1.45, cursor: 'pointer' }}
          >
            <span style={{ borderBottom: '1px solid var(--paper-mid)' }}>{n.content}</span>
            <span style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginLeft: 6 }}>→</span>
          </div>
        )
      }
      return <div style={{ fontSize: 13, color: 'var(--ink-muted)', lineHeight: 1.45 }}>{n.content}</div>
    }
  }
}

import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fehler, setFehler] = useState(null)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from || '/'

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setFehler(null)
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch {
      setFehler('Falsche E-Mail oder falsches Passwort.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '0 auto', padding: '80px 24px' }}>
      <h2 style={{ fontFamily: 'var(--serif)', fontSize: 30, marginBottom: 8, letterSpacing: '-0.02em' }}>
        Anmelden
      </h2>
      <p style={{ fontSize: 14, color: 'var(--ink-muted)', marginBottom: 32 }}>
        Nur für Admins sichtbar.
      </p>

      {fehler && <div className="alert alert-error">{fehler}</div>}

      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
          <div className="form-group">
            <label className="form-label">E-Mail</label>
            <input
              className="form-input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Passwort</label>
            <input
              className="form-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
        </div>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Anmelden…' : 'Anmelden'}
        </button>
      </form>
    </div>
  )
}

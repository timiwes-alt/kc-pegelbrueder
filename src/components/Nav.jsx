import { useState, useEffect, useRef } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Nav() {
  const { isAdmin, loading, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [atTop, setAtTop] = useState(true)
  const adminRef = useRef(null)

  const isHome = location.pathname === '/'
  const transparent = isHome && atTop

  useEffect(() => {
    if (!isHome) { setAtTop(false); return }
    setAtTop(window.scrollY < 60)
    const onScroll = () => setAtTop(window.scrollY < 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [isHome])

  useEffect(() => { setMenuOpen(false); setAdminOpen(false) }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  useEffect(() => {
    function onClickOutside(e) {
      if (adminRef.current && !adminRef.current.contains(e.target)) setAdminOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  const linkClass = ({ isActive }) => isActive ? 'active' : ''

  return (
    <>
      <nav className={`nav${transparent ? ' nav--transparent' : ''}`}>
        <NavLink to="/" className="nav-logo">
          <img src="/logo2.png" alt="Logo" />
        </NavLink>

        <ul className="nav-links">
          <li><NavLink to="/rangliste" className={linkClass}>Statistiken</NavLink></li>
          <li><NavLink to="/kegelabende" className={linkClass}>Abende</NavLink></li>

          {/* Admin-Bereich: kleines ··· Menü */}
          {!loading && isAdmin && (
            <li ref={adminRef} style={{ position: 'relative' }}>
              <button
                className="nav-admin-toggle"
                onClick={() => setAdminOpen(o => !o)}
                aria-label="Admin-Menü"
                style={{ color: adminOpen ? (transparent ? '#fff' : 'var(--ink)') : undefined }}
              >
                ···
              </button>
              {adminOpen && (
                <div className="nav-admin-dropdown">
                  <NavLink to="/eintragen" className={linkClass}>Eintragen</NavLink>
                  <NavLink to="/mitglieder" className={linkClass}>Mitglieder</NavLink>
                  <NavLink to="/verwaltung" className={linkClass}>Verwaltung</NavLink>
                  <div className="nav-admin-divider" />
                  <button onClick={handleLogout}>Abmelden</button>
                </div>
              )}
            </li>
          )}
        </ul>

        <button
          className={`nav-toggle${menuOpen ? ' open' : ''}`}
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Menü öffnen"
        >
          <span /><span /><span />
        </button>
      </nav>

      <div className={`nav-mobile-menu${menuOpen ? ' open' : ''}`}>
        <NavLink to="/rangliste" className={linkClass}>Statistiken</NavLink>
        <NavLink to="/kegelabende" className={linkClass}>Abende</NavLink>
        {!loading && isAdmin && (
          <>
            <div className="nav-mobile-divider" />
            <NavLink to="/eintragen" className={linkClass}>Eintragen</NavLink>
            <NavLink to="/mitglieder" className={linkClass}>Mitglieder</NavLink>
            <NavLink to="/verwaltung" className={linkClass}>Verwaltung</NavLink>
            <button className="nav-mobile-logout" onClick={handleLogout}>Abmelden</button>
          </>
        )}
        {!loading && !isAdmin && (
          <NavLink to="/login" className={({ isActive }) => `nav-mobile-admin-link${isActive ? ' active' : ''}`}>Admin</NavLink>
        )}
      </div>
    </>
  )
}

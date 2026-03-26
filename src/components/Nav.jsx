import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Nav() {
  const { isAdmin, loading, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [atTop, setAtTop] = useState(true)

  const isHome = location.pathname === '/'

  // Transparent only on homepage when at very top
  useEffect(() => {
    if (!isHome) { setAtTop(false); return }
    setAtTop(window.scrollY < 60)
    const onScroll = () => setAtTop(window.scrollY < 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [isHome])

  // Close menu on route change
  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  const linkClass = ({ isActive }) => isActive ? 'active' : ''
  const transparent = isHome && atTop

  return (
    <>
      <nav className={`nav${transparent ? ' nav--transparent' : ''}`}>
        <NavLink to="/" className="nav-logo">
          <img src="/logo2.png" alt="Logo" />
        </NavLink>

        <ul className="nav-links">
          <li><NavLink to="/" end className={linkClass}>Start</NavLink></li>
          <li><NavLink to="/kegelabende" className={linkClass}>Abende</NavLink></li>
          <li><NavLink to="/rangliste" className={linkClass}>Rangliste</NavLink></li>
          {!loading && isAdmin && (
            <>
              <li><NavLink to="/eintragen" className={linkClass}>Eintragen</NavLink></li>
              <li><NavLink to="/mitglieder" className={linkClass}>Mitglieder</NavLink></li>
              <li><NavLink to="/verwaltung" className={linkClass}>Verwaltung</NavLink></li>
              <li><button className="nav-logout-btn" onClick={handleLogout}>Abmelden</button></li>
            </>
          )}
          {!loading && !isAdmin && (
            <li><NavLink to="/login" className={linkClass}>Admin</NavLink></li>
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
        <NavLink to="/" end className={linkClass}>Start</NavLink>
        <NavLink to="/kegelabende" className={linkClass}>Abende</NavLink>
        <NavLink to="/rangliste" className={linkClass}>Rangliste</NavLink>
        {!loading && isAdmin && (
          <>
            <NavLink to="/eintragen" className={linkClass}>Eintragen</NavLink>
            <NavLink to="/mitglieder" className={linkClass}>Mitglieder</NavLink>
            <NavLink to="/verwaltung" className={linkClass}>Verwaltung</NavLink>
            <button className="nav-mobile-logout" onClick={handleLogout}>Abmelden</button>
          </>
        )}
        {!loading && !isAdmin && (
          <NavLink to="/login" className={linkClass}>Admin</NavLink>
        )}
      </div>
    </>
  )
}

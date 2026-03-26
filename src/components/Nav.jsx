import { NavLink } from 'react-router-dom'

export default function Nav() {
  return (
    <nav className="nav">
      <NavLink to="/" className="nav-logo">
        <img src="/logo2.png" alt="KC Pegelbrüder Logo" />
        <span className="nav-title">KC Pegelbrüder</span>
      </NavLink>
      <ul className="nav-links">
        <li><NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>Start</NavLink></li>
        <li><NavLink to="/kegelabende" className={({ isActive }) => isActive ? 'active' : ''}>Abende</NavLink></li>
        <li><NavLink to="/rangliste" className={({ isActive }) => isActive ? 'active' : ''}>Rangliste</NavLink></li>
        <li><NavLink to="/eintragen" className={({ isActive }) => isActive ? 'active' : ''}>Eintragen</NavLink></li>
        <li><NavLink to="/mitglieder" className={({ isActive }) => isActive ? 'active' : ''}>Mitglieder</NavLink></li>
        <li><NavLink to="/verwaltung" className={({ isActive }) => isActive ? 'active' : ''}>Verwaltung</NavLink></li>
      </ul>
    </nav>
  )
}

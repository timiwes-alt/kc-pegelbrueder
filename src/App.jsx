import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Nav from './components/Nav.jsx'
import Home from './pages/Home.jsx'
import Rangliste from './pages/Rangliste.jsx'
import RanglisteDetail from './pages/RanglisteDetail.jsx'
import MitgliedDetail from './pages/MitgliedDetail.jsx'
import Kegelabende from './pages/Kegelabende.jsx'
import KegelabendDetail from './pages/KegelabendDetail.jsx'
import Eintragen from './pages/Eintragen.jsx'
import Mitglieder from './pages/Mitglieder.jsx'
import Verwaltung from './pages/Verwaltung.jsx'
import Login from './pages/Login.jsx'

export default function App() {
  return (
    <AuthProvider>
      <Nav />
      <Routes>
        {/* Öffentliche Seiten */}
        <Route path="/" element={<Home />} />
        <Route path="/kegelabende" element={<Kegelabende />} />
        <Route path="/kegelabend/:kegelabendId" element={<KegelabendDetail />} />
        <Route path="/rangliste" element={<Rangliste />} />
        <Route path="/rangliste/:kategorieId" element={<RanglisteDetail />} />
        <Route path="/mitglied/:mitgliedId" element={<MitgliedDetail />} />
        <Route path="/login" element={<Login />} />

        {/* Nur für Admins */}
        <Route path="/eintragen" element={<ProtectedRoute><Eintragen /></ProtectedRoute>} />
        <Route path="/mitglieder" element={<ProtectedRoute><Mitglieder /></ProtectedRoute>} />
        <Route path="/verwaltung" element={<ProtectedRoute><Verwaltung /></ProtectedRoute>} />
      </Routes>
    </AuthProvider>
  )
}

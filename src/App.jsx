import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Nav from './components/Nav.jsx'
import Home from './pages/Home.jsx'
import Rangliste from './pages/Rangliste.jsx'
import RanglisteDetail from './pages/RanglisteDetail.jsx'
import AnwesenheitDetail from './pages/AnwesenheitDetail.jsx'
import EhrentitelDetail from './pages/EhrentitelDetail.jsx'
import MitgliedDetail from './pages/MitgliedDetail.jsx'
import MitgliedStatistikDetail from './pages/MitgliedStatistikDetail.jsx'
import MitgliedAnwesenheitDetail from './pages/MitgliedAnwesenheitDetail.jsx'
import MitgliedEhrentitelDetail from './pages/MitgliedEhrentitelDetail.jsx'
import Kegelabende from './pages/Kegelabende.jsx'
import KegelabendDetail from './pages/KegelabendDetail.jsx'
import Eintragen from './pages/Eintragen.jsx'
import Mitglieder from './pages/Mitglieder.jsx'
import Verwaltung from './pages/Verwaltung.jsx'
import Vergleich from './pages/Vergleich.jsx'
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
        <Route path="/rangliste/anwesenheit" element={<AnwesenheitDetail />} />
        <Route path="/rangliste/pudelkoenig" element={<EhrentitelDetail typ="pudelkoenig" />} />
        <Route path="/rangliste/koenig" element={<EhrentitelDetail typ="koenig" />} />
        <Route path="/rangliste/:kategorieId" element={<RanglisteDetail />} />
        <Route path="/mitglied/:mitgliedId" element={<MitgliedDetail />} />
        <Route path="/mitglied/:mitgliedId/statistik/:kategorieId" element={<MitgliedStatistikDetail />} />
        <Route path="/mitglied/:mitgliedId/anwesenheit" element={<MitgliedAnwesenheitDetail />} />
        <Route path="/mitglied/:mitgliedId/ehrentitel/:typ" element={<MitgliedEhrentitelDetail />} />
        <Route path="/vergleich" element={<Vergleich />} />
        <Route path="/login" element={<Login />} />

        {/* Nur für Admins */}
        <Route path="/eintragen" element={<ProtectedRoute><Eintragen /></ProtectedRoute>} />
        <Route path="/mitglieder" element={<ProtectedRoute><Mitglieder /></ProtectedRoute>} />
        <Route path="/verwaltung" element={<ProtectedRoute><Verwaltung /></ProtectedRoute>} />
      </Routes>
    </AuthProvider>
  )
}

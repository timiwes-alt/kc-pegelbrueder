import { Routes, Route } from 'react-router-dom'
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

export default function App() {
  return (
    <>
      <Nav />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/rangliste" element={<Rangliste />} />
        <Route path="/rangliste/:kategorieId" element={<RanglisteDetail />} />
        <Route path="/mitglied/:mitgliedId" element={<MitgliedDetail />} />
        <Route path="/kegelabende" element={<Kegelabende />} />
        <Route path="/kegelabend/:kegelabendId" element={<KegelabendDetail />} />
        <Route path="/eintragen" element={<Eintragen />} />
        <Route path="/mitglieder" element={<Mitglieder />} />
        <Route path="/verwaltung" element={<Verwaltung />} />
      </Routes>
    </>
  )
}

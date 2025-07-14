import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { RegistrosPage } from './pages/RegistrosPage';
import { SalidasPage } from './pages/SalidasPage';
import { VentasPage } from './pages/VentasPage';

function App() {
  return (
    <div>
      <Router>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/registros" element={<RegistrosPage />} />
          <Route path="/salidas" element={<SalidasPage />} />
          <Route path="/ventas" element={<VentasPage />} />
        </Routes>
      </Router>
    </div>
  );
}
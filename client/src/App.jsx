import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { VotePage } from './pages/VotePage';
import { AdminLogin } from './pages/AdminLogin';
import { AdminDashboard } from './pages/AdminDashboard';
import { SessionDetail } from './pages/SessionDetail';
import './styles/lof-design-system.css';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/vote/:sessionId" element={<VotePage />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/sessions/:id" element={<SessionDetail />} />
        <Route path="/" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || '';

export function AdminLogin() {
  const [sessionId, setSessionId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionId.trim(), password }),
      });
      if (!res.ok) {
        setError('Invalid Session ID or password.');
        return;
      }
      const { token } = await res.json();
      localStorage.setItem('admin_token', token);
      localStorage.setItem('admin_session_id', sessionId.trim());
      navigate('/admin/dashboard');
    } catch {
      setError('Login failed. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <p className="eyebrow" style={{ marginBottom: 8 }}>LOF INTERNAL</p>
          <div style={{ width: 40, height: 2, background: 'var(--brand)', margin: '0 auto 16px' }} />
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            3D VIEWER ADMIN
          </h1>
        </div>

        <form className="card" style={{ padding: 32 }} onSubmit={handleSubmit}>
          <label className="label">SESSION ID</label>
          <input
            className="input"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            placeholder="Paste session ID here"
            style={{ marginBottom: 14 }}
            required
          />

          <label className="label">PASSWORD</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter session password"
            style={{ marginBottom: 20 }}
            required
          />

          {error && (
            <div style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--accent)', marginBottom: 16 }}>
              {error}
            </div>
          )}

          <button className="btn btn-primary" type="submit" style={{ width: '100%', padding: 13 }} disabled={loading}>
            {loading ? 'SIGNING IN...' : 'SIGN IN →'}
          </button>
        </form>
      </div>
    </div>
  );
}

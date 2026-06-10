import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || '';

export function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      if (!res.ok) {
        setError('Invalid username or password.');
        return;
      }
      const { token } = await res.json();
      if (!token) throw new Error('No token received');
      localStorage.setItem('admin_token', token);
      navigate('/admin/dashboard');
    } catch {
      setError('Login failed. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <p className="eyebrow" style={{ marginBottom: 8 }}>3D MODEL REVIEW</p>
          <div style={{ width: 40, height: 2, background: 'var(--brand)', margin: '0 auto 16px' }} />
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            PROTOVIEW
          </h1>
        </div>

        <form className="card" style={{ padding: 32 }} onSubmit={handleSubmit}>
          <label className="label">USERNAME</label>
          <input
            className="input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="admin"
            autoComplete="username"
            style={{ marginBottom: 14 }}
            required
          />

          <label className="label">PASSWORD</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            autoComplete="current-password"
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

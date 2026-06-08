import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RankingsTable } from '../components/RankingsTable';

const API = import.meta.env.VITE_API_URL || '';

export function AdminDashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem('admin_token');
  const sessionId = localStorage.getItem('admin_session_id');

  const [session, setSession] = useState(null);
  const [models, setModels] = useState([]);
  const [results, setResults] = useState([]);
  const [newModel, setNewModel] = useState({ name: '', sketchfabEmbedUrl: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const loadData = useCallback(async () => {
    try {
      const [sessionRes, resultsRes] = await Promise.all([
        fetch(`${API}/api/sessions/${sessionId}`),
        fetch(`${API}/api/admin/sessions/${sessionId}/results`, { headers: authHeaders }),
      ]);
      if (sessionRes.status === 401 || resultsRes.status === 401) {
        navigate('/admin');
        return;
      }
      const sessionData = await sessionRes.json();
      const resultsData = await resultsRes.json();
      setSession(sessionData.session);
      setModels(sessionData.models || []);
      setResults(resultsData.results || []);
    } catch {
      setError('Failed to load data. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, [sessionId, navigate]);

  useEffect(() => {
    if (!token || !sessionId) { navigate('/admin'); return; }
    loadData();
  }, [token, sessionId, navigate, loadData]);

  const updateStatus = async (status) => {
    setError('');
    const res = await fetch(`${API}/api/admin/sessions/${sessionId}/status`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ status }),
    });
    if (res.ok) loadData();
    else setError('Failed to update status.');
  };

  const addModel = async (e) => {
    e.preventDefault();
    setError('');
    const res = await fetch(`${API}/api/admin/sessions/${sessionId}/models`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(newModel),
    });
    if (res.ok) {
      setNewModel({ name: '', sketchfabEmbedUrl: '' });
      loadData();
    } else {
      const data = await res.json();
      setError(data.error || 'Failed to add model.');
    }
  };

  const deleteModel = async (modelId) => {
    setError('');
    const res = await fetch(`${API}/api/admin/sessions/${sessionId}/models/${modelId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    if (res.ok) loadData();
    else setError('Failed to delete model.');
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_session_id');
    navigate('/admin');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="eyebrow">Loading...</p>
      </div>
    );
  }

  const shareLink = `${window.location.origin}/vote/${sessionId}`;
  const isOpen = session?.status === 'open';

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', padding: 32 }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        {/* Header */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
          <div>
            <p className="eyebrow">LOF INTERNAL</p>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 900, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              3D Viewer Admin
            </h1>
          </div>
          <button className="btn btn-neutral" style={{ fontSize: 11, padding: '8px 16px' }} onClick={logout}>
            Sign Out
          </button>
        </header>

        {error && (
          <div style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 'var(--radius-md)', padding: '10px 16px', fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--accent)', marginBottom: 20 }}>
            {error}
          </div>
        )}

        {/* Session control */}
        <div className="card" style={{ padding: 28, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <h2 className="card-title">{session?.name}</h2>
            <span className={`badge ${isOpen ? 'badge-live' : 'badge-soon'}`}>
              {isOpen ? 'OPEN' : 'CLOSED'}
            </span>
          </div>

          <p className="body-text" style={{ marginBottom: 16 }}>
            Share link:{' '}
            <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--brand)', background: 'var(--brand-bg)', padding: '2px 8px', borderRadius: 4 }}>
              {shareLink}
            </code>{' '}
            <button
              className="btn btn-ghost"
              style={{ fontSize: 10, padding: '4px 12px', marginLeft: 8 }}
              onClick={() => navigator.clipboard.writeText(shareLink)}
            >
              COPY
            </button>
          </p>

          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-primary" onClick={() => updateStatus('open')} disabled={isOpen}>
              Open Voting
            </button>
            <button className="btn btn-neutral" onClick={() => updateStatus('closed')} disabled={!isOpen}>
              Close Voting
            </button>
          </div>
        </div>

        {/* Rankings */}
        <div className="card" style={{ padding: 28, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 className="card-title">Rankings</h2>
            <button className="btn btn-ghost" style={{ fontSize: 10, padding: '6px 14px' }} onClick={loadData}>
              Refresh
            </button>
          </div>
          <RankingsTable results={results} />
        </div>

        {/* Models */}
        <div className="card" style={{ padding: 28 }}>
          <h2 className="card-title" style={{ marginBottom: 20 }}>Models</h2>

          {models.length === 0 && (
            <p className="body-text" style={{ color: 'var(--text-muted)', marginBottom: 16 }}>No models added yet.</p>
          )}

          {models.map((m) => (
            <div
              key={m._id}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}
            >
              <div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)', marginRight: 8 }}>
                  {m.order}.
                </span>
                <span className="card-title" style={{ fontSize: 13 }}>{m.name}</span>
              </div>
              <button
                className="btn btn-neutral"
                style={{ fontSize: 10, padding: '4px 12px' }}
                onClick={() => deleteModel(m._id)}
                disabled={isOpen}
              >
                Delete
              </button>
            </div>
          ))}

          <form onSubmit={addModel} style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 160px' }}>
              <label className="label">MODEL NAME</label>
              <input
                className="input"
                placeholder="e.g. Heat Seek Rover"
                value={newModel.name}
                onChange={(e) => setNewModel((p) => ({ ...p, name: e.target.value }))}
                required
                disabled={isOpen}
              />
            </div>
            <div style={{ flex: '2 1 280px' }}>
              <label className="label">SKETCHFAB EMBED URL</label>
              <input
                className="input"
                placeholder="https://sketchfab.com/models/.../embed"
                value={newModel.sketchfabEmbedUrl}
                onChange={(e) => setNewModel((p) => ({ ...p, sketchfabEmbedUrl: e.target.value }))}
                required
                disabled={isOpen}
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={isOpen} style={{ flexShrink: 0 }}>
              + Add Model
            </button>
          </form>
          {isOpen && (
            <p className="body-text" style={{ marginTop: 8, color: 'var(--text-muted)' }}>
              Close voting to add or remove models.
            </p>
          )}
        </div>

      </div>
    </div>
  );
}

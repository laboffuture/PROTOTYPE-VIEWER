import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../components/AdminLayout';

const API = import.meta.env.VITE_API_URL || '';

export function AdminDashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem('admin_token');

  const [sessions, setSessions] = useState([]);
  const [newSessionName, setNewSessionName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [copySourceId, setCopySourceId] = useState('');
  const [sourceModels, setSourceModels] = useState([]);
  const [selectedModelIds, setSelectedModelIds] = useState([]);

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/sessions`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) { navigate('/admin'); return; }
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch {
      setError('Failed to load batches. Check your connection and refresh.');
    }
  }, [token, navigate]);

  useEffect(() => {
    if (!token) { navigate('/admin'); return; }
    loadSessions().finally(() => setLoading(false));
  }, [token, navigate, loadSessions]);

  // Pick a source batch to copy prototypes from (e.g. the model library)
  const selectCopySource = async (sourceId) => {
    setCopySourceId(sourceId);
    setSelectedModelIds([]);
    if (!sourceId) { setSourceModels([]); return; }
    try {
      const res = await fetch(`${API}/api/sessions/${sourceId}`);
      const data = await res.json();
      setSourceModels(data.models || []);
    } catch {
      setSourceModels([]);
      setError('Failed to load prototypes from that batch.');
    }
  };

  const toggleModel = (modelId) => {
    setSelectedModelIds((prev) =>
      prev.includes(modelId) ? prev.filter((id) => id !== modelId) : [...prev, modelId]
    );
  };

  const createSession = async (e) => {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      const body = { name: newSessionName.trim() };
      if (selectedModelIds.length) body.copyModelIds = selectedModelIds;
      const res = await fetch(`${API}/api/admin/sessions`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(body),
      });
      if (res.status === 401) { navigate('/admin'); return; }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to create batch.');
        return;
      }
      const created = await res.json();
      setNewSessionName('');
      setCopySourceId('');
      setSourceModels([]);
      setSelectedModelIds([]);
      navigate(`/admin/sessions/${created.id}`);
    } catch {
      setError('Failed to create batch.');
    } finally {
      setCreating(false);
    }
  };

  const copyLink = (id) => {
    navigator.clipboard.writeText(`${window.location.origin}/vote/${id}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <AdminLayout crumb="Batches">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
          <p className="eyebrow">Loading...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout crumb="Batches">
      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        {/* Page title */}
        <header style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 26, fontWeight: 900, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            Batches
          </h1>
          <p className="body-text" style={{ color: 'var(--text-muted)' }}>
            Create a review batch, share its link with students, and watch results live.
          </p>
        </header>

        {error && (
          <div style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 'var(--radius-md)', padding: '10px 16px', fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--accent)', marginBottom: 20 }}>
            {error}
          </div>
        )}

        {/* New batch */}
        <form onSubmit={createSession} className="card" style={{ padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 260px' }}>
              <label className="label">NEW BATCH NAME</label>
              <input
                className="input"
                placeholder="e.g. Yellow Prototype V1 — Junior Batch"
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                required
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={creating} style={{ flexShrink: 0 }}>
              {creating ? 'Creating...' : '+ Create Batch'}
            </button>
          </div>

          {/* Optional: copy prototypes from an existing batch (e.g. the library) */}
          {sessions.some((s) => s.modelCount > 0) && (
            <div style={{ marginTop: 16 }}>
              <label className="label">COPY PROTOTYPES FROM (optional)</label>
              <select
                className="input"
                value={copySourceId}
                onChange={(e) => selectCopySource(e.target.value)}
                style={{ maxWidth: 420, display: 'block' }}
              >
                <option value="">— start empty —</option>
                {sessions.filter((s) => s.modelCount > 0).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.modelCount} prototype{s.modelCount !== 1 ? 's' : ''})
                  </option>
                ))}
              </select>

              {copySourceId && sourceModels.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <p className="body-text" style={{ color: 'var(--text-muted)', marginBottom: 8 }}>
                    Tick the prototypes to include — {selectedModelIds.length} selected
                  </p>
                  <div style={{
                    display: 'flex', flexWrap: 'wrap', gap: 8,
                    maxHeight: 220, overflowY: 'auto', padding: 4,
                  }}>
                    {sourceModels.map((m) => {
                      const checked = selectedModelIds.includes(m._id);
                      return (
                        <label
                          key={m._id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '6px 12px', cursor: 'pointer',
                            borderRadius: 'var(--radius-lg)',
                            border: `2px solid ${checked ? 'var(--brand-border)' : 'var(--border)'}`,
                            background: checked ? 'var(--brand-bg)' : 'transparent',
                            fontFamily: 'var(--font-body)', fontSize: 14,
                            color: checked ? 'var(--brand)' : 'var(--text-secondary)',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleModel(m._id)}
                            style={{ accentColor: 'var(--brand)' }}
                          />
                          {m.name}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </form>

        {/* Batch list */}
        {sessions.length === 0 ? (
          <div className="card" style={{ padding: 40, textAlign: 'center' }}>
            <p className="body-text" style={{ color: 'var(--text-muted)' }}>
              No batches yet. Create your first one above.
            </p>
          </div>
        ) : (
          sessions.map((s) => (
            <div
              key={s.id}
              className="card"
              style={{
                padding: '20px 24px', marginBottom: 12,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                flexWrap: 'wrap', gap: 12, cursor: 'pointer',
              }}
              onClick={() => navigate(`/admin/sessions/${s.id}`)}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                  <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
                    {s.name}
                  </span>
                  <span className={`badge ${s.status === 'open' ? 'badge-live' : 'badge-soon'}`}>
                    {s.status === 'open' ? '● LIVE' : 'CLOSED'}
                  </span>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                  {s.modelCount} prototype{s.modelCount !== 1 ? 's' : ''} · created {new Date(s.createdAt).toLocaleDateString()}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: 10, padding: '6px 14px' }}
                  onClick={() => copyLink(s.id)}
                >
                  {copiedId === s.id ? '✓ COPIED' : 'COPY LINK'}
                </button>
                <button
                  className="btn btn-primary"
                  style={{ fontSize: 10, padding: '6px 14px' }}
                  onClick={() => navigate(`/admin/sessions/${s.id}`)}
                >
                  OPEN →
                </button>
              </div>
            </div>
          ))
        )}

      </div>
    </AdminLayout>
  );
}

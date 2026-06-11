import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  const [library, setLibrary] = useState([]);
  const [selectedModelIds, setSelectedModelIds] = useState([]);

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const loadSessions = useCallback(async () => {
    try {
      const [sessionsRes, libraryRes] = await Promise.all([
        fetch(`${API}/api/admin/sessions`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/admin/library`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (sessionsRes.status === 401) { navigate('/admin'); return; }
      const data = await sessionsRes.json();
      const libData = await libraryRes.json().catch(() => ({}));
      setSessions(data.sessions || []);
      setLibrary(libData.prototypes || []);
    } catch {
      setError('Failed to load batches. Check your connection and refresh.');
    }
  }, [token, navigate]);

  useEffect(() => {
    if (!token) { navigate('/admin'); return; }
    loadSessions().finally(() => setLoading(false));
  }, [token, navigate, loadSessions]);

  // Selection order is kept — it becomes the order students see
  const toggleModel = (modelId) => {
    setSelectedModelIds((prev) =>
      prev.includes(modelId) ? prev.filter((id) => id !== modelId) : [...prev, modelId]
    );
  };

  const deleteBatch = async (s) => {
    const confirmed = window.confirm(
      `Delete the batch "${s.name}" along with all its prototypes and votes? This cannot be undone.`
    );
    if (!confirmed) return;
    setError('');
    const res = await fetch(`${API}/api/admin/sessions/${s.id}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    if (res.status === 401) { navigate('/admin'); return; }
    if (res.ok) loadSessions();
    else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Failed to delete batch.');
    }
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

          {/* Prototype selection — tap tiles from the library */}
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <label className="label">SELECT PROTOTYPES FROM LIBRARY</label>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 11,
                color: selectedModelIds.length ? 'var(--brand)' : 'var(--text-muted)',
              }}>
                {selectedModelIds.length} SELECTED
              </span>
            </div>

            {library.length === 0 ? (
              <p className="body-text" style={{ color: 'var(--text-muted)' }}>
                The library is empty — add prototypes on the{' '}
                <Link to="/admin/prototypes" style={{ color: 'var(--brand)' }}>Prototypes</Link> page first,
                or create an empty batch and add models manually.
              </p>
            ) : (
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
                gap: 10, maxHeight: 320, overflowY: 'auto', padding: 4,
              }}>
                {library.map((p) => {
                  const pickIndex = selectedModelIds.indexOf(p.id);
                  const picked = pickIndex !== -1;
                  return (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => toggleModel(p.id)}
                      style={{
                        position: 'relative', textAlign: 'left', cursor: 'pointer',
                        padding: '12px 14px', borderRadius: 'var(--radius-lg)',
                        border: `2px solid ${picked ? 'var(--brand)' : 'var(--border)'}`,
                        background: picked ? 'var(--brand-bg)' : 'var(--bg-white)',
                        boxShadow: picked ? 'var(--brand-glow)' : 'none',
                        transition: 'border-color 150ms, background 150ms, box-shadow 150ms',
                      }}
                    >
                      {picked && (
                        <span style={{
                          position: 'absolute', top: 8, right: 8,
                          minWidth: 20, height: 20, padding: '0 5px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          borderRadius: 10, background: 'var(--brand)', color: '#fff',
                          fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
                        }}>
                          {pickIndex + 1}
                        </span>
                      )}
                      <p style={{
                        fontFamily: 'var(--font-heading)', fontSize: 12, fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.04em',
                        color: picked ? 'var(--brand)' : 'var(--text-primary)',
                        marginBottom: 4, paddingRight: picked ? 24 : 0,
                      }}>
                        {p.name}
                      </p>
                      <p className="body-text" style={{
                        fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>
                        {p.description || '—'}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}

            {selectedModelIds.length > 0 && (
              <p className="body-text" style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                The numbers show the order students will see them in. Tap again to deselect.
              </p>
            )}
          </div>
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
                {s.status !== 'open' && (
                  <button
                    className="btn"
                    style={{
                      fontSize: 10, padding: '6px 14px',
                      background: 'var(--accent-bg)', border: '2px solid var(--accent-border)', color: 'var(--accent)',
                    }}
                    onClick={() => deleteBatch(s)}
                    title="Delete this batch"
                  >
                    DELETE
                  </button>
                )}
              </div>
            </div>
          ))
        )}

      </div>
    </AdminLayout>
  );
}

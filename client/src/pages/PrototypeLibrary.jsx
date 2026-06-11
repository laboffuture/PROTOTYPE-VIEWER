import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../components/AdminLayout';

const API = import.meta.env.VITE_API_URL || '';

const EMPTY_FORM = { name: '', sketchfabEmbedUrl: '', description: '' };

export function PrototypeLibrary() {
  const navigate = useNavigate();
  const token = localStorage.getItem('admin_token');

  const [prototypes, setPrototypes] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const handleFailure = async (res, fallback) => {
    if (res.status === 401) { navigate('/admin'); return; }
    const data = await res.json().catch(() => ({}));
    setError(data.error || fallback);
  };

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/library`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) { navigate('/admin'); return; }
      const data = await res.json();
      setPrototypes(data.prototypes || []);
    } catch {
      setError('Failed to load the library. Check your connection and refresh.');
    }
  }, [token, navigate]);

  useEffect(() => {
    if (!token) { navigate('/admin'); return; }
    load().finally(() => setLoading(false));
  }, [token, navigate, load]);

  const addPrototype = async (e) => {
    e.preventDefault();
    setError('');
    const res = await fetch(`${API}/api/admin/library`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm(EMPTY_FORM);
      load();
    } else {
      await handleFailure(res, 'Failed to add prototype.');
    }
  };

  const startEdit = (p) => {
    setEditingId(p.id);
    setEditForm({ name: p.name, sketchfabEmbedUrl: p.sketchfabEmbedUrl, description: p.description });
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    setError('');
    const res = await fetch(`${API}/api/admin/library/${editingId}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      setEditingId(null);
      load();
    } else {
      await handleFailure(res, 'Failed to save changes.');
    }
  };

  const deletePrototype = async (p) => {
    const confirmed = window.confirm(
      `Remove "${p.name}" from the library? Batches that already contain it are not affected.`
    );
    if (!confirmed) return;
    setError('');
    const res = await fetch(`${API}/api/admin/library/${p.id}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    if (res.ok) load();
    else await handleFailure(res, 'Failed to remove prototype.');
  };

  if (loading) {
    return (
      <AdminLayout crumb="Prototypes">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
          <p className="eyebrow">Loading...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout crumb="Prototypes">
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        <header style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 26, fontWeight: 900, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            Prototypes
          </h1>
          <p className="body-text" style={{ color: 'var(--text-muted)' }}>
            The master library. Batches receive copies, so editing here never changes a running review.
          </p>
        </header>

        {error && (
          <div style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 'var(--radius-md)', padding: '10px 16px', fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--accent)', marginBottom: 20 }}>
            {error}
          </div>
        )}

        {/* Add prototype */}
        <form onSubmit={addPrototype} className="card" style={{ padding: 24, marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 160px' }}>
              <label className="label">PROTOTYPE NAME</label>
              <input
                className="input"
                placeholder="e.g. Heat Seek Rover"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                required
              />
            </div>
            <div style={{ flex: '2 1 280px' }}>
              <label className="label">SKETCHFAB EMBED URL</label>
              <input
                className="input"
                placeholder="https://sketchfab.com/models/.../embed"
                value={form.sketchfabEmbedUrl}
                onChange={(e) => setForm((p) => ({ ...p, sketchfabEmbedUrl: e.target.value }))}
                required
              />
            </div>
          </div>
          <div>
            <label className="label">SUMMARY (shown to students)</label>
            <input
              className="input"
              placeholder="One or two lines about this prototype..."
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
          </div>
          <div>
            <button className="btn btn-primary" type="submit">+ Add To Library</button>
          </div>
        </form>

        {/* Library list */}
        {prototypes.length === 0 ? (
          <div className="card" style={{ padding: 40, textAlign: 'center' }}>
            <p className="body-text" style={{ color: 'var(--text-muted)' }}>
              The library is empty. Add your first prototype above.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {prototypes.map((p) => (
              <div key={p.id} className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {editingId === p.id ? (
                  <form onSubmit={saveEdit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input
                      className="input"
                      value={editForm.name}
                      onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                      required
                    />
                    <input
                      className="input"
                      value={editForm.sketchfabEmbedUrl}
                      onChange={(e) => setEditForm((f) => ({ ...f, sketchfabEmbedUrl: e.target.value }))}
                      required
                    />
                    <textarea
                      className="input"
                      rows={3}
                      value={editForm.description}
                      onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                      style={{ resize: 'vertical', fontFamily: 'var(--font-body)' }}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-primary" type="submit" style={{ fontSize: 10, padding: '6px 14px' }}>Save</button>
                      <button className="btn btn-neutral" type="button" style={{ fontSize: 10, padding: '6px 14px' }} onClick={() => setEditingId(null)}>Cancel</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <h2 className="card-title" style={{ fontSize: 14 }}>{p.name}</h2>
                    <p className="body-text" style={{
                      color: 'var(--text-muted)', flex: 1, lineHeight: 1.6,
                      display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                      {p.description || 'No summary yet.'}
                    </p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.sketchfabEmbedUrl.replace('https://sketchfab.com/models/', '').replace('/embed', '')}
                    </p>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      <button className="btn btn-ghost" style={{ fontSize: 10, padding: '5px 14px' }} onClick={() => startEdit(p)}>Edit</button>
                      <button className="btn btn-neutral" style={{ fontSize: 10, padding: '5px 14px' }} onClick={() => deletePrototype(p)}>Remove</button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

      </div>
    </AdminLayout>
  );
}

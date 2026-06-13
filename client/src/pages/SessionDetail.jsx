import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { AdminLayout } from '../components/AdminLayout';
import { voteLink, whatsappShareUrl } from '../lib/share';
import { STAR_COLORS } from '../lib/chartColors';

const API = import.meta.env.VITE_API_URL || '';
const REFRESH_MS = 5000;

function StatCard({ label, value, accent }) {
  return (
    <div className="card" style={{ padding: '16px 20px', flex: 1, minWidth: 140 }}>
      <p className="label" style={{ marginBottom: 6 }}>{label}</p>
      <p style={{
        fontFamily: 'var(--font-heading)', fontSize: '1.35rem', fontWeight: 900,
        color: accent ? 'var(--brand)' : 'var(--text-primary)',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {value}
      </p>
    </div>
  );
}

function ResultBar({ rank, result, isLeader }) {
  const pct = (result.averageRating / 5) * 100;
  const distribution = result.distribution || [0, 0, 0, 0, 0];
  const maxDist = Math.max(...distribution, 1);

  return (
    <div style={{ padding: '18px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10, gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, minWidth: 0 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
            #{rank}
          </span>
          <span style={{
            fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 700,
            color: isLeader ? 'var(--brand)' : 'var(--text-primary)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {result.name} {isLeader && '🏆'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 900, color: isLeader ? 'var(--brand)' : 'var(--text-primary)' }}>
            ★ {result.averageRating.toFixed(1)}
          </span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-muted)' }}>
            {result.voteCount} vote{result.voteCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
        {/* Average rating bar */}
        <div style={{ flex: 1, height: 10, background: 'var(--brand-bg)', borderRadius: 5, overflow: 'hidden' }}>
          <div style={{
            width: `${pct}%`, height: '100%',
            background: isLeader ? 'var(--brand)' : 'var(--text-muted)',
            borderRadius: 5, transition: 'width 0.6s ease',
          }} />
        </div>

        {/* Star distribution histogram (1★ → 5★) */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, flexShrink: 0 }} title="Votes per star (1★ to 5★)">
          {distribution.map((count, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <div style={{
                width: 14,
                height: Math.max(3, (count / maxDist) * 30),
                background: count > 0 ? STAR_COLORS[i] : 'var(--border)',
                borderRadius: 2,
                transition: 'height 0.4s ease',
              }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)' }}>{i + 1}★</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SessionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('admin_token');

  const [session, setSession] = useState(null);
  const [models, setModels] = useState([]);
  const [results, setResults] = useState([]);
  const [newModel, setNewModel] = useState({ name: '', sketchfabEmbedUrl: '', description: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const timerRef = useRef(null);

  const link = voteLink(id);

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const load = useCallback(async () => {
    try {
      const [sessionRes, resultsRes] = await Promise.all([
        fetch(`${API}/api/sessions/${id}`),
        fetch(`${API}/api/admin/sessions/${id}/results`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (resultsRes.status === 401) { navigate('/admin'); return; }
      const sessionData = await sessionRes.json();
      const resultsData = await resultsRes.json();
      setSession(sessionData.session);
      setModels(sessionData.models || []);
      setResults(resultsData.results || []);
    } catch {
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, [id, token, navigate]);

  // Initial load + live polling
  useEffect(() => {
    if (!token) { navigate('/admin'); return; }
    load();
    timerRef.current = setInterval(load, REFRESH_MS);
    return () => clearInterval(timerRef.current);
  }, [token, navigate, load]);

  // Shared response handling: expired token → login, otherwise surface the
  // server's error message (e.g. "Add at least one prototype before opening")
  const handleFailure = async (res, fallback) => {
    if (res.status === 401) { navigate('/admin'); return; }
    const data = await res.json().catch(() => ({}));
    setError(data.error || fallback);
  };

  const updateStatus = async (status) => {
    setError('');
    const res = await fetch(`${API}/api/admin/sessions/${id}/status`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ status }),
    });
    if (res.ok) load();
    else await handleFailure(res, 'Failed to update status.');
  };

  const addModel = async (e) => {
    e.preventDefault();
    setError('');
    const res = await fetch(`${API}/api/admin/sessions/${id}/models`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(newModel),
    });
    if (res.ok) {
      setNewModel({ name: '', sketchfabEmbedUrl: '', description: '' });
      load();
    } else {
      await handleFailure(res, 'Failed to add model.');
    }
  };

  const deleteModel = async (modelId) => {
    setError('');
    const res = await fetch(`${API}/api/admin/sessions/${id}/models/${modelId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    if (res.ok) load();
    else await handleFailure(res, 'Failed to delete model.');
  };

  const deleteBatch = async () => {
    const confirmed = window.confirm(
      `Delete the batch "${session?.name}" along with all its prototypes and votes? This cannot be undone.`
    );
    if (!confirmed) return;
    setError('');
    const res = await fetch(`${API}/api/admin/sessions/${id}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    if (res.ok) navigate('/admin/dashboard');
    else await handleFailure(res, 'Failed to delete batch.');
  };

  const copyLink = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <AdminLayout crumb="Batch">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
          <p className="eyebrow">Loading...</p>
        </div>
      </AdminLayout>
    );
  }

  const isOpen = session?.status === 'open';
  const totalVotes = results.reduce((sum, r) => sum + r.voteCount, 0);
  // Ties share the lead — every voted model matching the top average is a leader
  const topAvg = Math.max(0, ...results.filter((r) => r.voteCount > 0).map((r) => r.averageRating));
  const leaders = results.filter((r) => r.voteCount > 0 && Math.abs(r.averageRating - topAvg) < 0.001);
  const isLeaderId = new Set(leaders.map((r) => r.id));

  return (
    <AdminLayout crumb={session?.name || 'Batch'}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Header */}
        <header style={{ marginBottom: 24 }}>
          <Link to="/admin/dashboard" style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none' }}>
            ← All Batches
          </Link>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 900, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {session?.name}
              </h1>
              <span className={`badge ${isOpen ? 'badge-live' : 'badge-soon'}`}>
                {isOpen ? '● LIVE' : 'CLOSED'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn btn-ghost" style={{ fontSize: 11, padding: '8px 16px' }} onClick={copyLink}>
                {copied ? '✓ COPIED' : 'COPY VOTE LINK'}
              </button>
              <button className="btn btn-ghost" style={{ fontSize: 11, padding: '8px 16px' }} onClick={() => setShowQR(true)}>
                SHOW QR
              </button>
              <a
                className="btn btn-ghost"
                style={{ fontSize: 11, padding: '8px 16px', textDecoration: 'none' }}
                href={whatsappShareUrl(link)}
                target="_blank"
                rel="noopener noreferrer"
              >
                WHATSAPP
              </a>
              {isOpen
                ? <button className="btn btn-neutral" style={{ fontSize: 11, padding: '8px 16px' }} onClick={() => updateStatus('closed')}>Close Voting</button>
                : <button className="btn btn-primary" style={{ fontSize: 11, padding: '8px 16px' }} onClick={() => updateStatus('open')}>Open Voting</button>
              }
              <button
                className="btn"
                style={{
                  fontSize: 11, padding: '8px 16px',
                  background: 'var(--accent-bg)', border: '2px solid var(--accent-border)', color: 'var(--accent)',
                }}
                onClick={deleteBatch}
                disabled={isOpen}
                title={isOpen ? 'Close voting before deleting' : 'Delete this batch'}
              >
                Delete Batch
              </button>
            </div>
          </div>
        </header>

        {error && (
          <div style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 'var(--radius-md)', padding: '10px 16px', fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--accent)', marginBottom: 20 }}>
            {error}
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
          <StatCard label="TOTAL VOTES" value={totalVotes} accent />
          <StatCard label="PROTOTYPES" value={models.length} />
          <StatCard
            label="LEADING"
            value={leaders.length ? leaders.map((r) => r.name).join(' & ') : '—'}
            accent={leaders.length > 0}
          />
        </div>

        {/* Live results */}
        <div className="card" style={{ padding: 28, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h2 className="card-title">Live Results</h2>
            {isOpen && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
                auto-refreshes every {REFRESH_MS / 1000}s
              </span>
            )}
          </div>

          {results.length === 0 ? (
            <p className="body-text" style={{ color: 'var(--text-muted)', padding: '16px 0' }}>
              No prototypes yet — add them below.
            </p>
          ) : (
            results.map((r, i) => <ResultBar key={r.id} rank={i + 1} result={r} isLeader={isLeaderId.has(r.id)} />)
          )}
        </div>

        {/* Models management */}
        <div className="card" style={{ padding: 28 }}>
          <h2 className="card-title" style={{ marginBottom: 20 }}>Prototypes</h2>

          {models.map((m) => (
            <div
              key={m._id}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}
            >
              <div style={{ minWidth: 0 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)', marginRight: 8 }}>
                  {m.order}.
                </span>
                <span className="card-title" style={{ fontSize: 13 }}>{m.name}</span>
              </div>
              <button
                className="btn btn-neutral"
                style={{ fontSize: 10, padding: '4px 12px', flexShrink: 0 }}
                onClick={() => deleteModel(m._id)}
                disabled={isOpen}
              >
                Delete
              </button>
            </div>
          ))}

          <form onSubmit={addModel} style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 160px' }}>
                <label className="label">PROTOTYPE NAME</label>
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
            </div>
            <div>
              <label className="label">DESCRIPTION (optional)</label>
              <input
                className="input"
                placeholder="Brief description shown to students..."
                value={newModel.description}
                onChange={(e) => setNewModel((p) => ({ ...p, description: e.target.value }))}
                disabled={isOpen}
              />
            </div>
            <div>
              <button className="btn btn-primary" type="submit" disabled={isOpen}>
                + Add Prototype
              </button>
              {isOpen && (
                <p className="body-text" style={{ marginTop: 8, color: 'var(--text-muted)' }}>
                  Close voting to add or remove prototypes.
                </p>
              )}
            </div>
          </form>
        </div>

        {/* QR projection modal — show or print to share with a class */}
        {showQR && (
          <div className="qr-overlay" onClick={() => setShowQR(false)}>
            <div className="qr-modal" onClick={(e) => e.stopPropagation()}>
              <div className="qr-modal-header qr-no-print">
                <p style={{ fontFamily: 'var(--font-heading)', fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.85 }}>
                  Scan to vote
                </p>
                <p style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 900, letterSpacing: '0.04em', textTransform: 'uppercase', marginTop: 4 }}>
                  {session?.name}
                </p>
              </div>
              <div className="qr-modal-body">
                <div className="qr-print">
                  <div className="qr-frame">
                    <QRCodeSVG value={link} size={240} fgColor="#030A8C" bgColor="#ffffff" level="M" />
                  </div>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)', wordBreak: 'break-all', textAlign: 'center', maxWidth: 280 }}>
                    {link}
                  </p>
                </div>
                <div className="qr-no-print" style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-primary" style={{ fontSize: 11, padding: '8px 18px' }} onClick={() => window.print()}>
                    Print
                  </button>
                  <button className="btn btn-neutral" style={{ fontSize: 11, padding: '8px 18px' }} onClick={() => setShowQR(false)}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}

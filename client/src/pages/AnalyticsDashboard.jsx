import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AdminLayout } from '../components/AdminLayout';
import { DonutChart } from '../components/DonutChart';
import { STAR_COLORS } from '../lib/chartColors';

const API = import.meta.env.VITE_API_URL || '';

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="card" style={{ padding: '16px 20px', flex: 1, minWidth: 150 }}>
      <p className="label" style={{ marginBottom: 6 }}>{label}</p>
      <p style={{
        fontFamily: 'var(--font-heading)', fontSize: '1.35rem', fontWeight: 900,
        color: accent ? 'var(--brand)' : 'var(--text-primary)',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {value}
      </p>
      {sub && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
          {sub}
        </p>
      )}
    </div>
  );
}

// Small 1★→5★ histogram, matching the look used on the batch results page.
function MiniHistogram({ distribution }) {
  const max = Math.max(...distribution, 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }} title="Votes per star (1★ to 5★)">
      {distribution.map((count, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flex: 1 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>{count}</span>
          <div style={{
            width: '100%', maxWidth: 20,
            height: Math.max(3, (count / max) * 34),
            background: count > 0 ? STAR_COLORS[i] : 'var(--border)',
            borderRadius: 2,
          }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)' }}>{i + 1}★</span>
        </div>
      ))}
    </div>
  );
}

// opened → voted conversion. Null when a batch predates open-tracking (no opens
// recorded) or has fewer opens than voters, where a percentage would mislead.
function conversion(batch) {
  if (batch.opens <= 0 || batch.opens < batch.voters) return null;
  return Math.round((batch.voters / batch.opens) * 100);
}

export function AnalyticsDashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem('admin_token');

  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/analytics`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) { navigate('/admin'); return; }
      if (!res.ok) { setError('Failed to load analytics.'); return; }
      setData(await res.json());
    } catch {
      setError('Failed to load analytics. Check your connection and refresh.');
    }
  }, [token, navigate]);

  useEffect(() => {
    if (!token) { navigate('/admin'); return; }
    load().finally(() => setLoading(false));
  }, [token, navigate, load]);

  if (loading) {
    return (
      <AdminLayout crumb="Analytics">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
          <p className="eyebrow">Loading...</p>
        </div>
      </AdminLayout>
    );
  }

  const totals = data?.totals || { batches: 0, prototypes: 0, votes: 0, voters: 0, opens: 0 };
  const prototypes = data?.prototypes || [];
  const batches = data?.batches || [];
  const overallConversion = totals.opens > 0 && totals.opens >= totals.voters
    ? Math.round((totals.voters / totals.opens) * 100)
    : null;

  return (
    <AdminLayout crumb="Analytics">
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        <header style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 26, fontWeight: 900, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            Analytics
          </h1>
          <p className="body-text" style={{ color: 'var(--text-muted)' }}>
            Every prototype, across every batch — ratings, reach, and participation at a glance.
          </p>
        </header>

        {error && (
          <div style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 'var(--radius-md)', padding: '10px 16px', fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--accent)', marginBottom: 20 }}>
            {error}
          </div>
        )}

        {/* KPI strip */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 28, flexWrap: 'wrap' }}>
          <StatCard label="BATCHES" value={totals.batches} />
          <StatCard label="PROTOTYPES" value={totals.prototypes} accent />
          <StatCard label="VOTES CAST" value={totals.votes} />
          <StatCard label="STUDENTS" value={totals.voters} />
          <StatCard
            label="OPENS"
            value={totals.opens}
            sub={overallConversion !== null ? `${overallConversion}% voted` : 'forward-tracked'}
          />
        </div>

        {prototypes.length === 0 ? (
          <div className="card" style={{ padding: 40, textAlign: 'center' }}>
            <p className="body-text" style={{ color: 'var(--text-muted)' }}>
              No data yet. Create a batch, open voting, and share the link — results appear here as students rate.
            </p>
          </div>
        ) : (
          <>
            {/* Per-prototype performance */}
            <h2 className="card-title" style={{ marginBottom: 14 }}>Prototype Performance</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, marginBottom: 32 }}>
              {prototypes.map((p) => (
                <div key={p.sketchfabEmbedUrl} className="card" style={{ padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
                    <h3 style={{
                      fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-primary)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
                    }}>
                      {p.name}
                    </h3>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
                      {p.batchCount} batch{p.batchCount !== 1 ? 'es' : ''}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                    <DonutChart distribution={p.distribution} average={p.averageRating} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
                        {p.voteCount} review{p.voteCount !== 1 ? 's' : ''}
                      </p>
                      <MiniHistogram distribution={p.distribution} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* By batch */}
            <div className="card" style={{ padding: 28 }}>
              <h2 className="card-title" style={{ marginBottom: 6 }}>By Batch</h2>
              <p className="body-text" style={{ color: 'var(--text-muted)', marginBottom: 8 }}>
                How many opened each review link versus how many actually voted.
              </p>
              {batches.map((b) => {
                const conv = conversion(b);
                return (
                  <div key={b.id} style={{ padding: '16px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <Link
                          to={`/admin/sessions/${b.id}`}
                          style={{
                            fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)',
                            textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}
                        >
                          {b.name}
                        </Link>
                        <span className={`badge ${b.status === 'open' ? 'badge-live' : 'badge-soon'}`}>
                          {b.status === 'open' ? '● LIVE' : 'CLOSED'}
                        </span>
                      </div>
                      {b.leader && (
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-muted)' }}>
                          🏆 {b.leader.name} · ★ {b.leader.averageRating.toFixed(1)}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', flexShrink: 0, minWidth: 150 }}>
                        {b.opens > 0
                          ? `${b.opens} opened · ${b.voters} voted${conv !== null ? ` · ${conv}%` : ''}`
                          : `${b.voters} voted · opens not tracked`}
                      </span>
                      {/* Funnel: voted as a share of opened */}
                      <div style={{ flex: 1, height: 8, background: 'var(--brand-bg)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{
                          width: conv !== null ? `${conv}%` : '0%', height: '100%',
                          background: 'var(--brand)', borderRadius: 4, transition: 'width 0.6s ease',
                        }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

      </div>
    </AdminLayout>
  );
}

import { Link, useLocation, useNavigate } from 'react-router-dom';

const CubeIcon = (props) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const LayersIcon = (props) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);

const LogOutIcon = (props) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const SIDEBAR_W = 256;

export function AdminLayout({ crumb, children }) {
  const location = useLocation();
  const navigate = useNavigate();

  const batchesActive =
    location.pathname.startsWith('/admin/dashboard') ||
    location.pathname.startsWith('/admin/sessions');

  const logout = () => {
    localStorage.removeItem('admin_token');
    navigate('/admin');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>

      {/* ── Sidebar ── */}
      <aside style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: SIDEBAR_W,
        background: 'var(--bg-white)', borderRight: '2px solid var(--border)',
        display: 'flex', flexDirection: 'column', zIndex: 10,
      }}>

        {/* ① Brand */}
        <Link
          to="/admin/dashboard"
          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, borderBottom: '2px solid var(--border)', textDecoration: 'none' }}
        >
          <div className="brand-chip">
            <CubeIcon />
          </div>
          <div>
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 900, letterSpacing: '0.1em', color: 'var(--text-primary)' }}>
              PROTOVIEW
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
              model review
            </p>
          </div>
        </Link>

        {/* ② Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>
          <p className="label" style={{ padding: '0 12px', marginBottom: 8 }}>Review</p>
          <Link to="/admin/dashboard" className={`nav-item ${batchesActive ? 'active' : ''}`}>
            <LayersIcon /> Batches
          </Link>
        </nav>

        {/* ③ Logout */}
        <div style={{ borderTop: '2px solid var(--border)', padding: 12 }}>
          <button className="nav-item nav-logout" onClick={logout}>
            <LogOutIcon /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div style={{ marginLeft: SIDEBAR_W }}>

        {/* Topbar */}
        <div style={{
          position: 'sticky', top: 0, height: 56, zIndex: 5,
          background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)',
          borderBottom: '2px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px',
        }}>
          <p style={{ fontFamily: 'var(--font-heading)', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            PROTOVIEW <span style={{ margin: '0 6px' }}>›</span>
            <span style={{ color: 'var(--text-primary)' }}>{crumb}</span>
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="pulse-dot" />
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', color: 'var(--text-muted)' }}>
              LIVE
            </span>
          </div>
        </div>

        <main style={{ padding: 32 }}>{children}</main>
      </div>
    </div>
  );
}

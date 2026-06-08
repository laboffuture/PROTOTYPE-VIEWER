export function RankingsTable({ results }) {
  if (!results.length) {
    return (
      <p className="body-text" style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>
        No votes yet.
      </p>
    );
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          {['#', 'MODEL', 'AVG RATING', 'VOTES'].map((h) => (
            <th
              key={h}
              style={{
                textAlign: h === '#' || h === 'MODEL' ? 'left' : 'right',
                padding: '8px 12px',
                fontFamily: 'var(--font-heading)',
                fontSize: 10,
                letterSpacing: '0.15em',
                color: 'var(--text-muted)',
                borderBottom: '2px solid var(--border)',
              }}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {results.map((r, i) => (
          <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
            <td style={{ padding: '14px 12px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
              #{i + 1}
            </td>
            <td style={{ padding: '14px 12px', fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              {r.name}
            </td>
            <td style={{ padding: '14px 12px', textAlign: 'right', fontFamily: 'var(--font-heading)', fontSize: 13, color: 'var(--brand)', fontWeight: 700 }}>
              ★ {r.averageRating.toFixed(1)}
            </td>
            <td style={{ padding: '14px 12px', textAlign: 'right', fontFamily: 'var(--font-body)', color: 'var(--text-secondary)' }}>
              {r.voteCount}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

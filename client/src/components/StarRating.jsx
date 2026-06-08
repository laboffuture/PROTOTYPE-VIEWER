export function StarRating({ value, onChange = () => {} }) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => onChange(star)}
          aria-label={`Rate ${star} ${star === 1 ? 'star' : 'stars'}`}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 40,
            lineHeight: 1,
            color: star <= value ? 'var(--brand)' : 'var(--border)',
            transition: 'color 100ms',
            padding: '4px',
          }}
        >
          ★
        </button>
      ))}
    </div>
  );
}

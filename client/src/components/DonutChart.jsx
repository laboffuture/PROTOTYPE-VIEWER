// Hand-rolled SVG donut of a 1–5★ vote distribution. No charting library, so
// it stays locked to the LOF brand. Segment shade ramps with the star level,
// matching the histogram bars elsewhere (0.3 + (i/4)*0.7).
export function DonutChart({ distribution = [0, 0, 0, 0, 0], average = 0, size = 132, stroke = 16 }) {
  const total = distribution.reduce((a, b) => a + b, 0);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let acc = 0;
  const segments = distribution.map((count, i) => {
    const fraction = total ? count / total : 0;
    const seg = {
      star: i + 1,
      count,
      length: fraction * circumference,
      offset: acc * circumference,
      opacity: 0.3 + (i / 4) * 0.7,
    };
    acc += fraction;
    return seg;
  });

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} role="img" aria-label={`Rating distribution, average ${average} of 5`}>
        <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <g transform={`rotate(-90 ${center} ${center})`}>
          {total > 0 && segments.map((s) => (
            s.count > 0 && (
              <circle
                key={s.star}
                data-testid="donut-segment"
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="var(--brand)"
                strokeOpacity={s.opacity}
                strokeWidth={stroke}
                strokeDasharray={`${s.length} ${circumference - s.length}`}
                strokeDashoffset={-s.offset}
                strokeLinecap="butt"
              >
                <title>{`${s.star}★ — ${s.count} vote${s.count !== 1 ? 's' : ''}`}</title>
              </circle>
            )
          ))}
        </g>
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {total > 0 ? (
          <>
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 900, color: 'var(--brand)', lineHeight: 1 }}>
              {average.toFixed(1)}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', marginTop: 3, letterSpacing: '0.1em' }}>
              ★ AVG
            </span>
          </>
        ) : (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
            NO VOTES
          </span>
        )}
      </div>
    </div>
  );
}

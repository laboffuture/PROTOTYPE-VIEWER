import { useState } from 'react';
import { StarRating } from './StarRating';

export function ModelCarousel({ models, ratings, onRate, onSubmit }) {
  const [index, setIndex] = useState(0);
  const current = models[index];
  const isFirst = index === 0;
  const isLast = index === models.length - 1;
  const currentRating = ratings[current._id] || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <p className="eyebrow" style={{ textAlign: 'center' }}>
        {index + 1} of {models.length}
      </p>

      <h2 className="card-title" style={{ textAlign: 'center', fontSize: '1.25rem' }}>
        {current.name}
      </h2>

      <div style={{ position: 'relative', paddingTop: '56.25%', background: '#000', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <iframe
          key={current._id}
          src={current.sketchfabEmbedUrl}
          title={current.name}
          frameBorder="0"
          allowFullScreen
          allow="autoplay; fullscreen; xr-spatial-tracking"
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        />
      </div>

      <div style={{ textAlign: 'center' }}>
        <p className="label" style={{ marginBottom: 12 }}>RATE THIS MODEL</p>
        <StarRating value={currentRating} onChange={(r) => onRate(current._id, r)} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        {!isFirst && (
          <button
            className="btn btn-neutral"
            onClick={() => setIndex((i) => i - 1)}
          >
            ← Previous
          </button>
        )}

        {isFirst && <div style={{ width: '120px' }} />}

        {!isLast && (
          <button className="btn btn-primary" onClick={() => setIndex((i) => i + 1)}>
            Next →
          </button>
        )}

        {isLast && (
          <button
            className="btn btn-primary"
            onClick={onSubmit}
            disabled={currentRating === 0}
          >
            Submit Ratings
          </button>
        )}
      </div>
    </div>
  );
}

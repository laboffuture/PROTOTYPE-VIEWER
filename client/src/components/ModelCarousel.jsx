import { useState, useRef, useEffect } from 'react';
import { StarRating } from './StarRating';

function extractModelId(embedUrl) {
  return embedUrl?.match(/models\/([^/?]+)\/embed/)?.[1] ?? '';
}

function loadSketchfabScript(cb) {
  if (window.Sketchfab) { cb(); return; }
  const s = document.createElement('script');
  s.src = 'https://static.sketchfab.com/api/sketchfab-viewer-1.12.1.js';
  s.onload = cb;
  document.head.appendChild(s);
}

export function ModelCarousel({ models, ratings, onRate, onSubmit }) {
  const [index, setIndex]           = useState(0);
  const [sfApi, setSfApi]           = useState(null);
  const [animations, setAnimations] = useState([]);
  const [activeAnim, setActiveAnim] = useState(null);
  const iframeRef = useRef(null);

  const current       = models[index];
  const isFirst       = index === 0;
  const isLast        = index === models.length - 1;
  const currentRating = ratings[current._id] || 0;
  const modelId       = extractModelId(current.sketchfabEmbedUrl);

  useEffect(() => {
    setSfApi(null); setAnimations([]); setActiveAnim(null);
    if (!iframeRef.current || !modelId) return;

    loadSketchfabScript(() => {
      if (!iframeRef.current) return;
      const client = new window.Sketchfab(iframeRef.current);
      client.init(modelId, {
        success(api) {
          api.start();
          api.addEventListener('viewerready', () => {
            api.getAnimations((err, anims) => {
              if (!err && anims.length) { setAnimations(anims); api.pause(); }
            });
            setSfApi(api);
          });
        },
        autostart: 1, preload: 1, autorotate: 1,
        ui_stop: 0, ui_animations: 0, ui_infos: 0, ui_controls: 1,
      });
    });
  }, [current._id, modelId]);

  const toggleAnimation = (uid) => {
    if (!sfApi) return;
    if (activeAnim === uid) { sfApi.pause(); setActiveAnim(null); }
    else { sfApi.setCurrentAnimationByUID(uid); sfApi.play(); setActiveAnim(uid); }
  };

  const H = 'clamp(520px, 72vh, 850px)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      <p className="eyebrow" style={{ textAlign: 'center' }}>
        {index + 1} of {models.length}
      </p>

      {/* Side-by-side */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'stretch' }}>

        {/* Left — 3D viewer (68%) */}
        <div style={{ flex: '0 0 68%' }}>
          <div style={{
            height: H, minHeight: 520,
            borderRadius: 'var(--radius-lg)', overflow: 'hidden',
            background: '#000', boxShadow: 'var(--shadow-lg)',
          }}>
            <iframe
              key={current._id}
              ref={iframeRef}
              title={current.name}
              allowFullScreen
              allow="autoplay; fullscreen; xr-spatial-tracking"
              style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            />
          </div>
        </div>

        {/* Right — controls (32%) */}
        <div style={{
          flex: '1 1 32%',
          height: H, minHeight: 520,
          overflowY: 'auto',
          display: 'flex', flexDirection: 'column',
        }}>

          {/* Name + description */}
          <div style={{ marginBottom: 20 }}>
            <h2 className="card-title" style={{ fontSize: '1.15rem', marginBottom: 8 }}>
              {current.name}
            </h2>
            {current.description && (
              <p className="body-text" style={{
                lineHeight: 1.7, fontSize: '0.875rem',
                display: '-webkit-box', WebkitLineClamp: 5,
                WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>
                {current.description}
              </p>
            )}
          </div>

          {/* Animations */}
          {animations.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p className="label" style={{ marginBottom: 10 }}>Animations</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {animations.map(([uid, name]) => (
                  <button
                    key={uid}
                    className={`btn ${activeAnim === uid ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontSize: 12, padding: '7px 16px', whiteSpace: 'nowrap' }}
                    onClick={() => toggleAnimation(uid)}
                    disabled={!sfApi}
                  >
                    {activeAnim === uid ? '⏸' : '▶'} {name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Spacer pushes rating to bottom */}
          <div style={{ flex: 1 }} />

          {/* Rating — pinned to bottom */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 18 }}>
            <p className="label" style={{ marginBottom: 12 }}>Rate This Model</p>
            <StarRating value={currentRating} onChange={(r) => onRate(current._id, r)} />
          </div>

        </div>
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {!isFirst
          ? <button className="btn btn-neutral" onClick={() => setIndex(i => i - 1)}>← Previous</button>
          : <div style={{ width: 130 }} />
        }
        {!isLast && (
          <button className="btn btn-primary" onClick={() => setIndex(i => i + 1)}>Next →</button>
        )}
        {isLast && (
          <button className="btn btn-primary" onClick={onSubmit} disabled={currentRating === 0}>
            Submit Ratings
          </button>
        )}
      </div>

    </div>
  );
}

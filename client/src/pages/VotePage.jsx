import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { ModelCarousel } from '../components/ModelCarousel';

const API = import.meta.env.VITE_API_URL || '';

function getOrCreateUUID() {
  let id = localStorage.getItem('voter_uuid');
  if (!id) {
    id = uuidv4();
    localStorage.setItem('voter_uuid', id);
  }
  return id;
}

export function VotePage() {
  const { sessionId } = useParams();
  const [session, setSession] = useState(null);
  const [models, setModels] = useState([]);
  const [ratings, setRatings] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [closedDuringVote, setClosedDuringVote] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(`submitted_${sessionId}`)) {
      setSubmitted(true);
      setLoading(false);
      return;
    }
    fetch(`${API}/api/sessions/${sessionId}`)
      .then((r) => {
        if (!r.ok) throw new Error('Session not found');
        return r.json();
      })
      .then((data) => {
        setSession(data.session);
        setModels(data.models);
        setLoading(false);
      })
      .catch(() => {
        setError('Could not load session. Check the link and try again.');
        setLoading(false);
      });
  }, [sessionId]);

  const handleRate = (modelId, rating) => {
    setRatings((prev) => ({ ...prev, [modelId]: rating }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    const voterUUID = getOrCreateUUID();
    const ratingsList = Object.entries(ratings).map(([modelId, rating]) => ({ modelId, rating }));
    try {
      const res = await fetch(`${API}/api/votes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, voterUUID, ratings: ratingsList }),
      });
      if (res.status === 403) {
        setClosedDuringVote(true);
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSubmitError(data.error || 'Failed to submit. Please try again.');
        return;
      }
      localStorage.setItem(`submitted_${sessionId}`, '1');
      setSubmitted(true);
    } catch {
      setSubmitError('Failed to submit. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="eyebrow">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 'var(--radius-md)', padding: '16px 24px', fontFamily: 'var(--font-body)', color: 'var(--accent)', textAlign: 'center' }}>
          {error}
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="card" style={{ padding: 48, textAlign: 'center', maxWidth: 420 }}>
          <p style={{ fontSize: 48, marginBottom: 16 }}>★</p>
          <h1 className="card-title" style={{ fontSize: '1.5rem', color: 'var(--brand)', marginBottom: 12 }}>
            THANK YOU!
          </h1>
          <p className="body-text">
            Thanks for your input and your time. Your ratings have been recorded.
          </p>
        </div>
      </div>
    );
  }

  if (closedDuringVote || session?.status === 'closed') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="card" style={{ padding: 48, textAlign: 'center', maxWidth: 400 }}>
          <h1 className="card-title" style={{ color: 'var(--text-muted)', marginBottom: 12 }}>VOTING IS CLOSED</h1>
          <p className="body-text">
            {closedDuringVote
              ? 'Voting closed while you were rating, so your ratings could not be submitted.'
              : 'This session is no longer accepting votes.'}
          </p>
        </div>
      </div>
    );
  }

  if (!models.length) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="body-text">No models in this session yet.</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <p className="eyebrow">PROTOVIEW</p>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 900, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {session?.name}
          </h1>
          <p className="body-text" style={{ marginTop: 8 }}>
            Rate each 3D prototype from 1 to 5 stars
          </p>
        </div>

        {submitError && (
          <div style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 'var(--radius-md)', padding: '10px 16px', fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--accent)', marginBottom: 16, textAlign: 'center' }}>
            {submitError}
          </div>
        )}

        <div className="card" style={{ padding: '24px 20px' }}>
          <ModelCarousel
            models={models}
            ratings={ratings}
            onRate={handleRate}
            onSubmit={handleSubmit}
          />
          {submitting && (
            <p className="eyebrow" style={{ textAlign: 'center', marginTop: 16 }}>Submitting...</p>
          )}
        </div>
      </div>
    </div>
  );
}

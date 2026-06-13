// Persist a student's in-progress ratings on their device so a refresh, a
// phone call, or an accidental back-swipe doesn't wipe partial work. Keyed by
// batch; cleared once the submission succeeds.

const key = (sessionId) => `ratings_${sessionId}`;

// Returns the saved { modelId: rating } map. When validModelIds is given, any
// rating for a model no longer in the batch is dropped — otherwise a stale id
// would block submission (the server rejects ratings outside the batch).
export function loadRatings(sessionId, validModelIds) {
  let saved;
  try {
    saved = JSON.parse(localStorage.getItem(key(sessionId)) || '{}');
  } catch {
    return {};
  }
  if (!saved || typeof saved !== 'object') return {};
  if (!validModelIds) return saved;
  const allowed = new Set(validModelIds.map(String));
  return Object.fromEntries(Object.entries(saved).filter(([id]) => allowed.has(id)));
}

export function saveRatings(sessionId, ratings) {
  try {
    localStorage.setItem(key(sessionId), JSON.stringify(ratings));
  } catch {
    /* storage full or unavailable — non-fatal, ratings stay in memory */
  }
}

export function clearRatings(sessionId) {
  try {
    localStorage.removeItem(key(sessionId));
  } catch {
    /* ignore */
  }
}

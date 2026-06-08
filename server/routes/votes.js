const express = require('express');
const Session = require('../models/Session');
const Vote = require('../models/Vote');

const router = express.Router();

// POST /api/votes — anonymous vote submission
router.post('/', async (req, res, next) => {
  try {
    const { sessionId, ratings, voterUUID } = req.body;
    if (!sessionId || !Array.isArray(ratings) || !ratings.length || !voterUUID) {
      return res.status(400).json({ error: 'sessionId, non-empty ratings array, and voterUUID required' });
    }
    for (const { modelId, rating } of ratings) {
      if (!modelId || typeof rating !== 'number' || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Each rating must have modelId and rating between 1 and 5' });
      }
    }
    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.status !== 'open') return res.status(403).json({ error: 'Voting is closed' });

    const saved = [];
    for (const { modelId, rating } of ratings) {
      try {
        await Vote.create({ sessionId, modelId, voterUUID, rating });
        saved.push({ modelId, saved: true });
      } catch (err) {
        if (err.code === 11000) {
          saved.push({ modelId, saved: false, reason: 'duplicate' });
        } else {
          throw err;
        }
      }
    }
    res.json({ saved });
  } catch (err) { next(err); }
});

module.exports = router;

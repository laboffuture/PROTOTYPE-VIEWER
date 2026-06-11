const express = require('express');
const mongoose = require('mongoose');
const Session = require('../models/Session');
const Model = require('../models/Model');
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
      if (!modelId || !Number.isInteger(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Each rating must have modelId and rating between 1 and 5' });
      }
    }
    if (!mongoose.isValidObjectId(sessionId)) {
      return res.status(404).json({ error: 'Session not found' });
    }
    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.status !== 'open') return res.status(403).json({ error: 'Voting is closed' });

    // Every prototype in the batch must be rated — no partial submissions,
    // and no ratings for models outside this batch.
    const models = await Model.find({ sessionId }).select('_id');
    const batchIds = new Set(models.map((m) => m._id.toString()));
    const ratedIds = new Set(ratings.map((r) => String(r.modelId)));
    for (const id of ratedIds) {
      if (!batchIds.has(id)) {
        return res.status(400).json({ error: 'Ratings include a prototype that is not in this batch' });
      }
    }
    if (ratedIds.size !== batchIds.size) {
      return res.status(400).json({ error: 'All prototypes must be rated before submitting' });
    }

    // Single bulk insert so a submission is all-or-nothing; with
    // ordered:false, duplicates fail individually without blocking the rest.
    const docs = ratings.map(({ modelId, rating }) => ({ sessionId, modelId, voterUUID, rating }));
    const saved = docs.map(({ modelId }) => ({ modelId, saved: true }));
    try {
      await Vote.insertMany(docs, { ordered: false });
    } catch (err) {
      const writeErrors = err.writeErrors || [];
      const allDuplicates = writeErrors.length > 0 &&
        writeErrors.every((e) => (e.code ?? e.err?.code) === 11000);
      if (!allDuplicates) throw err;
      for (const e of writeErrors) {
        const idx = e.index ?? e.err?.index;
        saved[idx] = { modelId: docs[idx].modelId, saved: false, reason: 'duplicate' };
      }
    }
    res.json({ saved });
  } catch (err) { next(err); }
});

module.exports = router;

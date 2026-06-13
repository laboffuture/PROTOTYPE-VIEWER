const express = require('express');
const mongoose = require('mongoose');
const Session = require('../models/Session');
const Model = require('../models/Model');
const View = require('../models/View');

const router = express.Router();

// GET /api/sessions/:id — public, no auth required
router.get('/:id', async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    const models = await Model.find({ sessionId: req.params.id })
      .sort({ order: 1 })
      .select('-sessionId -__v');
    res.json({
      session: { id: session._id, name: session.name, status: session.status },
      models,
    });
  } catch (err) { next(err); }
});

// POST /api/sessions/:id/open — record that a device opened this review.
// Public, fire-and-forget from the student page. Deduped per device so the
// count reflects unique opens. Never affects the voting flow.
router.post('/:id/open', async (req, res, next) => {
  try {
    const { voterUUID } = req.body;
    if (!voterUUID) return res.status(400).json({ error: 'voterUUID required' });
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: 'Session not found' });
    }
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    await View.updateOne(
      { sessionId: req.params.id, voterUUID },
      { $setOnInsert: { sessionId: req.params.id, voterUUID } },
      { upsert: true }
    );
    res.status(204).send();
  } catch (err) {
    // A racing duplicate open is harmless — the device is already counted.
    if (err.code === 11000) return res.status(204).send();
    next(err);
  }
});

module.exports = router;

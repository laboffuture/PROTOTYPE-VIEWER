const express = require('express');
const Session = require('../models/Session');
const Model = require('../models/Model');

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

module.exports = router;

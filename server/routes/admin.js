const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Session = require('../models/Session');
const Model = require('../models/Model');
const Vote = require('../models/Vote');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/admin/sessions — create a new session (protected by ADMIN_MASTER_SECRET)
router.post('/sessions', async (req, res, next) => {
  try {
    const { name, password, masterSecret } = req.body;
    if (masterSecret !== process.env.ADMIN_MASTER_SECRET) {
      return res.status(401).json({ error: 'Invalid master secret' });
    }
    if (!name || !password) {
      return res.status(400).json({ error: 'name and password required' });
    }
    const adminPasswordHash = await bcrypt.hash(password, 10);
    const session = await Session.create({ name, adminPasswordHash });
    res.status(201).json({ sessionId: session._id, name: session.name, status: session.status });
  } catch (err) { next(err); }
});

// POST /api/admin/login
router.post('/login', async (req, res, next) => {
  try {
    const { sessionId, password } = req.body;
    if (!sessionId || !password) {
      return res.status(400).json({ error: 'sessionId and password required' });
    }
    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    const valid = await bcrypt.compare(password, session.adminPasswordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid password' });
    const token = jwt.sign(
      { sessionId: session._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({ token });
  } catch (err) { next(err); }
});

// PATCH /api/admin/sessions/:id/status
router.patch('/sessions/:id/status', requireAuth, async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['open', 'closed'].includes(status)) {
      return res.status(400).json({ error: 'status must be open or closed' });
    }
    if (req.admin.sessionId !== req.params.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const update = { status };
    if (status === 'closed') update.closedAt = new Date();
    const session = await Session.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json({ status: session.status });
  } catch (err) { next(err); }
});

// POST /api/admin/sessions/:id/models
router.post('/sessions/:id/models', requireAuth, async (req, res, next) => {
  try {
    if (req.admin.sessionId !== req.params.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.status === 'open') {
      return res.status(400).json({ error: 'Cannot add models while session is open' });
    }
    const { name, sketchfabEmbedUrl } = req.body;
    if (!name || !sketchfabEmbedUrl) {
      return res.status(400).json({ error: 'name and sketchfabEmbedUrl required' });
    }
    const count = await Model.countDocuments({ sessionId: req.params.id });
    const model = await Model.create({
      sessionId: req.params.id,
      name,
      sketchfabEmbedUrl,
      order: count + 1,
    });
    res.status(201).json({
      id: model._id,
      name: model.name,
      sketchfabEmbedUrl: model.sketchfabEmbedUrl,
      order: model.order,
    });
  } catch (err) { next(err); }
});

// DELETE /api/admin/sessions/:id/models/:modelId
router.delete('/sessions/:id/models/:modelId', requireAuth, async (req, res, next) => {
  try {
    if (req.admin.sessionId !== req.params.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.status === 'open') {
      return res.status(400).json({ error: 'Cannot delete models while session is open' });
    }
    const result = await Model.findByIdAndDelete(req.params.modelId);
    if (!result) return res.status(404).json({ error: 'Model not found' });
    res.status(204).send();
  } catch (err) { next(err); }
});

// GET /api/admin/sessions/:id/results
router.get('/sessions/:id/results', requireAuth, async (req, res, next) => {
  try {
    if (req.admin.sessionId !== req.params.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const models = await Model.find({ sessionId: req.params.id }).sort({ order: 1 });
    const results = await Promise.all(
      models.map(async (model) => {
        const votes = await Vote.find({ modelId: model._id });
        const avg = votes.length > 0
          ? votes.reduce((sum, v) => sum + v.rating, 0) / votes.length
          : 0;
        return {
          id: model._id,
          name: model.name,
          sketchfabEmbedUrl: model.sketchfabEmbedUrl,
          averageRating: Math.round(avg * 10) / 10,
          voteCount: votes.length,
        };
      })
    );
    results.sort((a, b) => {
      if (b.averageRating !== a.averageRating) return b.averageRating - a.averageRating;
      return a.voteCount - b.voteCount;
    });
    res.json({ results });
  } catch (err) { next(err); }
});

module.exports = router;

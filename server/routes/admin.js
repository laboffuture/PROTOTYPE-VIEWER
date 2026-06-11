const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Session = require('../models/Session');
const Model = require('../models/Model');
const Vote = require('../models/Vote');
const LibraryModel = require('../models/LibraryModel');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/admin/login
// Body: { username, password }
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password required' });
  }
  if (
    username !== process.env.ADMIN_USERNAME ||
    password !== process.env.ADMIN_PASSWORD
  ) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '24h' });
  res.json({ token });
});

// GET /api/admin/sessions — list all sessions
router.get('/sessions', requireAuth, async (req, res, next) => {
  try {
    const sessions = await Session.find().sort({ createdAt: -1 });
    const list = await Promise.all(sessions.map(async (s) => {
      const modelCount = await Model.countDocuments({ sessionId: s._id });
      return { id: s._id, name: s.name, status: s.status, modelCount, createdAt: s.createdAt };
    }));
    res.json({ sessions: list });
  } catch (err) { next(err); }
});

// POST /api/admin/sessions — create a new session
// Body: { name, copyModelIds? } — copyModelIds copies prototypes from the
// library into the new batch, in the order given.
router.post('/sessions', requireAuth, async (req, res, next) => {
  try {
    const { name, copyModelIds } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });

    let sources = [];
    if (copyModelIds !== undefined) {
      if (!Array.isArray(copyModelIds) || copyModelIds.some((id) => !mongoose.isValidObjectId(id))) {
        return res.status(400).json({ error: 'copyModelIds must be an array of valid model ids' });
      }
      const found = await LibraryModel.find({ _id: { $in: copyModelIds } });
      const byId = new Map(found.map((m) => [m._id.toString(), m]));
      sources = copyModelIds.map((id) => byId.get(String(id)));
      if (sources.some((m) => !m)) {
        return res.status(400).json({ error: 'One or more selected prototypes were not found' });
      }
    }

    const session = await Session.create({ name });
    if (sources.length) {
      await Model.create(sources.map((m, i) => ({
        sessionId: session._id,
        name: m.name,
        sketchfabEmbedUrl: m.sketchfabEmbedUrl,
        description: m.description,
        order: i + 1,
      })));
    }
    res.status(201).json({
      id: session._id,
      name: session.name,
      status: session.status,
      modelCount: sources.length,
    });
  } catch (err) { next(err); }
});

// DELETE /api/admin/sessions/:id — delete a batch with its models and votes
router.delete('/sessions/:id', requireAuth, async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.status === 'open') {
      return res.status(400).json({ error: 'Close voting before deleting the batch' });
    }
    await Session.findByIdAndDelete(session._id);
    await Model.deleteMany({ sessionId: session._id });
    await Vote.deleteMany({ sessionId: session._id });
    res.status(204).send();
  } catch (err) { next(err); }
});

// PATCH /api/admin/sessions/:id/status
router.patch('/sessions/:id/status', requireAuth, async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['open', 'closed'].includes(status)) {
      return res.status(400).json({ error: 'status must be open or closed' });
    }
    if (status === 'open') {
      const modelCount = await Model.countDocuments({ sessionId: req.params.id });
      if (modelCount === 0) {
        return res.status(400).json({ error: 'Add at least one prototype before opening voting' });
      }
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
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.status === 'open') {
      return res.status(400).json({ error: 'Cannot add models while session is open' });
    }
    const { name, sketchfabEmbedUrl, description } = req.body;
    if (!name || !sketchfabEmbedUrl) {
      return res.status(400).json({ error: 'name and sketchfabEmbedUrl required' });
    }
    const count = await Model.countDocuments({ sessionId: req.params.id });
    const model = await Model.create({
      sessionId: req.params.id,
      name,
      sketchfabEmbedUrl,
      description: description || '',
      order: count + 1,
    });
    res.status(201).json({
      id: model._id,
      name: model.name,
      sketchfabEmbedUrl: model.sketchfabEmbedUrl,
      description: model.description,
      order: model.order,
    });
  } catch (err) { next(err); }
});

// DELETE /api/admin/sessions/:id/models/:modelId
router.delete('/sessions/:id/models/:modelId', requireAuth, async (req, res, next) => {
  try {
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

// ── Prototype library ──────────────────────────────────────────────
// The master list of prototypes; batches receive copies of these.

// GET /api/admin/library — all prototypes, newest first
router.get('/library', requireAuth, async (req, res, next) => {
  try {
    const prototypes = await LibraryModel.find().sort({ createdAt: -1 });
    res.json({
      prototypes: prototypes.map((p) => ({
        id: p._id,
        name: p.name,
        sketchfabEmbedUrl: p.sketchfabEmbedUrl,
        description: p.description,
      })),
    });
  } catch (err) { next(err); }
});

// POST /api/admin/library — add a prototype
router.post('/library', requireAuth, async (req, res, next) => {
  try {
    const { name, sketchfabEmbedUrl, description } = req.body;
    if (!name || !sketchfabEmbedUrl) {
      return res.status(400).json({ error: 'name and sketchfabEmbedUrl required' });
    }
    const existing = await LibraryModel.findOne({ sketchfabEmbedUrl });
    if (existing) {
      return res.status(400).json({ error: 'A prototype with this embed URL is already in the library' });
    }
    const proto = await LibraryModel.create({ name, sketchfabEmbedUrl, description: description || '' });
    res.status(201).json({
      id: proto._id,
      name: proto.name,
      sketchfabEmbedUrl: proto.sketchfabEmbedUrl,
      description: proto.description,
    });
  } catch (err) { next(err); }
});

// PATCH /api/admin/library/:id — edit name/description/url
router.patch('/library/:id', requireAuth, async (req, res, next) => {
  try {
    const update = {};
    for (const field of ['name', 'sketchfabEmbedUrl', 'description']) {
      if (req.body[field] !== undefined) update[field] = req.body[field];
    }
    if (update.name === '' || update.sketchfabEmbedUrl === '') {
      return res.status(400).json({ error: 'name and sketchfabEmbedUrl cannot be empty' });
    }
    const proto = await LibraryModel.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!proto) return res.status(404).json({ error: 'Prototype not found' });
    res.json({
      id: proto._id,
      name: proto.name,
      sketchfabEmbedUrl: proto.sketchfabEmbedUrl,
      description: proto.description,
    });
  } catch (err) { next(err); }
});

// DELETE /api/admin/library/:id — remove from library
// (copies already placed in batches are untouched)
router.delete('/library/:id', requireAuth, async (req, res, next) => {
  try {
    const proto = await LibraryModel.findByIdAndDelete(req.params.id);
    if (!proto) return res.status(404).json({ error: 'Prototype not found' });
    res.status(204).send();
  } catch (err) { next(err); }
});

// GET /api/admin/sessions/:id/results
router.get('/sessions/:id/results', requireAuth, async (req, res, next) => {
  try {
    const models = await Model.find({ sessionId: req.params.id }).sort({ order: 1 });
    const results = await Promise.all(
      models.map(async (model) => {
        const votes = await Vote.find({ modelId: model._id });
        const avg = votes.length > 0
          ? votes.reduce((sum, v) => sum + v.rating, 0) / votes.length
          : 0;
        const distribution = [0, 0, 0, 0, 0]; // index 0 = 1 star ... index 4 = 5 stars
        votes.forEach((v) => { distribution[v.rating - 1] += 1; });
        return {
          id: model._id,
          name: model.name,
          averageRating: Math.round(avg * 10) / 10,
          voteCount: votes.length,
          distribution,
        };
      })
    );
    results.sort((a, b) => b.averageRating - a.averageRating);
    res.json({ results });
  } catch (err) { next(err); }
});

module.exports = router;

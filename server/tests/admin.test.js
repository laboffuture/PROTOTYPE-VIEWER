process.env.JWT_SECRET = 'test-secret';
process.env.ADMIN_MASTER_SECRET = 'master-secret';

const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = require('../index');
const Session = require('../models/Session');
const Model = require('../models/Model');
const Vote = require('../models/Vote');

describe('POST /api/admin/sessions — create session', () => {
  it('creates session with valid master secret', async () => {
    const res = await request(app)
      .post('/api/admin/sessions')
      .send({ name: 'Batch 3', password: 'adminpass', masterSecret: 'master-secret' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Batch 3');
    expect(res.body.status).toBe('closed');
    expect(res.body.sessionId).toBeDefined();
  });

  it('rejects wrong master secret', async () => {
    const res = await request(app)
      .post('/api/admin/sessions')
      .send({ name: 'X', password: 'pw', masterSecret: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('rejects missing name', async () => {
    const res = await request(app)
      .post('/api/admin/sessions')
      .send({ password: 'pw', masterSecret: 'master-secret' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/admin/login', () => {
  let session;
  beforeEach(async () => {
    session = await Session.create({
      name: 'Test',
      adminPasswordHash: await bcrypt.hash('adminpass', 10),
    });
  });

  it('returns JWT on valid password', async () => {
    const res = await request(app)
      .post('/api/admin/login')
      .send({ sessionId: session._id.toString(), password: 'adminpass' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    const decoded = jwt.verify(res.body.token, 'test-secret');
    expect(decoded.sessionId).toBe(session._id.toString());
  });

  it('rejects wrong password', async () => {
    const res = await request(app)
      .post('/api/admin/login')
      .send({ sessionId: session._id.toString(), password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('rejects unknown sessionId', async () => {
    const res = await request(app)
      .post('/api/admin/login')
      .send({ sessionId: '000000000000000000000000', password: 'pw' });
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/admin/sessions/:id/status', () => {
  let session, token;
  beforeEach(async () => {
    session = await Session.create({
      name: 'Test',
      adminPasswordHash: await bcrypt.hash('pass', 10),
    });
    token = jwt.sign({ sessionId: session._id.toString() }, 'test-secret', { expiresIn: '1h' });
  });

  it('opens a closed session', async () => {
    const res = await request(app)
      .patch(`/api/admin/sessions/${session._id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'open' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('open');
  });

  it('closes an open session', async () => {
    await Session.findByIdAndUpdate(session._id, { status: 'open' });
    const res = await request(app)
      .patch(`/api/admin/sessions/${session._id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'closed' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('closed');
    const updated = await Session.findById(session._id);
    expect(updated.closedAt).not.toBeNull();
  });

  it('rejects without JWT', async () => {
    const res = await request(app)
      .patch(`/api/admin/sessions/${session._id}/status`)
      .send({ status: 'open' });
    expect(res.status).toBe(401);
  });

  it('rejects JWT for different session', async () => {
    const other = await Session.create({
      name: 'Other',
      adminPasswordHash: await bcrypt.hash('p', 10),
    });
    const res = await request(app)
      .patch(`/api/admin/sessions/${other._id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'open' });
    expect(res.status).toBe(403);
  });
});

describe('POST /api/admin/sessions/:id/models', () => {
  let session, token;
  beforeEach(async () => {
    session = await Session.create({
      name: 'Test',
      adminPasswordHash: await bcrypt.hash('pass', 10),
      status: 'closed',
    });
    token = jwt.sign({ sessionId: session._id.toString() }, 'test-secret', { expiresIn: '1h' });
  });

  it('adds a model to a closed session', async () => {
    const res = await request(app)
      .post(`/api/admin/sessions/${session._id}/models`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Heat Seek Rover', sketchfabEmbedUrl: 'https://sketchfab.com/models/abc/embed' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Heat Seek Rover');
    expect(res.body.order).toBe(1);
  });

  it('increments order on second model', async () => {
    const body = { name: 'M', sketchfabEmbedUrl: 'https://sketchfab.com/models/x/embed' };
    await request(app)
      .post(`/api/admin/sessions/${session._id}/models`)
      .set('Authorization', `Bearer ${token}`)
      .send(body);
    const res = await request(app)
      .post(`/api/admin/sessions/${session._id}/models`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'M2', sketchfabEmbedUrl: 'https://sketchfab.com/models/y/embed' });
    expect(res.body.order).toBe(2);
  });

  it('rejects adding model to open session', async () => {
    await Session.findByIdAndUpdate(session._id, { status: 'open' });
    const res = await request(app)
      .post(`/api/admin/sessions/${session._id}/models`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'M', sketchfabEmbedUrl: 'https://sketchfab.com/models/z/embed' });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/admin/sessions/:id/models/:modelId', () => {
  let session, model, token;
  beforeEach(async () => {
    session = await Session.create({
      name: 'Test',
      adminPasswordHash: await bcrypt.hash('pass', 10),
      status: 'closed',
    });
    model = await Model.create({
      sessionId: session._id,
      name: 'M',
      sketchfabEmbedUrl: 'https://sketchfab.com/models/x/embed',
      order: 1,
    });
    token = jwt.sign({ sessionId: session._id.toString() }, 'test-secret', { expiresIn: '1h' });
  });

  it('deletes model from closed session', async () => {
    const res = await request(app)
      .delete(`/api/admin/sessions/${session._id}/models/${model._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);
    expect(await Model.findById(model._id)).toBeNull();
  });

  it('rejects deleting model from open session', async () => {
    await Session.findByIdAndUpdate(session._id, { status: 'open' });
    const res = await request(app)
      .delete(`/api/admin/sessions/${session._id}/models/${model._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });
});

describe('GET /api/admin/sessions/:id/results', () => {
  let session, model1, model2, token;
  beforeEach(async () => {
    session = await Session.create({
      name: 'Test',
      adminPasswordHash: await bcrypt.hash('pass', 10),
      status: 'open',
    });
    model1 = await Model.create({
      sessionId: session._id,
      name: 'Heat Seek Rover',
      sketchfabEmbedUrl: 'https://sketchfab.com/models/abc/embed',
      order: 1,
    });
    model2 = await Model.create({
      sessionId: session._id,
      name: 'Catapult Glider',
      sketchfabEmbedUrl: 'https://sketchfab.com/models/def/embed',
      order: 2,
    });
    await Vote.insertMany([
      { sessionId: session._id, modelId: model1._id, voterUUID: 'u1', rating: 5 },
      { sessionId: session._id, modelId: model1._id, voterUUID: 'u2', rating: 3 },
      { sessionId: session._id, modelId: model2._id, voterUUID: 'u1', rating: 5 },
    ]);
    token = jwt.sign({ sessionId: session._id.toString() }, 'test-secret', { expiresIn: '1h' });
  });

  it('returns models sorted by average rating descending', async () => {
    const res = await request(app)
      .get(`/api/admin/sessions/${session._id}/results`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.results[0].name).toBe('Catapult Glider');
    expect(res.body.results[0].averageRating).toBe(5.0);
    expect(res.body.results[0].voteCount).toBe(1);
    expect(res.body.results[1].name).toBe('Heat Seek Rover');
    expect(res.body.results[1].averageRating).toBe(4.0);
  });
});

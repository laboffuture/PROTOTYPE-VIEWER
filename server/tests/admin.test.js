process.env.JWT_SECRET = 'test-secret';
process.env.ADMIN_USERNAME = 'admin';
process.env.ADMIN_PASSWORD = 'test-pass';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../index');
const Session = require('../models/Session');
const Model = require('../models/Model');
const Vote = require('../models/Vote');

const adminToken = () => jwt.sign({ role: 'admin' }, 'test-secret', { expiresIn: '1h' });

describe('POST /api/admin/login', () => {
  it('returns JWT on valid credentials', async () => {
    const res = await request(app)
      .post('/api/admin/login')
      .send({ username: 'admin', password: 'test-pass' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    const decoded = jwt.verify(res.body.token, 'test-secret');
    expect(decoded.role).toBe('admin');
  });

  it('rejects wrong password', async () => {
    const res = await request(app)
      .post('/api/admin/login')
      .send({ username: 'admin', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('rejects missing fields', async () => {
    const res = await request(app).post('/api/admin/login').send({ username: 'admin' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/admin/sessions — create batch', () => {
  it('creates a batch', async () => {
    const res = await request(app)
      .post('/api/admin/sessions')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ name: 'Batch 3' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Batch 3');
    expect(res.body.status).toBe('closed');
    expect(res.body.modelCount).toBe(0);
  });

  it('rejects missing name', async () => {
    const res = await request(app)
      .post('/api/admin/sessions')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('rejects without JWT', async () => {
    const res = await request(app).post('/api/admin/sessions').send({ name: 'X' });
    expect(res.status).toBe(401);
  });

  it('copies selected models from another batch, preserving picked order', async () => {
    const library = await Session.create({ name: 'Library' });
    const m1 = await Model.create({ sessionId: library._id, name: 'Rover', sketchfabEmbedUrl: 'https://sketchfab.com/models/a/embed', description: 'd1', order: 1 });
    const m2 = await Model.create({ sessionId: library._id, name: 'Glider', sketchfabEmbedUrl: 'https://sketchfab.com/models/b/embed', description: 'd2', order: 2 });

    const res = await request(app)
      .post('/api/admin/sessions')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ name: 'Review Round 1', copyModelIds: [m2._id.toString(), m1._id.toString()] });
    expect(res.status).toBe(201);
    expect(res.body.modelCount).toBe(2);

    const copies = await Model.find({ sessionId: res.body.id }).sort({ order: 1 });
    expect(copies).toHaveLength(2);
    expect(copies[0].name).toBe('Glider');
    expect(copies[0].order).toBe(1);
    expect(copies[1].name).toBe('Rover');
    // originals untouched
    expect(await Model.countDocuments({ sessionId: library._id })).toBe(2);
  });

  it('rejects copyModelIds containing unknown model', async () => {
    const res = await request(app)
      .post('/api/admin/sessions')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ name: 'X', copyModelIds: ['000000000000000000000000'] });
    expect(res.status).toBe(400);
    expect(await Session.countDocuments({ name: 'X' })).toBe(0);
  });

  it('rejects malformed copyModelIds', async () => {
    const res = await request(app)
      .post('/api/admin/sessions')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ name: 'X', copyModelIds: ['not-an-id'] });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/admin/sessions', () => {
  it('lists batches with model counts', async () => {
    const s = await Session.create({ name: 'Listed' });
    await Model.create({ sessionId: s._id, name: 'M', sketchfabEmbedUrl: 'https://sketchfab.com/models/x/embed', order: 1 });
    const res = await request(app)
      .get('/api/admin/sessions')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.sessions).toHaveLength(1);
    expect(res.body.sessions[0].modelCount).toBe(1);
  });
});

describe('PATCH /api/admin/sessions/:id/status', () => {
  let session;
  beforeEach(async () => {
    session = await Session.create({ name: 'Test' });
  });

  it('refuses to open a batch with no models', async () => {
    const res = await request(app)
      .patch(`/api/admin/sessions/${session._id}/status`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ status: 'open' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/at least one prototype/i);
    expect((await Session.findById(session._id)).status).toBe('closed');
  });

  it('opens a batch that has models', async () => {
    await Model.create({ sessionId: session._id, name: 'M', sketchfabEmbedUrl: 'https://sketchfab.com/models/x/embed', order: 1 });
    const res = await request(app)
      .patch(`/api/admin/sessions/${session._id}/status`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ status: 'open' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('open');
  });

  it('closes an open batch and sets closedAt', async () => {
    await Session.findByIdAndUpdate(session._id, { status: 'open' });
    const res = await request(app)
      .patch(`/api/admin/sessions/${session._id}/status`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ status: 'closed' });
    expect(res.status).toBe(200);
    expect((await Session.findById(session._id)).closedAt).not.toBeNull();
  });

  it('rejects without JWT', async () => {
    const res = await request(app)
      .patch(`/api/admin/sessions/${session._id}/status`)
      .send({ status: 'open' });
    expect(res.status).toBe(401);
  });

  it('returns 404 for malformed id', async () => {
    const res = await request(app)
      .patch('/api/admin/sessions/not-an-id/status')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ status: 'closed' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/admin/sessions/:id — delete batch', () => {
  it('deletes the batch with its models and votes', async () => {
    const session = await Session.create({ name: 'Doomed' });
    const model = await Model.create({ sessionId: session._id, name: 'M', sketchfabEmbedUrl: 'https://sketchfab.com/models/x/embed', order: 1 });
    await Vote.create({ sessionId: session._id, modelId: model._id, voterUUID: 'u1', rating: 4 });

    const res = await request(app)
      .delete(`/api/admin/sessions/${session._id}`)
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(204);
    expect(await Session.findById(session._id)).toBeNull();
    expect(await Model.countDocuments({ sessionId: session._id })).toBe(0);
    expect(await Vote.countDocuments({ sessionId: session._id })).toBe(0);
  });

  it('refuses to delete a batch while voting is open', async () => {
    const session = await Session.create({ name: 'Live', status: 'open' });
    const res = await request(app)
      .delete(`/api/admin/sessions/${session._id}`)
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/close voting/i);
    expect(await Session.findById(session._id)).not.toBeNull();
  });

  it('returns 404 for unknown batch', async () => {
    const res = await request(app)
      .delete('/api/admin/sessions/000000000000000000000000')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(404);
  });

  it('rejects without JWT', async () => {
    const session = await Session.create({ name: 'Kept' });
    const res = await request(app).delete(`/api/admin/sessions/${session._id}`);
    expect(res.status).toBe(401);
    expect(await Session.findById(session._id)).not.toBeNull();
  });
});

describe('POST /api/admin/sessions/:id/models', () => {
  let session;
  beforeEach(async () => {
    session = await Session.create({ name: 'Test', status: 'closed' });
  });

  it('adds a model to a closed batch', async () => {
    const res = await request(app)
      .post(`/api/admin/sessions/${session._id}/models`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ name: 'Heat Seek Rover', sketchfabEmbedUrl: 'https://sketchfab.com/models/abc/embed' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Heat Seek Rover');
    expect(res.body.order).toBe(1);
  });

  it('increments order on second model', async () => {
    await request(app)
      .post(`/api/admin/sessions/${session._id}/models`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ name: 'M', sketchfabEmbedUrl: 'https://sketchfab.com/models/x/embed' });
    const res = await request(app)
      .post(`/api/admin/sessions/${session._id}/models`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ name: 'M2', sketchfabEmbedUrl: 'https://sketchfab.com/models/y/embed' });
    expect(res.body.order).toBe(2);
  });

  it('rejects adding model to open batch', async () => {
    await Model.create({ sessionId: session._id, name: 'M0', sketchfabEmbedUrl: 'https://sketchfab.com/models/0/embed', order: 1 });
    await Session.findByIdAndUpdate(session._id, { status: 'open' });
    const res = await request(app)
      .post(`/api/admin/sessions/${session._id}/models`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ name: 'M', sketchfabEmbedUrl: 'https://sketchfab.com/models/z/embed' });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/admin/sessions/:id/models/:modelId', () => {
  let session, model;
  beforeEach(async () => {
    session = await Session.create({ name: 'Test', status: 'closed' });
    model = await Model.create({ sessionId: session._id, name: 'M', sketchfabEmbedUrl: 'https://sketchfab.com/models/x/embed', order: 1 });
  });

  it('deletes model from closed batch', async () => {
    const res = await request(app)
      .delete(`/api/admin/sessions/${session._id}/models/${model._id}`)
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(204);
    expect(await Model.findById(model._id)).toBeNull();
  });

  it('rejects deleting model from open batch', async () => {
    await Session.findByIdAndUpdate(session._id, { status: 'open' });
    const res = await request(app)
      .delete(`/api/admin/sessions/${session._id}/models/${model._id}`)
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(400);
  });
});

describe('GET /api/admin/sessions/:id/results', () => {
  let session, model1, model2;
  beforeEach(async () => {
    session = await Session.create({ name: 'Test', status: 'open' });
    model1 = await Model.create({ sessionId: session._id, name: 'Heat Seek Rover', sketchfabEmbedUrl: 'https://sketchfab.com/models/abc/embed', order: 1 });
    model2 = await Model.create({ sessionId: session._id, name: 'Catapult Glider', sketchfabEmbedUrl: 'https://sketchfab.com/models/def/embed', order: 2 });
    await Vote.insertMany([
      { sessionId: session._id, modelId: model1._id, voterUUID: 'u1', rating: 5 },
      { sessionId: session._id, modelId: model1._id, voterUUID: 'u2', rating: 3 },
      { sessionId: session._id, modelId: model2._id, voterUUID: 'u1', rating: 5 },
    ]);
  });

  it('returns models sorted by average rating with star distribution', async () => {
    const res = await request(app)
      .get(`/api/admin/sessions/${session._id}/results`)
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.results[0].name).toBe('Catapult Glider');
    expect(res.body.results[0].averageRating).toBe(5.0);
    expect(res.body.results[0].voteCount).toBe(1);
    expect(res.body.results[0].distribution).toEqual([0, 0, 0, 0, 1]);
    expect(res.body.results[1].name).toBe('Heat Seek Rover');
    expect(res.body.results[1].averageRating).toBe(4.0);
    expect(res.body.results[1].distribution).toEqual([0, 0, 1, 0, 1]);
  });
});

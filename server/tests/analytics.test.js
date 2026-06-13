process.env.JWT_SECRET = 'test-secret';
process.env.ADMIN_USERNAME = 'admin';
process.env.ADMIN_PASSWORD = 'test-pass';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../index');
const Session = require('../models/Session');
const Model = require('../models/Model');
const Vote = require('../models/Vote');
const View = require('../models/View');

const adminToken = () => jwt.sign({ role: 'admin' }, 'test-secret', { expiresIn: '1h' });

const SHARED_URL = 'https://sketchfab.com/models/shared/embed';
const GLIDER_URL = 'https://sketchfab.com/models/glider/embed';

describe('GET /api/admin/analytics', () => {
  let sessionA, sessionB;

  beforeEach(async () => {
    // Two batches; "Rover" (same embed URL) appears in both — it must collapse
    // into a single prototype row spanning 2 batches.
    sessionA = await Session.create({ name: 'Round A', status: 'closed' });
    sessionB = await Session.create({ name: 'Round B', status: 'open' });

    const roverA = await Model.create({ sessionId: sessionA._id, name: 'Rover', sketchfabEmbedUrl: SHARED_URL, order: 1 });
    const gliderA = await Model.create({ sessionId: sessionA._id, name: 'Glider', sketchfabEmbedUrl: GLIDER_URL, order: 2 });
    const roverB = await Model.create({ sessionId: sessionB._id, name: 'Rover', sketchfabEmbedUrl: SHARED_URL, order: 1 });

    await Vote.insertMany([
      { sessionId: sessionA._id, modelId: roverA._id, voterUUID: 'u1', rating: 5 },
      { sessionId: sessionA._id, modelId: roverA._id, voterUUID: 'u2', rating: 3 },
      { sessionId: sessionA._id, modelId: gliderA._id, voterUUID: 'u1', rating: 4 },
      { sessionId: sessionB._id, modelId: roverB._id, voterUUID: 'u3', rating: 4 },
      { sessionId: sessionB._id, modelId: roverB._id, voterUUID: 'u4', rating: 2 },
    ]);

    await View.insertMany([
      { sessionId: sessionA._id, voterUUID: 'u1' },
      { sessionId: sessionA._id, voterUUID: 'u2' },
      { sessionId: sessionB._id, voterUUID: 'u3' },
    ]);
  });

  it('returns program-wide totals', async () => {
    const res = await request(app)
      .get('/api/admin/analytics')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.totals).toEqual({
      batches: 2,
      prototypes: 2, // shared URL + glider URL
      votes: 5,
      voters: 4, // u1, u2, u3, u4
      opens: 3,
    });
  });

  it('groups a shared prototype across batches by embed URL', async () => {
    const res = await request(app)
      .get('/api/admin/analytics')
      .set('Authorization', `Bearer ${adminToken()}`);
    const rover = res.body.prototypes.find((p) => p.sketchfabEmbedUrl === SHARED_URL);
    expect(rover).toBeDefined();
    expect(rover.name).toBe('Rover');
    expect(rover.voteCount).toBe(4); // 5,3,4,2
    expect(rover.averageRating).toBe(3.5);
    expect(rover.distribution).toEqual([0, 1, 1, 1, 1]); // one each of 2★,3★,4★,5★
    expect(rover.batchCount).toBe(2);
  });

  it('ranks prototypes by average rating, best first', async () => {
    const res = await request(app)
      .get('/api/admin/analytics')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.body.prototypes.map((p) => p.name)).toEqual(['Glider', 'Rover']); // 4.0 then 3.5
  });

  it('reports per-batch opens, voters, and the winning prototype', async () => {
    const res = await request(app)
      .get('/api/admin/analytics')
      .set('Authorization', `Bearer ${adminToken()}`);
    const batchB = res.body.batches.find((b) => b.id === sessionB._id.toString());
    expect(batchB.opens).toBe(1);
    expect(batchB.voters).toBe(2); // u3, u4
    expect(batchB.voteCount).toBe(2);
    expect(batchB.leader.name).toBe('Rover');

    const batchA = res.body.batches.find((b) => b.id === sessionA._id.toString());
    expect(batchA.opens).toBe(2);
    expect(batchA.voters).toBe(2); // u1, u2
  });

  it('rejects without JWT', async () => {
    const res = await request(app).get('/api/admin/analytics');
    expect(res.status).toBe(401);
  });

  it('returns empty shape when there is no data', async () => {
    await Promise.all([Session.deleteMany({}), Model.deleteMany({}), Vote.deleteMany({}), View.deleteMany({})]);
    const res = await request(app)
      .get('/api/admin/analytics')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.totals).toEqual({ batches: 0, prototypes: 0, votes: 0, voters: 0, opens: 0 });
    expect(res.body.prototypes).toEqual([]);
    expect(res.body.batches).toEqual([]);
  });
});

describe('POST /api/sessions/:id/open', () => {
  let session;
  beforeEach(async () => {
    session = await Session.create({ name: 'Openable', status: 'open' });
  });

  it('records an open for a device', async () => {
    const res = await request(app)
      .post(`/api/sessions/${session._id}/open`)
      .send({ voterUUID: 'device-1' });
    expect(res.status).toBe(204);
    expect(await View.countDocuments({ sessionId: session._id })).toBe(1);
  });

  it('dedupes repeat opens from the same device', async () => {
    await request(app).post(`/api/sessions/${session._id}/open`).send({ voterUUID: 'device-1' });
    await request(app).post(`/api/sessions/${session._id}/open`).send({ voterUUID: 'device-1' });
    expect(await View.countDocuments({ sessionId: session._id })).toBe(1);
  });

  it('counts two distinct devices as two opens', async () => {
    await request(app).post(`/api/sessions/${session._id}/open`).send({ voterUUID: 'device-1' });
    await request(app).post(`/api/sessions/${session._id}/open`).send({ voterUUID: 'device-2' });
    expect(await View.countDocuments({ sessionId: session._id })).toBe(2);
  });

  it('rejects a missing voterUUID', async () => {
    const res = await request(app).post(`/api/sessions/${session._id}/open`).send({});
    expect(res.status).toBe(400);
  });

  it('returns 404 for an unknown session', async () => {
    const res = await request(app)
      .post('/api/sessions/000000000000000000000000/open')
      .send({ voterUUID: 'device-1' });
    expect(res.status).toBe(404);
  });

  it('returns 404 for a malformed id', async () => {
    const res = await request(app)
      .post('/api/sessions/not-an-id/open')
      .send({ voterUUID: 'device-1' });
    expect(res.status).toBe(404);
  });
});

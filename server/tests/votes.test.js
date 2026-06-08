process.env.JWT_SECRET = 'test-secret';

const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../index');
const Session = require('../models/Session');
const Model = require('../models/Model');
const Vote = require('../models/Vote');

describe('POST /api/votes', () => {
  let session, model1, model2;

  beforeEach(async () => {
    session = await Session.create({
      name: 'Open Session',
      adminPasswordHash: await bcrypt.hash('pass', 10),
      status: 'open',
    });
    model1 = await Model.create({
      sessionId: session._id,
      name: 'Model A',
      sketchfabEmbedUrl: 'https://sketchfab.com/models/a/embed',
      order: 1,
    });
    model2 = await Model.create({
      sessionId: session._id,
      name: 'Model B',
      sketchfabEmbedUrl: 'https://sketchfab.com/models/b/embed',
      order: 2,
    });
  });

  it('saves valid ratings for multiple models', async () => {
    const res = await request(app)
      .post('/api/votes')
      .send({
        sessionId: session._id.toString(),
        voterUUID: 'uuid-abc',
        ratings: [
          { modelId: model1._id.toString(), rating: 4 },
          { modelId: model2._id.toString(), rating: 2 },
        ],
      });
    expect(res.status).toBe(200);
    expect(res.body.saved).toHaveLength(2);
    expect(res.body.saved.every(s => s.saved === true)).toBe(true);
    expect(await Vote.countDocuments()).toBe(2);
  });

  it('rejects vote on closed session', async () => {
    await Session.findByIdAndUpdate(session._id, { status: 'closed' });
    const res = await request(app)
      .post('/api/votes')
      .send({
        sessionId: session._id.toString(),
        voterUUID: 'uuid-xyz',
        ratings: [{ modelId: model1._id.toString(), rating: 3 }],
      });
    expect(res.status).toBe(403);
    expect(await Vote.countDocuments()).toBe(0);
  });

  it('silently skips duplicate vote, saves new model votes', async () => {
    const body = {
      sessionId: session._id.toString(),
      voterUUID: 'uuid-dup',
      ratings: [{ modelId: model1._id.toString(), rating: 4 }],
    };
    await request(app).post('/api/votes').send(body);
    const res = await request(app)
      .post('/api/votes')
      .send({
        sessionId: session._id.toString(),
        voterUUID: 'uuid-dup',
        ratings: [
          { modelId: model1._id.toString(), rating: 5 },
          { modelId: model2._id.toString(), rating: 3 },
        ],
      });
    expect(res.status).toBe(200);
    expect(res.body.saved.find(s => s.modelId === model1._id.toString()).reason).toBe('duplicate');
    expect(res.body.saved.find(s => s.modelId === model2._id.toString()).saved).toBe(true);
    expect(await Vote.countDocuments()).toBe(2);
  });

  it('returns 200 when entire batch is duplicate', async () => {
    const body = {
      sessionId: session._id.toString(),
      voterUUID: 'uuid-alldupe',
      ratings: [{ modelId: model1._id.toString(), rating: 3 }],
    };
    await request(app).post('/api/votes').send(body);
    const res = await request(app).post('/api/votes').send(body);
    expect(res.status).toBe(200);
    expect(res.body.saved[0].saved).toBe(false);
    expect(res.body.saved[0].reason).toBe('duplicate');
    expect(await Vote.countDocuments()).toBe(1);
  });

  it('rejects rating out of range (6)', async () => {
    const res = await request(app)
      .post('/api/votes')
      .send({
        sessionId: session._id.toString(),
        voterUUID: 'uuid-bad',
        ratings: [{ modelId: model1._id.toString(), rating: 6 }],
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('rejects rating out of range (0)', async () => {
    const res = await request(app)
      .post('/api/votes')
      .send({
        sessionId: session._id.toString(),
        voterUUID: 'uuid-bad2',
        ratings: [{ modelId: model1._id.toString(), rating: 0 }],
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('rejects missing voterUUID', async () => {
    const res = await request(app)
      .post('/api/votes')
      .send({
        sessionId: session._id.toString(),
        ratings: [{ modelId: model1._id.toString(), rating: 3 }],
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});

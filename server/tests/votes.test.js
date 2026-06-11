process.env.JWT_SECRET = 'test-secret';

const request = require('supertest');
const app = require('../index');
const Session = require('../models/Session');
const Model = require('../models/Model');
const Vote = require('../models/Vote');

describe('POST /api/votes', () => {
  let session, model1, model2;

  beforeEach(async () => {
    session = await Session.create({ name: 'Open Session', status: 'open' });
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

  const fullRatings = (r1 = 4, r2 = 2) => [
    { modelId: model1._id.toString(), rating: r1 },
    { modelId: model2._id.toString(), rating: r2 },
  ];

  it('saves ratings covering every model in the batch', async () => {
    const res = await request(app)
      .post('/api/votes')
      .send({ sessionId: session._id.toString(), voterUUID: 'uuid-abc', ratings: fullRatings() });
    expect(res.status).toBe(200);
    expect(res.body.saved).toHaveLength(2);
    expect(res.body.saved.every(s => s.saved === true)).toBe(true);
    expect(await Vote.countDocuments()).toBe(2);
  });

  it('rejects partial submission (not every model rated)', async () => {
    const res = await request(app)
      .post('/api/votes')
      .send({
        sessionId: session._id.toString(),
        voterUUID: 'uuid-partial',
        ratings: [{ modelId: model1._id.toString(), rating: 4 }],
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/all prototypes must be rated/i);
    expect(await Vote.countDocuments()).toBe(0);
  });

  it('rejects ratings for a model not in the batch', async () => {
    const other = await Session.create({ name: 'Other', status: 'open' });
    const foreign = await Model.create({
      sessionId: other._id,
      name: 'Foreign',
      sketchfabEmbedUrl: 'https://sketchfab.com/models/f/embed',
      order: 1,
    });
    const res = await request(app)
      .post('/api/votes')
      .send({
        sessionId: session._id.toString(),
        voterUUID: 'uuid-foreign',
        ratings: [...fullRatings(), { modelId: foreign._id.toString(), rating: 5 }],
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not in this batch/i);
    expect(await Vote.countDocuments()).toBe(0);
  });

  it('rejects vote on closed session', async () => {
    await Session.findByIdAndUpdate(session._id, { status: 'closed' });
    const res = await request(app)
      .post('/api/votes')
      .send({ sessionId: session._id.toString(), voterUUID: 'uuid-xyz', ratings: fullRatings() });
    expect(res.status).toBe(403);
    expect(await Vote.countDocuments()).toBe(0);
  });

  it('silently skips duplicates on full resubmission', async () => {
    await request(app)
      .post('/api/votes')
      .send({ sessionId: session._id.toString(), voterUUID: 'uuid-dup', ratings: fullRatings() });
    const res = await request(app)
      .post('/api/votes')
      .send({ sessionId: session._id.toString(), voterUUID: 'uuid-dup', ratings: fullRatings(5, 3) });
    expect(res.status).toBe(200);
    expect(res.body.saved.every(s => s.saved === false && s.reason === 'duplicate')).toBe(true);
    expect(await Vote.countDocuments()).toBe(2);
  });

  it('rejects rating out of range (6)', async () => {
    const res = await request(app)
      .post('/api/votes')
      .send({ sessionId: session._id.toString(), voterUUID: 'uuid-bad', ratings: fullRatings(6, 2) });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('rejects rating out of range (0)', async () => {
    const res = await request(app)
      .post('/api/votes')
      .send({ sessionId: session._id.toString(), voterUUID: 'uuid-bad2', ratings: fullRatings(0, 2) });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('rejects missing voterUUID', async () => {
    const res = await request(app)
      .post('/api/votes')
      .send({ sessionId: session._id.toString(), ratings: fullRatings() });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 404 for malformed sessionId', async () => {
    const res = await request(app)
      .post('/api/votes')
      .send({ sessionId: 'not-an-id', voterUUID: 'uuid-mal', ratings: fullRatings() });
    expect(res.status).toBe(404);
  });

  it('returns 404 for unknown sessionId', async () => {
    const res = await request(app)
      .post('/api/votes')
      .send({ sessionId: '000000000000000000000000', voterUUID: 'uuid-unk', ratings: fullRatings() });
    expect(res.status).toBe(404);
  });
});

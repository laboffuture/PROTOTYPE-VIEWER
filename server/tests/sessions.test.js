process.env.JWT_SECRET = 'test-secret';

const request = require('supertest');
const app = require('../index');
const Session = require('../models/Session');
const Model = require('../models/Model');

describe('GET /api/sessions/:id', () => {
  it('returns session info and ordered models list', async () => {
    const session = await Session.create({ name: 'Test Session', status: 'open' });
    await Model.create({
      sessionId: session._id,
      name: 'Model B',
      sketchfabEmbedUrl: 'https://sketchfab.com/models/b/embed',
      order: 2,
    });
    await Model.create({
      sessionId: session._id,
      name: 'Model A',
      sketchfabEmbedUrl: 'https://sketchfab.com/models/a/embed',
      order: 1,
    });
    const res = await request(app).get(`/api/sessions/${session._id}`);
    expect(res.status).toBe(200);
    expect(res.body.session.name).toBe('Test Session');
    expect(res.body.session.status).toBe('open');
    expect(Object.keys(res.body.session)).toEqual(['id', 'name', 'status']);
    expect(res.body.models).toHaveLength(2);
    expect(res.body.models[0].name).toBe('Model A');
    expect(res.body.models[1].name).toBe('Model B');
  });

  it('returns 404 for unknown session', async () => {
    const res = await request(app).get('/api/sessions/000000000000000000000000');
    expect(res.status).toBe(404);
  });

  it('returns 404 (not 500) for malformed session id', async () => {
    const res = await request(app).get('/api/sessions/definitely-not-an-objectid');
    expect(res.status).toBe(404);
  });
});

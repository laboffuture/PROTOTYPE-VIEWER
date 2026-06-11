const Session = require('../models/Session');
const Model = require('../models/Model');
const Vote = require('../models/Vote');

describe('Session model', () => {
  it('saves with required fields', async () => {
    const s = await Session.create({ name: 'Test Session' });
    expect(s.status).toBe('closed');
    expect(s.name).toBe('Test Session');
  });

  it('rejects without name', async () => {
    await expect(Session.create({})).rejects.toThrow();
  });
});

describe('Vote model unique index', () => {
  it('rejects duplicate (sessionId, modelId, voterUUID)', async () => {
    const session = await Session.create({ name: 'S' });
    const model = await Model.create({
      sessionId: session._id, name: 'M',
      sketchfabEmbedUrl: 'https://sketchfab.com/embed/1', order: 1,
    });
    await Vote.create({ sessionId: session._id, modelId: model._id, voterUUID: 'uuid-1', rating: 4 });
    await expect(
      Vote.create({ sessionId: session._id, modelId: model._id, voterUUID: 'uuid-1', rating: 5 })
    ).rejects.toThrow();
  });
});

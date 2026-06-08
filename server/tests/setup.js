const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongod;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
  }
});

afterEach(async () => {
  await Promise.all(
    Object.values(mongoose.connection.collections).map(c => c.deleteMany({}))
  );
});

afterAll(async () => {
  if (mongod) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongod.stop();
    mongod = undefined;
  }
});

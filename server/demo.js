// Demo mode — in-memory MongoDB, no Atlas setup needed
// Run: node demo.js
// Stop: Ctrl+C

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

// Prevent index.js from auto-connecting and auto-listening
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'demo-jwt-secret';
process.env.ADMIN_USERNAME = 'admin';
process.env.ADMIN_PASSWORD = 'demo123';
process.env.CLIENT_URL = 'http://localhost:5173';

const PORT = 4000;

async function start() {
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  const Session = require('./models/Session');
  const Model   = require('./models/Model');

  const session = await Session.create({
    name: 'LOF Batch 3 Prototype Review',
    status: 'open',
  });

  await Model.create([
    {
      sessionId: session._id,
      name: 'Heat Seek Rover',
      sketchfabEmbedUrl: 'https://sketchfab.com/models/9be2f231754a4d8a8e85c3ba5c53bd5c/embed',
      description: 'An autonomous ground vehicle designed for precision target tracking. Features infrared heat detection sensors, an all-terrain drive system, and a rotating turret with a 270° field of view.',
      order: 1,
    },
    {
      sessionId: session._id,
      name: 'Catapult Glider',
      sketchfabEmbedUrl: 'https://sketchfab.com/models/e32f4f01a08f480e93bbac308d0ac825/embed',
      description: 'A hybrid projectile-glider combining a spring-loaded launch mechanism with deployable aerodynamic wings for medium-range payload delivery.',
      order: 2,
    },
  ]);

  const app = require('./index');

  app.listen(PORT, () => {
    console.log('\n================================================');
    console.log('  LOF 3D Viewer — DEMO MODE');
    console.log('================================================');
    console.log('  Server:     http://localhost:' + PORT);
    console.log('  Vote page:  http://localhost:5173/vote/' + session._id);
    console.log('  Admin:      http://localhost:5173/admin');
    console.log('------------------------------------------------');
    console.log('  Username:   admin');
    console.log('  Password:   demo123');
    console.log('================================================\n');
  });

  process.on('SIGINT', async () => {
    await mongoose.connection.close();
    await mongod.stop();
    process.exit(0);
  });
}

start().catch(console.error);

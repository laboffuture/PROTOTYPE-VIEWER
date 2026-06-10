// Seed Atlas with the first session + models
// Run once: node seed.js
require('dotenv').config();
const mongoose = require('mongoose');
const Session = require('./models/Session');
const Model = require('./models/Model');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);

  const existing = await Session.findOne({ name: 'LOF Batch 3 Prototype Review' });
  if (existing) {
    console.log('Session already exists:', existing._id.toString());
    await mongoose.connection.close();
    return;
  }

  const session = await Session.create({
    name: 'LOF Batch 3 Prototype Review',
    status: 'closed',
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

  console.log('Seeded session:', session._id.toString());
  console.log('Vote link: http://localhost:5173/vote/' + session._id.toString());
  await mongoose.connection.close();
}

seed().catch((e) => { console.error(e.message); process.exit(1); });

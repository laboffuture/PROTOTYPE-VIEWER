// Seed Atlas with the full LOF prototype library (all Sketchfab models).
// Idempotent — safe to re-run: matches the batch by name and each model
// by its embed URL, so nothing is ever duplicated.
// Run: node seed-library.js
require('dotenv').config();
const mongoose = require('mongoose');
const Session = require('./models/Session');
const Model = require('./models/Model');

const BATCH_NAME = 'LOF Prototype Library';

const MODELS = [
  { name: '3DOF Robotic Arm',                id: 'eb0aeee7a891400b8ca7a66ad03613e4', description: 'A 3-degree-of-freedom robotic arm prototype.' },
  { name: 'AXES 6 — 6DOF Robotic Arm',       id: 'd1af2a4a14b74189a22d256762be6b0a', description: 'A 6-degree-of-freedom robotic arm with full articulation.' },
  { name: 'Sol Sync',                        id: '46f85104c25c44bf9ede3a11b03847ef', description: 'A solar tracking system prototype.' },
  { name: 'Auto-Stabilized Glider',          id: '007ba68291504d2bb3795806af339487', description: 'A glider with automatic flight stabilization.' },
  { name: '3 Channel RC Plane',              id: 'fe3c35ef26d44be98ad82e4dd795c850', description: 'A 3-channel remote-controlled aircraft.' },
  { name: 'Environmental Monitoring System', id: '4ab8ae87deff4f43ba12cadb40854c0e', description: 'A multi-sensor environmental monitoring station.' },
  { name: 'Darrieus Turbine',                id: 'c389919e62534c65ab3aba81a6eacbad', description: 'A vertical-axis Darrieus wind turbine setup.' },
  { name: 'RC SeaPlane',                     id: '2a1d4bd9177e4abe8f9bcf238fc001e9', description: 'A remote-controlled seaplane for water takeoff and landing.' },
  { name: 'RC Plane',                        id: '02914780c5944e63b23d0fa9be640d60', description: 'A remote-controlled airplane prototype.' },
  { name: 'AtmosSafe',                       id: 'e5111a070f5942609732e05aaf4fba01', description: 'An atmospheric safety monitoring device.' },
  { name: 'Catapult Glider',                 id: 'e32f4f01a08f480e93bbac308d0ac825', description: 'A spring-launched glider with deployable aerodynamic wings.' },
  { name: 'Anti-Icing and De-Icing System',  id: '771acadff4aa424b8652dd8ff74a806e', description: 'A system for preventing and removing ice buildup.' },
  { name: 'Aqua Guardian',                   id: '4c99a1773664461b9b4345dca4d0af93', description: 'A water quality monitoring and protection prototype.' },
  { name: 'Anemometer',                      id: 'e61259227de8459c8f416ab0cef86c30', description: 'A wind speed measurement instrument.' },
  { name: 'Heat Seek Rover',                 id: '9be2f231754a4d8a8e85c3ba5c53bd5c', description: 'An autonomous ground vehicle with infrared heat detection.' },
  { name: 'MiniOrb',                         id: '9cf9005a716b4f45a3e046d7a15a4b39', description: 'A compact spherical prototype device.' },
  { name: 'WeatherScope',                    id: '7133ea701d6d48c694d787e0ab28ab1c', description: 'A weather observation and forecasting station.' },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);

  let session = await Session.findOne({ name: BATCH_NAME });
  if (session) {
    console.log('Batch already exists:', session._id.toString());
  } else {
    session = await Session.create({ name: BATCH_NAME, status: 'closed' });
    console.log('Created batch:', session._id.toString());
  }

  let added = 0;
  let skipped = 0;
  for (let i = 0; i < MODELS.length; i++) {
    const m = MODELS[i];
    const url = `https://sketchfab.com/models/${m.id}/embed`;
    const exists = await Model.findOne({ sessionId: session._id, sketchfabEmbedUrl: url });
    if (exists) {
      skipped++;
      continue;
    }
    await Model.create({
      sessionId: session._id,
      name: m.name,
      sketchfabEmbedUrl: url,
      description: m.description,
      order: i + 1,
    });
    added++;
    console.log(`  + ${m.name}`);
  }

  console.log(`Done. Added ${added}, skipped ${skipped} (already present).`);
  console.log('Vote link: http://localhost:5173/vote/' + session._id.toString());
  await mongoose.connection.close();
}

seed().catch((e) => { console.error(e.message); process.exit(1); });

// Seed the prototype library (LibraryModel collection) with all LOF models.
// Idempotent — safe to re-run: prototypes are matched by embed URL, so
// nothing is ever duplicated. Also migrates away the old "LOF Prototype
// Library" batch from before the library was a first-class collection.
// Run: node seed-library.js
require('dotenv').config();
const mongoose = require('mongoose');
const Session = require('./models/Session');
const Model = require('./models/Model');
const Vote = require('./models/Vote');
const LibraryModel = require('./models/LibraryModel');

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

  let added = 0;
  let skipped = 0;
  for (const m of MODELS) {
    const url = `https://sketchfab.com/models/${m.id}/embed`;
    const exists = await LibraryModel.findOne({ sketchfabEmbedUrl: url });
    if (exists) {
      skipped++;
      continue;
    }
    await LibraryModel.create({ name: m.name, sketchfabEmbedUrl: url, description: m.description });
    added++;
    console.log(`  + ${m.name}`);
  }
  console.log(`Library seeded. Added ${added}, skipped ${skipped} (already present).`);

  // Migration: remove the pre-library-era storage batch, if it exists
  const oldBatch = await Session.findOne({ name: 'LOF Prototype Library' });
  if (oldBatch) {
    await Model.deleteMany({ sessionId: oldBatch._id });
    await Vote.deleteMany({ sessionId: oldBatch._id });
    await Session.findByIdAndDelete(oldBatch._id);
    console.log('Migrated: removed the old "LOF Prototype Library" batch (models now live in the library).');
  }

  await mongoose.connection.close();
}

seed().catch((e) => { console.error(e.message); process.exit(1); });

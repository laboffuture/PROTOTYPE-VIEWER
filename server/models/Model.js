const mongoose = require('mongoose');

const modelSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  name: { type: String, required: true },
  sketchfabEmbedUrl: { type: String, required: true },
  order: { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.model('SessionModel', modelSchema);

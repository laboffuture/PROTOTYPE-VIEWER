const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  modelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Model', required: true },
  voterUUID: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
}, { timestamps: true });

voteSchema.index({ sessionId: 1, modelId: 1, voterUUID: 1 }, { unique: true });

module.exports = mongoose.model('Vote', voteSchema);

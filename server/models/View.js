const mongoose = require('mongoose');

// One document per device that opens a batch's vote link. The unique index
// collapses repeat opens from the same device, so a count of these is the
// number of unique devices that opened the review.
const viewSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  voterUUID: { type: String, required: true },
}, { timestamps: true });

viewSchema.index({ sessionId: 1, voterUUID: 1 }, { unique: true });

module.exports = mongoose.model('View', viewSchema);

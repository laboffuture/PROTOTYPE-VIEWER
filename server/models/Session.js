const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  status: { type: String, enum: ['open', 'closed'], default: 'closed' },
  closedAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Session', sessionSchema);

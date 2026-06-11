const mongoose = require('mongoose');

// A prototype in the master library — independent of any review batch.
// Batches get copies of these, so editing/removing library entries never
// affects past or running reviews.
const libraryModelSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sketchfabEmbedUrl: { type: String, required: true, unique: true },
  description: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('LibraryModel', libraryModelSchema);

const mongoose = require('mongoose');

const ElectionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  logoUrl: { type: String },
  onChainId: { type: Number, unique: true, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  resultsSnapshot: { type: Object, default: null }
});

module.exports = mongoose.model('Election', ElectionSchema); 
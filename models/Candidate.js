const mongoose = require('mongoose');

const CandidateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  birthDate: { type: Date },
  hometown: { type: String },
  position: { type: String },
  achievements: { type: String },
  motto: { type: String },
  imageUrl: { type: String },
  blockchainCandidateId: { type: Number, unique: true, required: true },
  electionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Election', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Candidate', CandidateSchema); 
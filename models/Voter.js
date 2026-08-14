const mongoose = require('mongoose');

const VoterSchema = new mongoose.Schema({
  cccd: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  address: { type: String },
  birthDate: { type: Date },
  password: { type: String, required: true }, // hashed password
  walletAddress: { type: String },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Voter', VoterSchema); 
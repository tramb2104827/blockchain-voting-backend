const mongoose = require('mongoose');

const VoteSchema = new mongoose.Schema({
  electionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Election', required: true },
  voterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Voter', required: true },
  candidateIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true }],
  voteHash: { type: String, unique: true, sparse: true }, // hash của phiếu bầu, unique nhưng cho phép null
  txHash: { type: String }, // hash trên blockchain
  blockNumber: { type: Number },
  timestamp: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Vote', VoteSchema); 
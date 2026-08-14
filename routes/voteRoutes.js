const express = require('express');
const Vote = require('../models/Vote');
const { authMiddleware, adminMiddleware } = require('../middlewares/auth');
const mongoose = require('mongoose');

const router = express.Router();

// Gửi phiếu bầu (cử tri, JWT)
router.post('/', authMiddleware, async (req, res) => {
  try {
    let { electionId, candidateIds, voteHash, txHash, blockNumber } = req.body;
    // Log dữ liệu đầu vào để debug
    console.log('POST /api/votes payload:', { electionId, candidateIds, voteHash, txHash, blockNumber, user: req.user && req.user.id });
    // Nếu electionId là số (onChainId), map sang ObjectId
    if (typeof electionId === 'number' || /^[0-9]+$/.test(electionId)) {
      const election = await require('../models/Election').findOne({ onChainId: Number(electionId) });
      if (!election) return res.status(400).json({ error: 'Không tìm thấy election với onChainId này' });
      electionId = election._id;
    }
    // Validate electionId là ObjectId hợp lệ
    if (!mongoose.Types.ObjectId.isValid(electionId)) {
      return res.status(400).json({ error: 'electionId không hợp lệ' });
    }
    // Nếu candidateIds là mảng số, map từng phần tử sang ObjectId
    if (Array.isArray(candidateIds) && typeof candidateIds[0] === 'number') {
      const Candidate = require('../models/Candidate');
      const cands = await Candidate.find({ blockchainCandidateId: { $in: candidateIds } });
      if (cands.length !== candidateIds.length) return res.status(400).json({ error: 'Không tìm thấy đủ candidate với blockchainCandidateId' });
      candidateIds = cands.map(c => c._id);
    }
    // Validate candidateIds là mảng ObjectId hợp lệ
    if (!Array.isArray(candidateIds) || candidateIds.length === 0 || !candidateIds.every(id => mongoose.Types.ObjectId.isValid(id))) {
      return res.status(400).json({ error: 'candidateIds không hợp lệ' });
    }
    if (!electionId || !candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
      return res.status(400).json({ error: 'Thiếu thông tin phiếu bầu' });
    }
    // Kiểm tra đã bỏ phiếu chưa
    const existing = await Vote.findOne({ electionId, voterId: req.user.id });
    if (existing) {
      return res.status(409).json({ error: 'Bạn đã bỏ phiếu cho cuộc bầu cử này' });
    }
    const vote = new Vote({
      electionId,
      voterId: req.user.id,
      candidateIds,
      voteHash,
      txHash,
      blockNumber
    });
    await vote.save();
    res.status(201).json({ message: 'Bỏ phiếu thành công', vote });
  } catch (err) {
    console.error('Lỗi server khi gửi phiếu bầu:', err);
    res.status(500).json({ error: 'Lỗi server khi gửi phiếu bầu', details: err.message });
  }
});

// Lấy phiếu bầu theo electionId (chỉ admin)
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { electionId } = req.query;
    const filter = {};
    if (electionId) filter.electionId = electionId;
    const votes = await Vote.find(filter).populate('voterId', 'cccd fullName').populate('candidateIds', 'name');
    res.json(votes);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server khi lấy phiếu bầu' });
  }
});

// Lấy phiếu bầu của cử tri hiện tại (JWT)
router.get('/mine', authMiddleware, async (req, res) => {
  try {
    const { electionId } = req.query;
    const filter = { voterId: req.user.id };
    if (electionId) filter.electionId = electionId;
    const votes = await Vote.find(filter).populate('candidateIds', 'name');
    res.json(votes);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server khi lấy phiếu bầu cá nhân' });
  }
});

// Lấy biên lai bỏ phiếu cho cử tri hiện tại (JWT)
router.get('/receipt', authMiddleware, async (req, res) => {
  try {
    const { electionId } = req.query;
    if (!electionId) return res.status(400).json({ error: 'Thiếu electionId' });
    const vote = await Vote.findOne({ electionId, voterId: req.user.id })
      .populate('voterId', 'cccd fullName walletAddress')
      .populate('electionId', 'title');
    if (!vote) return res.status(404).json({ error: 'Không tìm thấy biên lai bỏ phiếu' });
    res.json({
      voterName: vote.voterId.fullName,
      cccd: vote.voterId.cccd,
      walletAddress: vote.voterId.walletAddress,
      electionName: vote.electionId.title,
      voteTime: vote.timestamp,
      blockNumber: vote.blockNumber,
      txHash: vote.txHash
    });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server khi lấy biên lai bỏ phiếu', details: err.message });
  }
});

module.exports = router; 
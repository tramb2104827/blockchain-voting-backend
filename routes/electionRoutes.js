const express = require('express');
const router = express.Router();
const Election = require('../models/Election');
const Vote = require('../models/Vote');
const Candidate = require('../models/Candidate');
const Voter = require('../models/Voter');

// Lấy danh sách tất cả cuộc bầu cử
router.get('/', async (req, res) => {
  try {
    const elections = await Election.find().sort({ createdAt: -1 });
    res.json(elections.map(e => ({
      _id: e._id,
      onChainId: e.onChainId,
      title: e.title,
      description: e.description,
      startTime: e.startTime,
      endTime: e.endTime,
      logoUrl: e.logoUrl,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt
    })));
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server khi lấy danh sách cuộc bầu cử' });
  }
});

// Lấy chi tiết 1 cuộc bầu cử
router.get('/:id', async (req, res) => {
  try {
    const election = await Election.findById(req.params.id);
    if (!election) return res.status(404).json({ error: 'Không tìm thấy cuộc bầu cử' });
    res.json({
      _id: election._id,
      onChainId: election.onChainId,
      title: election.title,
      description: election.description,
      startTime: election.startTime,
      endTime: election.endTime,
      logoUrl: election.logoUrl,
      createdAt: election.createdAt,
      updatedAt: election.updatedAt
    });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server khi lấy chi tiết cuộc bầu cử' });
  }
});

// API trả về kết quả bầu cử
router.get('/:id/results', async (req, res) => {
  try {
    const electionId = req.params.id;
    let election;
    try {
      election = await Election.findById(electionId);
    } catch (e) {
      return res.json({
        electionId,
        totalVotes: 0,
        totalVoters: 0,
        candidates: [],
        winner: null
      });
    }
    if (!election) {
      return res.json({
        electionId,
        totalVotes: 0,
        totalVoters: 0,
        candidates: [],
        winner: null
      });
    }
    // Nếu đã có snapshot thì trả về luôn
    if (election.resultsSnapshot) {
      return res.json(election.resultsSnapshot);
    }
    // Lấy danh sách ứng viên của election
    const candidates = await Candidate.find({ electionId });
    // Nếu không có ứng viên, trả về kết quả rỗng
    if (!candidates.length) {
      return res.json({
        electionId,
        totalVotes: 0,
        totalVoters: 0,
        candidates: [],
        winner: null
      });
    }
    // Lấy tất cả phiếu bầu của election
    const votes = await Vote.find({ electionId });
    // Đếm phiếu cho từng candidate (dùng string)
    const voteCount = {};
    candidates.forEach(c => { voteCount[String(c._id)] = 0; });
    votes.forEach(vote => {
      (vote.candidateIds || []).forEach(cid => {
        const cidStr = String(cid);
        if (cidStr in voteCount) voteCount[cidStr]++;
      });
    });
    // Tổng số phiếu
    const totalVotes = votes.length;
    // Tổng số cử tri
    const totalVoters = await Voter.countDocuments({});
    // Tổng số cử tri đã bỏ phiếu (unique voterId trong votes)
    const uniqueVoters = new Set(votes.map(v => String(v.voterId)));
    const totalVotedVoters = uniqueVoters.size;
    // Tỷ lệ tham gia
    const participationRate = totalVoters > 0 ? (totalVotedVoters / totalVoters) * 100 : 0;
    // Tìm người thắng
    let winner = null;
    let maxVotes = 0;
    candidates.forEach(c => {
      if (voteCount[String(c._id)] > maxVotes) {
        maxVotes = voteCount[String(c._id)];
        winner = c;
      }
    });
    // votesByCandidate cho FE quản trị
    const votesByCandidate = candidates.map(c => ({
      candidate: {
        _id: c._id,
        onChainId: c.onChainId,
        name: c.name,
        position: c.position,
        imageUrl: c.imageUrl,
        birthDate: c.birthDate,
        hometown: c.hometown,
        achievements: c.achievements,
        motto: c.motto
      },
      votes: voteCount[String(c._id)] || 0,
      percentage: totalVotedVoters > 0 ? (voteCount[String(c._id)] / totalVotedVoters) * 100 : 0,
      votedBase: totalVotedVoters
    }));
    const resultObj = {
      electionId,
      totalVotes,
      totalVoters,
      totalVotedVoters,
      participationRate,
      candidates: candidates.map(c => ({
        _id: c._id,
        onChainId: c.onChainId,
        name: c.name,
        voteCount: voteCount[String(c._id)] || 0
      })),
      winner: winner ? { _id: winner._id, onChainId: winner.onChainId, name: winner.name, voteCount: voteCount[String(winner._id)] } : null,
      votesByCandidate
    };
    res.json(resultObj);
  } catch (err) {
    res.json({
      electionId: req.params.id,
      totalVotes: 0,
      totalVoters: 0,
      candidates: [],
      winner: null
    });
  }
});

// Tạo mới cuộc bầu cử
router.post('/', async (req, res) => {
  try {
    const { title, description, startTime, endTime, logoUrl } = req.body;
    // Tìm onChainId lớn nhất hiện tại
    const last = await Election.findOne().sort({ onChainId: -1 });
    const nextOnChainId = last && last.onChainId ? last.onChainId + 1 : 1;
    const newElection = new Election({
      title,
      description,
      startTime,
      endTime,
      logoUrl,
      onChainId: nextOnChainId
    });
    await newElection.save();
    // Trả về object đầy đủ trường onChainId
    res.status(201).json({
      _id: newElection._id,
      onChainId: newElection.onChainId,
      title: newElection.title,
      description: newElection.description,
      startTime: newElection.startTime,
      endTime: newElection.endTime,
      logoUrl: newElection.logoUrl,
      createdAt: newElection.createdAt,
      updatedAt: newElection.updatedAt
    });
  } catch (err) {
    res.status(400).json({ error: 'Lỗi khi tạo cuộc bầu cử', details: err.message });
  }
});

// Cập nhật cuộc bầu cử
router.put('/:id', async (req, res) => {
  try {
    const { title, description, startTime, endTime, logoUrl } = req.body;
    const updated = await Election.findByIdAndUpdate(
      req.params.id,
      { title, description, startTime, endTime, logoUrl, updatedAt: Date.now() },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Không tìm thấy cuộc bầu cử' });
    res.json({
      _id: updated._id,
      onChainId: updated.onChainId,
      title: updated.title,
      description: updated.description,
      startTime: updated.startTime,
      endTime: updated.endTime,
      logoUrl: updated.logoUrl,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt
    });
  } catch (err) {
    res.status(400).json({ error: 'Lỗi khi cập nhật cuộc bầu cử', details: err.message });
  }
});

// API đánh dấu kết thúc cuộc bầu cử
router.put('/:id/complete', async (req, res) => {
  try {
    const electionId = req.params.id;
    // Tính snapshot kết quả
    const election = await Election.findById(electionId);
    if (!election) return res.status(404).json({ error: 'Không tìm thấy cuộc bầu cử' });
    // Lấy danh sách ứng viên của election
    const candidates = await Candidate.find({ electionId });
    const votes = await Vote.find({ electionId });
    const voteCount = {};
    candidates.forEach(c => { voteCount[String(c._id)] = 0; });
    votes.forEach(vote => {
      (vote.candidateIds || []).forEach(cid => {
        const cidStr = String(cid);
        if (cidStr in voteCount) voteCount[cidStr]++;
      });
    });
    const totalVotes = votes.length;
    const totalVoters = await Voter.countDocuments({});
    const uniqueVoters = new Set(votes.map(v => String(v.voterId)));
    const totalVotedVoters = uniqueVoters.size;
    const participationRate = totalVoters > 0 ? (totalVotedVoters / totalVoters) * 100 : 0;
    let winner = null;
    let maxVotes = 0;
    candidates.forEach(c => {
      if (voteCount[String(c._id)] > maxVotes) {
        maxVotes = voteCount[String(c._id)];
        winner = c;
      }
    });
    const votesByCandidate = candidates.map(c => ({
      candidate: {
        _id: c._id,
        onChainId: c.onChainId,
        name: c.name,
        position: c.position,
        imageUrl: c.imageUrl,
        birthDate: c.birthDate,
        hometown: c.hometown,
        achievements: c.achievements,
        motto: c.motto
      },
      votes: voteCount[String(c._id)] || 0,
      percentage: totalVotedVoters > 0 ? (voteCount[String(c._id)] / totalVotedVoters) * 100 : 0
    }));
    const snapshot = {
      electionId,
      totalVotes,
      totalVoters,
      totalVotedVoters,
      participationRate,
      candidates: candidates.map(c => ({
        _id: c._id,
        onChainId: c.onChainId,
        name: c.name,
        voteCount: voteCount[String(c._id)] || 0
      })),
      winner: winner ? { _id: winner._id, onChainId: winner.onChainId, name: winner.name, voteCount: voteCount[String(winner._id)] } : null,
      votesByCandidate
    };
    // Lưu snapshot vào election
    election.resultsSnapshot = snapshot;
    election.status = 'completed';
    election.endTime = new Date();
    election.updatedAt = new Date();
    await election.save();
    res.json({
      _id: election._id,
      onChainId: election.onChainId,
      title: election.title,
      description: election.description,
      startTime: election.startTime,
      endTime: election.endTime,
      logoUrl: election.logoUrl,
      createdAt: election.createdAt,
      updatedAt: election.updatedAt,
      resultsSnapshot: election.resultsSnapshot
    });
  } catch (err) {
    res.status(400).json({ error: 'Lỗi khi kết thúc cuộc bầu cử', details: err.message });
  }
});

// Xóa cuộc bầu cử
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Election.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Không tìm thấy cuộc bầu cử' });
    res.json({ message: 'Đã xóa cuộc bầu cử thành công' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi xóa cuộc bầu cử' });
  }
});

module.exports = router; 
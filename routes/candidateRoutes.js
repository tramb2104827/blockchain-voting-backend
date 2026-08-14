const express = require('express');
const router = express.Router();
const Candidate = require('../models/Candidate');
const Election = require('../models/Election');

// Lấy danh sách ứng cử viên (có thể lọc theo electionId)
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.electionId) {
      filter.electionId = req.query.electionId;
    } else {
      // Lọc các election hiện tại (endTime >= now)
      const now = new Date();
      const currentElections = await Election.find({ endTime: { $gte: now } }).select('_id');
      const currentElectionIds = currentElections.map(e => e._id);
      filter.electionId = { $in: currentElectionIds };
    }
    const candidates = await Candidate.find(filter).sort({ createdAt: -1 });
    res.json(candidates.map(c => ({
      _id: c._id,
      blockchainCandidateId: c.blockchainCandidateId,
      name: c.name,
      birthDate: c.birthDate,
      hometown: c.hometown,
      position: c.position,
      achievements: c.achievements,
      motto: c.motto,
      imageUrl: c.imageUrl,
      electionId: c.electionId,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt
    })));
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server khi lấy danh sách ứng cử viên' });
  }
});

// Lấy chi tiết 1 ứng cử viên
router.get('/:id', async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) return res.status(404).json({ error: 'Không tìm thấy ứng cử viên' });
    res.json({
      _id: candidate._id,
      blockchainCandidateId: candidate.blockchainCandidateId,
      name: candidate.name,
      birthDate: candidate.birthDate,
      hometown: candidate.hometown,
      position: candidate.position,
      achievements: candidate.achievements,
      motto: candidate.motto,
      imageUrl: candidate.imageUrl,
      electionId: candidate.electionId,
      createdAt: candidate.createdAt,
      updatedAt: candidate.updatedAt
    });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server khi lấy chi tiết ứng cử viên' });
  }
});

// Tạo mới ứng cử viên
router.post('/', async (req, res) => {
  try {
    const { name, birthDate, hometown, position, achievements, motto, imageUrl, electionId } = req.body;
    // Tìm blockchainCandidateId lớn nhất trong election này
    const last = await Candidate.findOne({ electionId }).sort({ blockchainCandidateId: -1 });
    const nextBlockchainCandidateId = last && last.blockchainCandidateId ? last.blockchainCandidateId + 1 : 1;
    const newCandidate = new Candidate({
      name,
      birthDate,
      hometown,
      position,
      achievements,
      motto,
      imageUrl,
      electionId,
      blockchainCandidateId: nextBlockchainCandidateId
    });
    await newCandidate.save();
    res.status(201).json(newCandidate);
  } catch (err) {
    res.status(400).json({ error: 'Lỗi khi tạo ứng cử viên', details: err.message });
  }
});

// Cập nhật ứng cử viên
router.put('/:id', async (req, res) => {
  try {
    const { name, birthDate, hometown, position, achievements, motto, imageUrl, electionId } = req.body;
    const updated = await Candidate.findByIdAndUpdate(
      req.params.id,
      { name, birthDate, hometown, position, achievements, motto, imageUrl, electionId, updatedAt: Date.now() },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Không tìm thấy ứng cử viên' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: 'Lỗi khi cập nhật ứng cử viên', details: err.message });
  }
});

// Xóa ứng cử viên
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Candidate.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Không tìm thấy ứng cử viên' });
    res.json({ message: 'Đã xóa ứng cử viên thành công' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi xóa ứng cử viên' });
  }
});

module.exports = router; 
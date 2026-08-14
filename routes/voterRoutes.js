const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const Voter = require('../models/Voter');
const { authMiddleware, adminMiddleware } = require('../middlewares/auth');

const router = express.Router();

// Hàm xác thực reCAPTCHA v3
async function verifyRecaptcha(token) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  const url = `https://www.google.com/recaptcha/api/siteverify`;
  try {
    const res = await axios.post(url, null, {
      params: {
        secret,
        response: token,
      },
    });
    console.log('reCAPTCHA verify result:', res.data); // Thêm log chi tiết
    return res.data.success && res.data.score >= 0.5;
  } catch (err) {
    console.error('reCAPTCHA verify error:', err);
    return false;
  }
}

// Đăng ký cử tri
router.post('/register', async (req, res) => {
  try {
    const { cccd, fullName, address, birthDate, password, walletAddress, recaptchaToken } = req.body;
    if (!cccd || !fullName || !password || !recaptchaToken) {
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
    }
    // Xác thực reCAPTCHA v3
    const isHuman = await verifyRecaptcha(recaptchaToken);
    if (!isHuman) {
      return res.status(400).json({ error: 'Xác thực reCAPTCHA thất bại. Vui lòng thử lại.' });
    }
    const existing = await Voter.findOne({ cccd: String(cccd) });
    if (existing) {
      return res.status(409).json({ error: 'CCCD đã tồn tại' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const voter = new Voter({
      cccd: String(cccd),
      fullName,
      address,
      birthDate,
      password: hashedPassword,
      walletAddress
    });
    await voter.save();
    // Có thể trả về JWT nếu muốn tự động đăng nhập
    const token = jwt.sign({ id: voter._id, role: 'voter' }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ message: 'Đăng ký thành công', token, voter: { id: voter._id, cccd: voter.cccd, fullName: voter.fullName, walletAddress: voter.walletAddress } });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server khi đăng ký', details: err.message });
  }
});

// Đăng nhập cử tri (JWT)
router.post('/login', async (req, res) => {
  try {
    const { cccd, password, recaptchaToken } = req.body;
    console.log('Login payload:', { cccd, hasPassword: !!password, recaptchaToken }); // Log payload
    if (!cccd || !password || !recaptchaToken) {
      return res.status(400).json({ error: 'Thiếu thông tin đăng nhập hoặc reCAPTCHA' });
    }
    // Xác thực reCAPTCHA v3
    const isHuman = await verifyRecaptcha(recaptchaToken);
    if (!isHuman) {
      console.log('reCAPTCHA xác thực thất bại cho cccd:', cccd);
      return res.status(400).json({ error: 'Xác thực reCAPTCHA thất bại. Vui lòng thử lại.' });
    }
    const voter = await Voter.findOne({ cccd });
    if (!voter) return res.status(401).json({ error: 'CCCD hoặc mật khẩu không đúng' });
    if (voter.isActive === false) {
      return res.status(403).json({ error: 'Tài khoản đã bị khóa, vui lòng liên hệ quản trị viên.' });
    }
    const isMatch = await bcrypt.compare(password, voter.password);
    if (!isMatch) return res.status(401).json({ error: 'CCCD hoặc mật khẩu không đúng' });
    const token = jwt.sign({ id: voter._id, role: 'voter' }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, voter: { id: voter._id, cccd: voter.cccd, fullName: voter.fullName, walletAddress: voter.walletAddress } });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server khi đăng nhập', details: err.message });
  }
});

// Lấy danh sách cử tri (chỉ admin)
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const voters = await Voter.find().select('-password');
    res.json(voters);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server khi lấy danh sách cử tri' });
  }
});

// Lấy thông tin cá nhân (JWT)
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const voter = await Voter.findById(req.user.id).select('-password');
    if (!voter) return res.status(404).json({ error: 'Không tìm thấy cử tri' });
    res.json(voter);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server khi lấy thông tin cá nhân' });
  }
});

// Sửa route PUT /me: Không kiểm tra trạng thái tài khoản, chỉ cần đúng JWT là cho phép cập nhật
router.put('/me', authMiddleware, async (req, res) => {
  try {
    const { fullName, birthDate, address } = req.body;
    // Không kiểm tra trạng thái tài khoản ở đây
    const updated = await Voter.findByIdAndUpdate(
      req.user.id,
      { fullName, birthDate, address, updatedAt: new Date() },
      { new: true }
    ).select('-password');
    if (!updated) return res.status(404).json({ error: 'Không tìm thấy cử tri' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi cập nhật thông tin cá nhân', details: err.message });
  }
});

// Thêm route xóa cử tri (chỉ admin)
router.delete('/:cccd', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const deleted = await Voter.findOneAndDelete({ cccd: req.params.cccd });
    if (!deleted) return res.status(404).json({ error: 'Không tìm thấy cử tri' });
    res.json({ message: 'Đã xóa cử tri thành công' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi xóa cử tri' });
  }
});

// Khóa/mở khóa cử tri (chỉ admin)
router.patch('/:cccd/lock', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'Trường isActive phải là boolean' });
    }
    console.log('PATCH lock cccd:', req.params.cccd, 'typeof:', typeof req.params.cccd);
    const updated = await Voter.findOneAndUpdate(
      { cccd: req.params.cccd },
      { isActive, updatedAt: new Date() },
      { new: true }
    );
    console.log('Kết quả cập nhật:', updated);
    if (!updated) {
      // Log toàn bộ cccd hiện có trong DB để debug
      const allCCCD = await Voter.find({}, { cccd: 1 });
      console.log('Danh sách cccd hiện có:', allCCCD.map(v => v.cccd));
      return res.status(404).json({ error: 'Không tìm thấy cử tri' });
    }
    res.json({ message: isActive ? 'Đã mở khóa cử tri' : 'Đã khóa cử tri', voter: updated });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi cập nhật trạng thái cử tri' });
  }
});

module.exports = router; 
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const { authMiddleware, superAdminMiddleware } = require('../middlewares/auth');

const router = express.Router();

// Đăng nhập admin (JWT)
router.post('/login', async (req, res) => {
  try {
    const { cccd, password } = req.body;
    const admin = await Admin.findOne({ cccd });
    if (!admin) return res.status(401).json({ error: 'CCCD hoặc mật khẩu không đúng' });
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(401).json({ error: 'CCCD hoặc mật khẩu không đúng' });
    const token = jwt.sign({ id: admin._id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, admin: { id: admin._id, cccd: admin.cccd, name: admin.name, email: admin.email, isSuperAdmin: admin.isSuperAdmin } });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server khi đăng nhập', details: err.message });
  }
});

// Thêm admin mới (chỉ super admin)
router.post('/', authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    console.log('YEU CAU THEM ADMIN:', req.body);
    const { cccd, name, email, password, isSuperAdmin } = req.body;
    if (!cccd || !name || !email || !password) {
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
    }
    const existing = await Admin.findOne({ cccd });
    if (existing) {
      return res.status(409).json({ error: 'CCCD đã tồn tại' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = new Admin({
      cccd,
      name,
      email,
      password: hashedPassword,
      isSuperAdmin: !!isSuperAdmin
    });
    await admin.save();
    res.status(201).json({ message: 'Thêm admin thành công', admin: { id: admin._id, cccd: admin.cccd, name: admin.name, email: admin.email, isSuperAdmin: admin.isSuperAdmin } });
  } catch (err) {
    console.error('Lỗi khi thêm admin:', err);
    res.status(500).json({ error: 'Lỗi server khi thêm admin', details: err.message, stack: err.stack });
  }
});

// Lấy danh sách admin (chỉ super admin)
router.get('/', authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const admins = await Admin.find().select('-password');
    res.json(admins);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server khi lấy danh sách admin' });
  }
});

// Lấy thông tin admin hiện tại (JWT)
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id).select('-password');
    if (!admin) return res.status(404).json({ error: 'Không tìm thấy admin' });
    res.json(admin);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server khi lấy thông tin admin' });
  }
});

// Xóa admin (chỉ super admin)
router.delete('/:id', authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const deleted = await Admin.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Không tìm thấy admin' });
    res.json({ message: 'Đã xóa admin thành công' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi xóa admin', details: err.message });
  }
});

module.exports = router; 
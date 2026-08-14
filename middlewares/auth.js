const jwt = require('jsonwebtoken');
const Voter = require('../models/Voter');
const Admin = require('../models/Admin');

// Middleware xác thực JWT cho cả voter và admin
const authMiddleware = async (req, res, next) => {
  console.log('authMiddleware: headers', req.headers);
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Không có token xác thực' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role }
    console.log('authMiddleware: decoded user', decoded);
    next();
  } catch (err) {
    console.error('authMiddleware: JWT error', err);
    return res.status(401).json({ error: 'Token không hợp lệ hoặc đã hết hạn' });
  }
};

// Middleware chỉ cho phép admin
const adminMiddleware = async (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ admin mới được phép truy cập' });
  }
  next();
};

// Middleware chỉ cho phép super admin
const superAdminMiddleware = async (req, res, next) => {
  console.log('superAdminMiddleware: req.user', req.user);
  if (!req.user || req.user.role !== 'admin') {
    console.log('superAdminMiddleware: Không phải admin');
    return res.status(403).json({ error: 'Chỉ admin mới được phép truy cập' });
  }
  // Kiểm tra isSuperAdmin trong DB
  try {
    const admin = await Admin.findById(req.user.id);
    console.log('superAdminMiddleware: admin in DB', admin);
    if (!admin || !admin.isSuperAdmin) {
      console.log('superAdminMiddleware: Không phải super admin');
      return res.status(403).json({ error: 'Chỉ super admin mới được phép truy cập' });
    }
    next();
  } catch (err) {
    console.error('superAdminMiddleware: DB error', err);
    return res.status(500).json({ error: 'Lỗi kiểm tra quyền super admin', details: err.message });
  }
};

module.exports = { authMiddleware, adminMiddleware, superAdminMiddleware }; 
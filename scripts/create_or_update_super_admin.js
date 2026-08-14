// require('dotenv').config();

// const mongoose = require('mongoose');
// const bcrypt = require('bcryptjs');
// const path = require('path');

// const Admin = require(path.join(__dirname, '..', 'models', 'Admin'));

// const MONGO_URI = process.env.MONGODB_URI;

// const [,, cccdArg, passwordArg, emailArg, nameArg] = process.argv;

// if (!MONGO_URI) {
//   console.error('❌ Không tìm thấy MONGODB_URI trong file .env');
//   process.exit(1);
// }

// if (!cccdArg || !passwordArg) {
//   console.error(
//     '❌ Cách sử dụng: node scripts/create_or_update_super_admin.js <cccd> <password> [email] [name]'
//   );
//   process.exit(1);
// }

// if (!/^\d{12}$/.test(cccdArg)) {
//   console.error('❌ CCCD phải gồm đúng 12 chữ số.');
//   process.exit(1);
// }

// if (passwordArg.length < 8) {
//   console.error('❌ Mật khẩu phải có ít nhất 8 ký tự.');
//   process.exit(1);
// }

// async function main() {
//   try {
//     console.log('🔄 Đang kết nối MongoDB...');

//     await mongoose.connect(MONGO_URI);

//     console.log('✅ Đã kết nối MongoDB Atlas');

//     const cccd = cccdArg;
//     const password = passwordArg;
//     const email = emailArg || `${cccd}@example.com`;
//     const name = nameArg || 'Super Admin';

//     const hashedPassword = await bcrypt.hash(password, 10);

//     const admin = await Admin.findOneAndUpdate(
//       { cccd },
//       {
//         $set: {
//           password: hashedPassword,
//           isSuperAdmin: true,
//           name,
//           email,
//           updatedAt: new Date()
//         },
//         $setOnInsert: {
//           cccd,
//           createdAt: new Date()
//         }
//       },
//       {
//         upsert: true,
//         new: true,
//         runValidators: true
//       }
//     );

//     console.log('\n========================================');
//     console.log('✅ SUPER ADMIN ĐÃ ĐƯỢC TẠO/CẬP NHẬT');
//     console.log('========================================');
//     console.log('ID:', admin._id.toString());
//     console.log('CCCD:', admin.cccd);
//     console.log('Email:', admin.email);
//     console.log('Tên:', admin.name);
//     console.log('Super Admin:', admin.isSuperAdmin);
//     console.log('========================================\n');

//     await mongoose.disconnect();

//     console.log('✅ Đã đóng kết nối MongoDB.');
//     process.exit(0);

//   } catch (error) {
//     console.error('\n❌ LỖI TẠO/CẬP NHẬT SUPER ADMIN:');
//     console.error(error.message);

//     try {
//       await mongoose.disconnect();
//     } catch (_) {}

//     process.exit(1);
//   }
// }

// main();
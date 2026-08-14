require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bodyParser = require('body-parser');

const app = express();

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(helmet());
app.use(morgan('dev'));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Kết nối MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Đã kết nối MongoDB Atlas!'))
.catch((err) => {
  console.error('❌ Lỗi kết nối MongoDB:', err);
  process.exit(1);
});

const electionRoutes = require('./routes/electionRoutes');
app.use('/api/elections', electionRoutes);

const candidateRoutes = require('./routes/candidateRoutes');
app.use('/api/candidates', candidateRoutes);

const voterRoutes = require('./routes/voterRoutes');
app.use('/api/voters', voterRoutes);

const voteRoutes = require('./routes/voteRoutes');
app.use('/api/votes', voteRoutes);

const adminRoutes = require('./routes/adminRoutes');
app.use('/api/admins', adminRoutes);

const chatbotRoutes = require('./routes/chatbotRoutes');
app.use('/api/chatbot', chatbotRoutes);

// Route mẫu kiểm tra server
app.get('/api', (req, res) => {
  res.json({ message: 'API server is running!' });
});

// Khởi động server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});

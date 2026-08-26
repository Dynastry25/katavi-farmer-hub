const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/crops', require('./routes/crops'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/news', require('./routes/news'));
app.use('/api/videos', require('./routes/videos'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/loans', require('./routes/loans'));
app.use('/api/farmer-groups', require('./routes/farmerGroups'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/advice', require('./routes/advice'));
app.use('/api/upload', require('./routes/upload'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Katavi E-Kilimo API inafanya kazi' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message || 'Hitilafu imetokea kwenye seva' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server inafanya kazi kwenye port ${PORT}`);
});

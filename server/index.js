const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const compression = require('compression');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Security headers
app.use(helmet({ contentSecurityPolicy: false }));

// Enable trust proxy (needed for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Request logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Compress all responses (gzip)
app.use(compression());

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ message: 'Umeshatuma maombi mengi. Jaribu tena baada ya dakika.' });
  },
  skip: (req) => req.path.startsWith('/chatbot'),
});

const chatbotLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ message: 'Umetuma messagi nyingi. Tafadhali subiri kidogo.' });
  },
});

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', apiLimiter, require('./routes/auth'));
app.use('/api/chatbot', chatbotLimiter, require('./routes/chatbot'));
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
app.use('/api/admin', require('./routes/admin'));

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

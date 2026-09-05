const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const compression = require('compression');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
});

app.use(helmet({ contentSecurityPolicy: false }));
app.set('trust proxy', 1);

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

app.use(compression());

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

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Socket.IO
const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('user_online', (userId) => {
    connectedUsers.set(userId, socket.id);
    socket.join(`user_${userId}`);
  });

  socket.on('join_conversation', (conversationId) => {
    socket.join(`conversation_${conversationId}`);
  });

  socket.on('leave_conversation', (conversationId) => {
    socket.leave(`conversation_${conversationId}`);
  });

  socket.on('send_message', (data) => {
    if (data.conversationId) {
      io.to(`conversation_${data.conversationId}`).emit('new_message', data);
    }
  });

  socket.on('typing', (data) => {
    if (data.conversationId) {
      socket.to(`conversation_${data.conversationId}`).emit('user_typing', data);
    }
  });

  socket.on('notification', (data) => {
    if (data.userId) {
      io.to(`user_${data.userId}`).emit('new_notification', data);
    }
  });

  socket.on('disconnect', () => {
    for (const [userId, socketId] of connectedUsers.entries()) {
      if (socketId === socket.id) {
        connectedUsers.delete(userId);
        break;
      }
    }
  });
});

app.set('io', io);

// Routes
app.use('/api/v1/auth', apiLimiter, require('./routes/auth'));
app.use('/api/v1/chatbot', chatbotLimiter, require('./routes/chatbot'));
app.use('/api/v1/ai', require('./routes/ai'));
app.use('/api/v1/crops', require('./routes/crops'));
app.use('/api/v1/products', require('./routes/products'));
app.use('/api/v1/orders', require('./routes/orders'));
app.use('/api/v1/news', require('./routes/news'));
app.use('/api/v1/videos', require('./routes/videos'));
app.use('/api/v1/suppliers', require('./routes/suppliers'));
app.use('/api/v1/loans', require('./routes/loans'));
app.use('/api/v1/farmer-groups', require('./routes/farmerGroups'));
app.use('/api/v1/chat', require('./routes/chat'));
app.use('/api/v1/contact', require('./routes/contact'));
app.use('/api/v1/advice', require('./routes/advice'));
app.use('/api/v1/upload', require('./routes/upload'));
app.use('/api/v1/admin', require('./routes/admin'));
app.use('/api/v1/market-prices', require('./routes/marketPrices'));
app.use('/api/v1/notifications', require('./routes/notifications'));
app.use('/api/v1/ratings', require('./routes/ratings'));
app.use('/api/v1/weather', require('./routes/weather'));
app.use('/api/v1/push', require('./routes/push'));
app.use('/api/v1/payments', require('./routes/payments'));
app.use('/api/v1/price-alerts', require('./routes/priceAlerts'));
app.use('/api/v1/farmer-finance', require('./routes/farmerFinance'));
app.use('/api/v1/shamba', require('./routes/shamba'));
app.use('/api/v1/analytics', require('./routes/analytics'));
app.use('/api/v1/settings', require('./routes/settings'));

// Health check
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', message: 'Katavi E-Kilimo API inafanya kazi', timestamp: new Date().toISOString() });
});

// 404 handler
app.use('/api', (req, res) => {
  res.status(404).json({ message: 'Ruta hii haipatikani' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    message: err.message || 'Hitilafu imetokea kwenye seva',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server inafanya kazi kwenye port ${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => process.exit(0));
});

module.exports = { app, server, io };

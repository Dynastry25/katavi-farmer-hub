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
app.use('/api/market-prices', require('./routes/marketPrices'));
app.use('/api/notifications', require('./routes/notifications'));

// Health check
app.get('/api/health', (req, res) => {
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

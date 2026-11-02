const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const compression = require('compression');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const cron = require('node-cron');
const connectDB = require('./config/db');
const { mongoSanitize } = require('./middleware/sanitize');
const {
  generalLimiter,
  authLimiter,
  aiLimiter,
  mapsLimiter,
  uploadLimiter,
} = require('./middleware/rateLimits');
const User = require('./models/User');
const Conversation = require('./models/Conversation');

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

// Several devices may be connected per account, so one socket per user id would
// overwrite the previous one.
const connectedUsers = new Map();

// CORS origins: allowed clients (React on :5173, Flutter web on :8090, plus FRONTEND_URL).
const corsOrigins = [
  'http://localhost:5173',
  'http://localhost:8090',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];
const uniqueOrigins = [...new Set(corsOrigins)];

// In development, also accept any localhost/127.0.0.1 origin so tools like
// `flutter run -d chrome` (which picks a random dev port) can reach the API.
const isProd = process.env.NODE_ENV === 'production';
const corsOrigin = (origin, callback) => {
  if (!origin || uniqueOrigins.includes(origin)) return callback(null, true);
  if (!isProd && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    return callback(null, true);
  }
  return callback(null, false);
};

const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    credentials: true,
  },
  maxHttpBufferSize: 1e6,
  pingTimeout: 25000,
});

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.set('trust proxy', 1);
app.set('query parser', 'simple');

if (!isProd) {
  app.use(morgan('dev'));
}

app.use(compression({ threshold: 1024 }));

app.use(cors({
  origin: corsOrigin,
  credentials: true,
}));

// Phone images arrive as base64 thumbnails, so 2mb is enough; the previous 10mb
// limit let a single request allocate a large buffer per connection.
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false, limit: '200kb', parameterLimit: 200 }));

// Must run after the body parsers and before every route.
app.use(mongoSanitize);

// Liveness + readiness. Render uses /api/health; both paths report the database
// state so a broken connection is visible instead of silently serving stale data.
const healthCheck = (req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({
    status: connected ? 'ok' : 'degraded',
    database: connected ? 'connected' : 'disconnected',
    message: connected ? 'Katavi E-Kilimo API inafanya kazi' : 'Seva haijaunganishwa na hifadhidata',
    timestamp: new Date().toISOString(),
  });
};
app.get(['/api/health', '/api/v1/health'], healthCheck);

// ──────────────────────────────────────────────
// Socket.IO — every connection is authenticated with the same JWT as the API,
// and a socket may only join conversations it belongs to.
// ──────────────────────────────────────────────
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token || typeof token !== 'string') return next(new Error('unauthorized'));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('_id name role isActive').lean();
    if (!user || user.isActive === false) return next(new Error('unauthorized'));

    socket.data.user = { id: String(user._id), name: user.name, role: user.role };
    next();
  } catch {
    next(new Error('unauthorized'));
  }
});

io.on('connection', (socket) => {
  const me = socket.data.user;
  const joinedConversations = new Set();
  socket.join(`user_${me.id}`);

  if (!connectedUsers.has(me.id)) connectedUsers.set(me.id, new Set());
  connectedUsers.get(me.id).add(socket.id);

  // Kept for older clients; identity always comes from the verified token.
  socket.on('user_online', () => {
    socket.join(`user_${me.id}`);
  });

  socket.on('join_conversation', async (conversationId) => {
    if (!mongoose.isValidObjectId(conversationId)) return;
    const allowed = await Conversation.exists({
      _id: conversationId,
      participants: me.id,
    });
    if (!allowed) return;
    joinedConversations.add(String(conversationId));
    socket.join(`conversation_${conversationId}`);
  });

  socket.on('leave_conversation', (conversationId) => {
    if (!conversationId) return;
    joinedConversations.delete(String(conversationId));
    socket.leave(`conversation_${conversationId}`);
  });

  socket.on('send_message', (data) => {
    const conversationId = typeof data?.conversationId === 'string' ? data.conversationId : '';
    if (!conversationId || !joinedConversations.has(conversationId)) return;
    const payload = {
      conversationId,
      senderId: me.id,
      senderName: me.name,
      text: typeof data.text === 'string' ? data.text.slice(0, 4000) : '',
      type: typeof data.type === 'string' ? data.type.slice(0, 30) : 'text',
      fileName: typeof data.fileName === 'string' ? data.fileName.slice(0, 255) : '',
      time: new Date().toISOString(),
    };
    socket.to(`conversation_${conversationId}`).emit('new_message', payload);
  });

  socket.on('typing', (data) => {
    const conversationId = typeof data?.conversationId === 'string' ? data.conversationId : '';
    if (!conversationId || !joinedConversations.has(conversationId)) return;
    socket.to(`conversation_${conversationId}`).emit('user_typing', {
      conversationId,
      userId: me.id,
      name: me.name,
    });
  });

  socket.on('disconnect', () => {
    const sockets = connectedUsers.get(me.id);
    if (!sockets) return;
    sockets.delete(socket.id);
    if (sockets.size === 0) connectedUsers.delete(me.id);
  });
});

app.set('io', io);

// Routes
app.use('/api', generalLimiter);
app.use('/api/v1/auth', authLimiter, require('./routes/auth'));
app.use('/api/v1/chatbot', aiLimiter, require('./routes/chatbot'));
app.use('/api/v1/ai', aiLimiter, require('./routes/ai'));
app.use('/api/v1/crops', require('./routes/crops'));
app.use('/api/v1/favorites', require('./routes/favorites'));
app.use('/api/v1/products', require('./routes/products'));
app.use('/api/v1/orders', require('./routes/orders'));
app.use('/api/v1/news', require('./routes/news'));
app.use('/api/v1/videos', require('./routes/videos'));
app.use('/api/v1/announcements', require('./routes/announcements'));
app.use('/api/v1/offers', require('./routes/offers'));
app.use('/api/v1/crop-types', require('./routes/cropTypes'));
app.use('/api/v1/suppliers', require('./routes/suppliers'));
app.use('/api/v1/loans', require('./routes/loans'));
app.use('/api/v1/farmer-groups', require('./routes/farmerGroups'));
app.use('/api/v1/chat', require('./routes/chat'));
app.use('/api/v1/contact', require('./routes/contact'));
app.use('/api/v1/advice', require('./routes/advice'));
app.use('/api/v1/questions', require('./routes/questions'));
app.use('/api/v1/upload', uploadLimiter, require('./routes/upload'));
app.use('/api/v1/admin', require('./routes/admin'));
app.use('/api/v1/market-prices', require('./routes/marketPrices'));
app.use('/api/v1/notifications', require('./routes/notifications'));
app.use('/api/v1/ratings', require('./routes/ratings'));
app.use('/api/v1/weather', require('./routes/weather'));
app.use('/api/v1/maps', mapsLimiter, require('./routes/maps'));
app.use('/api/v1/push', require('./routes/push'));
app.use('/api/v1/payments', require('./routes/payments'));
app.use('/api/v1/price-alerts', require('./routes/priceAlerts'));
app.use('/api/v1/farmer-finance', require('./routes/farmerFinance'));
app.use('/api/v1/shamba', require('./routes/shamba'));
app.use('/api/v1/analytics', require('./routes/analytics'));
app.use('/api/v1/settings', require('./routes/settings'));
app.use('/api/v1/input-products', require('./routes/inputProducts'));
app.use('/api/v1/input-orders', require('./routes/inputOrders'));
app.use('/api/v1/price-limits', require('./routes/priceLimits'));
app.use('/api/v1/transport', require('./routes/transport'));
app.use('/api/v1/warehouses', require('./routes/warehouses'));
app.use('/api/v1/warehouse-bookings', require('./routes/warehouseBookings'));

// 404 handler
app.use('/api', (req, res) => {
  res.status(404).json({ message: 'Ruta hii haipatikani' });
});

// Error handling middleware. Client errors keep their message; server errors are
// logged in full but answered generically so stack traces and driver details do
// not reach the caller.
app.use((err, req, res, next) => {
  let status = err.statusCode || err.status || 500;
  let message = err.message;

  if (err.type === 'entity.too.large' || err.code === 'LIMIT_FILE_SIZE') {
    status = 413;
    message = 'Taarifa iliyotumwa ni kubwa mno';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Taarifa iliyotumwa si sahihi';
  } else if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors || {})[0]?.message || 'Taarifa iliyotumwa si sahihi';
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'Kitambulisho si sahihi';
  } else if (err.code === 11000) {
    status = 409;
    message = 'Taarifa hii tayari ipo';
  } else if (err.code && err.code.startsWith?.('LIMIT_')) {
    status = 400;
    message = 'Faili ulilopakia halikubaliki';
  }

  if (status >= 500) {
    console.error(`[error] ${req.method} ${req.originalUrl}:`, err);
  }

  res.status(status).json({
    message: status >= 500 ? 'Hitilafu imetokea kwenye seva' : message,
    ...(!isProd && status >= 500 && { stack: err.stack }),
  });
});

// Keep connections reusable for slow mobile networks, but never let a stalled
// client hold a socket open forever.
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
server.requestTimeout = 60000;

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server inafanya kazi kwenye port ${PORT}`);
});

// Auto-expiry job: mark pending orders past their expiresAt as 'expired' and
// release their stock reservations. Runs every hour.
const ordersRouter = require('./routes/orders');
const inputOrdersRouter = require('./routes/inputOrders');
const expiryJob = process.env.DISABLE_CRON === 'true'
  ? null
  : cron.schedule('0 * * * *', async () => {
    try {
      const released = await ordersRouter.expirePendingOrders();
      if (released > 0) console.log(`[cron] Expired ${released} order(s) and released their stock reservations`);
      const inputReleased = await inputOrdersRouter.expirePendingInputOrders();
      if (inputReleased > 0) console.log(`[cron] Expired ${inputReleased} input order(s) and released their stock`);
    } catch (err) {
      console.error('[cron] Auto-expiry job error:', err);
    }
  });

let shuttingDown = false;
const shutdown = async (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received. Shutting down gracefully...`);

  const forceExit = setTimeout(() => process.exit(1), 10000);
  forceExit.unref();

  try {
    if (expiryJob) expiryJob.stop();
    await new Promise((resolve) => io.close(resolve));
    await mongoose.connection.close(false);
    process.exit(0);
  } catch (err) {
    console.error('Graceful shutdown error:', err.message);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  console.error('[process] Unhandled rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[process] Uncaught exception:', err);
  shutdown('uncaughtException');
});

module.exports = { app, server, io };

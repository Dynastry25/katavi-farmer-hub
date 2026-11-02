const mongoose = require('mongoose');

const RETRY_DELAY_MS = 3000;
const MAX_ATTEMPTS = 5;

mongoose.set('strictQuery', true);

const options = () => ({
  // One pool per process; 50 connections comfortably serves hundreds of
  // concurrent readers while staying under shared Atlas tier limits.
  maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE) || 50,
  minPoolSize: Number(process.env.MONGO_MIN_POOL_SIZE) || 5,
  maxIdleTimeMS: 30000,
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  heartbeatFrequencyMS: 10000,
});

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const connectDB = async () => {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const conn = await mongoose.connect(process.env.MONGODB_URI, options());
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      return conn;
    } catch (error) {
      console.error(`MongoDB connection attempt ${attempt}/${MAX_ATTEMPTS} failed: ${error.message}`);
      if (attempt === MAX_ATTEMPTS) {
        console.error('MongoDB is unreachable. Exiting.');
        process.exit(1);
      }
      await wait(RETRY_DELAY_MS * attempt);
    }
  }
  return null;
};

mongoose.connection.on('disconnected', () => {
  console.warn('[db] MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('[db] MongoDB reconnected');
});

module.exports = connectDB;

import mongoose from 'mongoose';
import { config } from '../backend/src/config/index.js';
import app from '../backend/src/app.js';

let isConnected = false;

async function connectDB() {
  if (isConnected && mongoose.connection.readyState === 1) return;
  await mongoose.connect(config.mongoUri, {
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 20000,
    connectTimeoutMS: 15000,
  });
  isConnected = true;
}

const handler = async (req, res) => {
  try {
    await connectDB();
  } catch (err) {
    console.error('[vercel] MongoDB connection failed:', err.message);
    return res.status(503).json({ success: false, message: 'Database connection failed. Please try again.' });
  }
  return app(req, res);
};

export default handler;

export const config = { maxDuration: 30 };

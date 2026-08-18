import mongoose from 'mongoose';
import app from '../backend/src/app.js';

let isConnected = false;

async function connectDB() {
  if (isConnected && mongoose.connection.readyState === 1) return;
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI env variable is not set');
  await mongoose.connect(mongoUri, {
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

export const maxDuration = 30;

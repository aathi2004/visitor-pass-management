import mongoose from 'mongoose';
import { config } from '../src/config/index.js';
import app from '../src/app.js';

const cached = global.mongooseCache || (global.mongooseCache = { promise: null });

function db() {
  if (mongoose.connection.readyState === 1) return Promise.resolve();
  if (!cached.promise) {
    cached.promise = mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
    }).catch((err) => {
      cached.promise = null;
      throw err;
    });
  }
  return cached.promise;
}

db().catch((err) => console.error('[vercel] MongoDB connection failed:', err.message));

export default app;

import mongoose from 'mongoose';
import app from './app.js';
import { config } from './config/index.js';
import { autoCompleteVisits } from './controllers/slotController.js';

const start = async () => {
  try {
    await mongoose.connect(config.mongoUri);
    console.log(`[db] Connected to MongoDB at ${config.mongoUri}`);
  } catch (err) {
    console.error('[db] MongoDB connection failed:', err.message);
    process.exit(1);
  }

  setInterval(() => {
    autoCompleteVisits().catch((err) => console.error('[autoComplete]', err.message));
  }, 5000);

  app.listen(config.port, () => {
    console.log(`[api] Visitor Pass API running on http://localhost:${config.port}`);
  });
};

start();

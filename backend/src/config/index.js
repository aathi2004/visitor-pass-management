import dotenv from 'dotenv';

dotenv.config();

const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export const config = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/visitor-pass',
  jwtSecret: process.env.JWT_SECRET || 'visitor-pass-dev-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  corsOrigins,
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  emailFrom: process.env.EMAIL_FROM || 'noreply@visitorpass.com',
};

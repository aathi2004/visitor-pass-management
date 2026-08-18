import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { config } from '../config/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { logAudit } from '../utils/auditLog.js';

const signToken = (id) =>
  jwt.sign({ id }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

export const login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;

  const user = await User.findOne({
    $or: [{ username: identifier.toLowerCase().trim() }, { email: identifier.toLowerCase().trim() }],
  }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    await logAudit({ action: 'auth.login_failed', entity: 'User', user: null, req });
    throw new AppError('Invalid username/email or password.', 401);
  }

  if (!user.isActive) {
    await logAudit({ action: 'auth.login_deactivated', entity: 'User', user: user._id, req });
    throw new AppError('Your account has been deactivated. Contact the administrator.', 403);
  }

  const token = signToken(user._id);
  await logAudit({ action: 'auth.login', entity: 'User', user: user._id, req });
  res.status(200).json({ success: true, token, user });
});

export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('employee');
  res.status(200).json({ success: true, user });
});

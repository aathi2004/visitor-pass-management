import User from '../models/User.js';
import Employee from '../models/Employee.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { logAudit } from '../utils/auditLog.js';

const userQuery = (req) => {
  const { search = '', role = '', page = 1, limit = 10 } = req.query;
  const filter = {};
  if (search) {
    const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: re }, { username: re }, { email: re }];
  }
  if (role) filter.role = role;
  return { filter, page: Math.max(1, parseInt(page, 10) || 1), limit: Math.min(100, parseInt(limit, 10) || 10) };
};

export const getUsers = asyncHandler(async (req, res) => {
  const { filter, page, limit } = userQuery(req);
  const total = await User.countDocuments(filter);
  const users = await User.find(filter)
    .populate('employee', 'name employeeId department')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  res.json({
    success: true,
    data: users,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 0 },
  });
});

export const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).populate('employee');
  if (!user) throw new AppError('User not found.', 404);
  res.json({ success: true, data: user });
});

export const createUser = asyncHandler(async (req, res) => {
  const { employee } = req.body;

  const exists = await User.findOne({
    $or: [{ username: req.body.username }, { email: req.body.email }],
  });
  if (exists) {
    throw new AppError(
      exists.username === req.body.username
        ? 'This username is already taken.'
        : 'This email is already registered.'
    );
  }

  if (employee) {
    const emp = await Employee.findById(employee);
    if (!emp) throw new AppError('Linked employee record not found.', 404);
  }

  const user = await User.create({
    name: req.body.name,
    username: req.body.username,
    email: req.body.email,
    password: req.body.password,
    role: req.body.role || 'employee',
  });
  if (employee) {
    await Employee.findByIdAndUpdate(employee, { user: user._id });
    user.employee = employee;
    await user.save();
  }

  await logAudit({
    action: 'user.created',
    entity: 'User',
    entityId: user._id,
    user: req.user,
    req,
    changes: { after: { name: user.name, username: user.username, role: user.role } },
  });

  res.status(201).json({ success: true, data: user, message: 'User account created successfully.' });
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found.', 404);

  if (req.body.username) {
    const dup = await User.findOne({ username: req.body.username, _id: { $ne: user._id } });
    if (dup) throw new AppError('This username is already taken.');
  }
  if (req.body.email) {
    const dup = await User.findOne({ email: req.body.email, _id: { $ne: user._id } });
    if (dup) throw new AppError('This email is already registered.');
  }

  const before = { name: user.name, role: user.role, isActive: user.isActive };

  if (req.body.password) {
    user.password = req.body.password;
  }
  if (req.body.employee !== undefined) {
    if (req.body.employee && req.body.employee !== String(user.employee || '')) {
      const emp = await Employee.findById(req.body.employee);
      if (!emp) throw new AppError('Linked employee record not found.', 404);
      await Employee.updateMany({ user: user._id }, { user: null });
      await Employee.findByIdAndUpdate(req.body.employee, { user: user._id });
    }
    if (!req.body.employee && user.employee) {
      await Employee.updateMany({ user: user._id }, { user: null });
    }
    user.employee = req.body.employee || null;
  }

  ['name', 'role', 'isActive'].forEach((f) => {
    if (req.body[f] !== undefined) user[f] = req.body[f];
  });

  await user.save();

  await logAudit({
    action: 'user.updated',
    entity: 'User',
    entityId: user._id,
    user: req.user,
    req,
    changes: { before, after: { name: user.name, role: user.role, isActive: user.isActive } },
  });

  res.json({ success: true, data: user, message: 'User account updated successfully.' });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found.', 404);

  if (user._id.equals(req.user._id)) {
    throw new AppError('You cannot deactivate your own account.', 400);
  }

  const before = { isActive: user.isActive };
  user.isActive = false;
  await user.save();

  await logAudit({
    action: 'user.deactivated',
    entity: 'User',
    entityId: user._id,
    user: req.user,
    req,
    changes: { before, after: { isActive: false } },
  });

  res.json({ success: true, data: user, message: 'User account deactivated.' });
});

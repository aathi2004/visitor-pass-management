import Employee from '../models/Employee.js';
import VisitRequest from '../models/VisitRequest.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';

const employeeQuery = (req) => {
  const { search = '', status = '', page = 1, limit = 10 } = req.query;
  const filter = {};
  if (search) {
    const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: re }, { employeeId: re }, { department: re }, { email: re }];
  }
  if (status) filter.status = status;
  return { filter, page: Math.max(1, parseInt(page, 10) || 1), limit: Math.min(100, parseInt(limit, 10) || 10) };
};

export const getEmployees = asyncHandler(async (req, res) => {
  const { filter, page, limit } = employeeQuery(req);
  const total = await Employee.countDocuments(filter);
  const employees = await Employee.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  res.json({
    data: employees,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 0 },
  });
});

export const getEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);
  if (!employee) throw new AppError('Employee not found.', 404);
  res.json({ data: employee });
});

export const createEmployee = asyncHandler(async (req, res) => {
  const exists = await Employee.findOne({
    $or: [{ employeeId: req.body.employeeId }, { email: req.body.email }],
  });
  if (exists) {
    throw new AppError(
      exists.employeeId === req.body.employeeId
        ? 'An employee with this Employee ID already exists.'
        : 'An employee with this email already exists.'
    );
  }

  const employee = await Employee.create(req.body);
  res.status(201).json({ data: employee, message: 'Employee created successfully.' });
});

export const updateEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);
  if (!employee) throw new AppError('Employee not found.', 404);

  if (req.body.employeeId) {
    const dup = await Employee.findOne({
      employeeId: req.body.employeeId,
      _id: { $ne: employee._id },
    });
    if (dup) throw new AppError('An employee with this Employee ID already exists.');
  }
  if (req.body.email) {
    const dup = await Employee.findOne({ email: req.body.email, _id: { $ne: employee._id } });
    if (dup) throw new AppError('An employee with this email already exists.');
  }

  Object.assign(employee, req.body);
  await employee.save();
  res.json({ data: employee, message: 'Employee updated successfully.' });
});

export const deleteEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);
  if (!employee) throw new AppError('Employee not found.', 404);

  const hasVisits = await VisitRequest.exists({ employee: employee._id });
  if (hasVisits) {
    employee.status = 'inactive';
    await employee.save();
    res.json({ data: employee, message: 'Employee deactivated (historical visits preserved).' });
    return;
  }

  await employee.deleteOne();
  res.json({ data: null, message: 'Employee deleted successfully.' });
});

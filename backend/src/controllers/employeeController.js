import Employee from '../models/Employee.js';
import VisitRequest from '../models/VisitRequest.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { logAudit } from '../utils/auditLog.js';

const employeeQuery = (req) => {
  const { search = '', status = '', department = '', page = 1, limit = 10 } = req.query;
  const filter = {};
  if (search) {
    const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: re }, { employeeId: re }, { department: re }, { email: re }];
  }
  if (status) filter.status = status;
  if (department) filter.department = new RegExp(department.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
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
    success: true,
    data: employees,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 0 },
  });
});

export const getEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);
  if (!employee) throw new AppError('Employee not found.', 404);
  res.json({ success: true, data: employee });
});

export const getDepartments = asyncHandler(async (req, res) => {
  const departments = await Employee.distinct('department', { status: 'active' });
  res.json({ success: true, data: departments.sort() });
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

  const employee = await Employee.create({
    name: req.body.name,
    employeeId: req.body.employeeId,
    department: req.body.department,
    designation: req.body.designation,
    email: req.body.email,
    phone: req.body.phone || '',
    workingHours: req.body.workingHours || { start: '09:00', end: '17:00' },
  });

  await logAudit({
    action: 'employee.created',
    entity: 'Employee',
    entityId: employee._id,
    user: req.user,
    req,
    changes: { after: { name: employee.name, employeeId: employee.employeeId, department: employee.department } },
  });

  res.status(201).json({ success: true, data: employee, message: 'Employee created successfully.' });
});

const EMPLOYEE_UPDATE_FIELDS = ['name', 'employeeId', 'department', 'designation', 'email', 'phone', 'status', 'workingHours'];

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

  const before = {
    name: employee.name,
    employeeId: employee.employeeId,
    department: employee.department,
    designation: employee.designation,
    status: employee.status,
  };

  EMPLOYEE_UPDATE_FIELDS.forEach((f) => {
    if (req.body[f] !== undefined) employee[f] = req.body[f];
  });
  await employee.save();

  await logAudit({
    action: 'employee.updated',
    entity: 'Employee',
    entityId: employee._id,
    user: req.user,
    req,
    changes: { before, after: { name: employee.name, department: employee.department, status: employee.status } },
  });

  res.json({ success: true, data: employee, message: 'Employee updated successfully.' });
});

export const deleteEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);
  if (!employee) throw new AppError('Employee not found.', 404);

  const hasVisits = await VisitRequest.exists({ employee: employee._id });
  if (hasVisits) {
    employee.status = 'inactive';
    await employee.save();

    await logAudit({
      action: 'employee.deactivated',
      entity: 'Employee',
      entityId: employee._id,
      user: req.user,
      req,
      changes: { before: { status: 'active' }, after: { status: 'inactive' } },
    });

    res.json({ success: true, data: employee, message: 'Employee deactivated (historical visits preserved).' });
    return;
  }

  await logAudit({
    action: 'employee.deleted',
    entity: 'Employee',
    entityId: employee._id,
    user: req.user,
    req,
    changes: { before: { name: employee.name, employeeId: employee.employeeId } },
  });

  await employee.deleteOne();
  res.json({ success: true, data: null, message: 'Employee deleted successfully.' });
});

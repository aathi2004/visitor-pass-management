import VisitRequest, { VISIT_STATUS } from '../models/VisitRequest.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { generateCSV, generateExcel, generatePDF } from '../utils/exportHelpers.js';

const toDate = (s) => {
  if (!s) return null;
  const d = new Date(`${s}T00:00:00`);
  if (Number.isNaN(d.getTime())) throw new AppError(`Invalid date: ${s}`);
  return s;
};

function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const RANGE = {
  today: () => {
    const d = new Date();
    return [toDateStr(d), toDateStr(d)];
  },
  week: () => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    return [toDateStr(start), toDateStr(end)];
  },
  month: () => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - 29);
    return [toDateStr(start), toDateStr(end)];
  },
};

const STATUS_LABELS = {
  pending: 'Pending',
  approved: 'Approved',
  checked_in: 'Checked In',
  checked_out: 'Checked Out',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

const visitColumns = [
  { key: 'visitorName', label: 'Visitor Name', accessor: (r) => r.visitor?.name || '' },
  { key: 'visitorPhone', label: 'Phone', accessor: (r) => r.visitor?.phone || '' },
  { key: 'visitorCompany', label: 'Company', accessor: (r) => r.visitor?.company || '' },
  { key: 'visitorEmail', label: 'Email', accessor: (r) => r.visitor?.email || '' },
  { key: 'employeeName', label: 'Employee', accessor: (r) => r.employee?.name || '' },
  { key: 'employeeId', label: 'Employee ID', accessor: (r) => r.employee?.employeeId || '' },
  { key: 'department', label: 'Department', accessor: (r) => r.employee?.department || '' },
  { key: 'date', label: 'Visit Date', accessor: (r) => r.date || '' },
  { key: 'arrival', label: 'Arrival', accessor: (r) => r.expectedArrivalTime || '' },
  { key: 'departure', label: 'Departure', accessor: (r) => r.expectedDepartureTime || '' },
  { key: 'purpose', label: 'Purpose', accessor: (r) => r.purpose || '' },
  { key: 'status', label: 'Status', accessor: (r) => STATUS_LABELS[r.status] || r.status },
  { key: 'checkIn', label: 'Check In', accessor: (r) => r.checkInTime ? new Date(r.checkInTime).toLocaleString() : '' },
  { key: 'checkOut', label: 'Check Out', accessor: (r) => r.checkOutTime ? new Date(r.checkOutTime).toLocaleString() : '' },
  { key: 'registeredBy', label: 'Registered By', accessor: (r) => r.createdBy?.name || '' },
];

async function fetchReportData(query) {
  const { range = 'week', from, to, status, department } = query;

  let start, end;
  if (from && to) {
    start = toDate(from);
    end = toDate(to);
  } else {
    const fn = RANGE[range];
    if (!fn) throw new AppError('Invalid report range. Use today, week or month.');
    [start, end] = fn();
  }
  if (start > end) throw new AppError('Start date cannot be after end date.');

  const filter = { date: { $gte: start, $lte: end } };
  if (status) {
    const statuses = status.split(',').map((s) => s.trim()).filter(Boolean);
    filter.status = statuses.length === 1 ? statuses[0] : { $in: statuses };
  }

  let visits = await VisitRequest.find(filter)
    .populate('employee', 'name employeeId department designation')
    .populate('createdBy', 'name role')
    .lean();

  if (department) {
    const deptLower = department.toLowerCase();
    visits = visits.filter((v) => v.employee?.department?.toLowerCase() === deptLower);
  }

  return visits;
}

export const exportVisits = asyncHandler(async (req, res) => {
  const { format = 'csv' } = req.query;
  const visits = await fetchReportData(req.query);

  if (format === 'xlsx') {
    const buffer = await generateExcel(visits, visitColumns, 'Visitor Report');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=visitor-report.xlsx');
    return res.send(buffer);
  }

  if (format === 'pdf') {
    const buffer = await generatePDF(visits, visitColumns, 'Visitor Report');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=visitor-report.pdf');
    return res.send(buffer);
  }

  const csv = generateCSV(visits, visitColumns);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=visitor-report.csv');
  res.send(csv);
});

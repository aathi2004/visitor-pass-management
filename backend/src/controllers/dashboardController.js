import VisitRequest, { VISIT_STATUS } from '../models/VisitRequest.js';
import Employee from '../models/Employee.js';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { todayStr, toDateStr } from '../utils/visitRules.js';

const statusIn = (arr) => ({ status: { $in: arr } });

function last7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(toDateStr(d));
  }
  return days;
}

export const getDashboard = asyncHandler(async (req, res) => {
  const role = req.user.role;
  const today = todayStr();
  const data = { role, cards: [], lists: [], charts: null };

  const count = (f) => VisitRequest.countDocuments(f);
  const [pending, todayTotal, inside, checkedOutToday, totalEmployees, scheduled, totalVisitors, rejected] =
    await Promise.all([
      count(statusIn([VISIT_STATUS.PENDING])),
      count({ date: today }),
      count(statusIn([VISIT_STATUS.CHECKED_IN])),
      count({ date: today, status: VISIT_STATUS.CHECKED_OUT }),
      Employee.countDocuments({ status: 'active' }),
      count({ date: today, status: VISIT_STATUS.APPROVED }),
      VisitRequest.countDocuments({}),
      count(statusIn([VISIT_STATUS.REJECTED])),
    ]);

  if (role === 'admin') {
    data.cards = [
      { key: 'totalEmployees', label: 'Total Employees', value: totalEmployees, icon: 'people' },
      { key: 'pending', label: 'Pending Requests', value: pending, icon: 'clock' },
      { key: 'today', label: "Today's Visitors", value: todayTotal, icon: 'calendar' },
      { key: 'inside', label: 'Visitors Currently Inside', value: inside, icon: 'door' },
      { key: 'scheduled', label: 'Scheduled Today', value: scheduled, icon: 'check' },
      { key: 'totalVisitors', label: 'Total Visit Requests', value: totalVisitors, icon: 'file' },
    ];

    data.lists.push(
      {
        title: 'Recent Visit Requests',
        items: await VisitRequest.find()
          .populate('employee', 'name')
          .populate('createdBy', 'name')
          .sort({ createdAt: -1 })
          .limit(8)
          .lean(),
      },
      {
        title: 'Visitors Currently Inside',
        items: await VisitRequest.find({ status: VISIT_STATUS.CHECKED_IN })
          .populate('employee', 'name')
          .populate('createdBy', 'name')
          .sort({ checkInTime: -1 })
          .limit(8)
          .lean(),
      }
    );

    data.charts = await buildChartData(today);
  }

  if (role === 'receptionist') {
    data.cards = [
      { key: 'pending', label: 'Pending Approval', value: pending, icon: 'clock' },
      { key: 'today', label: "Today's Visitors", value: todayTotal, icon: 'calendar' },
      { key: 'scheduled', label: 'Scheduled Today (Approved)', value: scheduled, icon: 'check' },
      { key: 'inside', label: 'Visitors Currently Inside', value: inside, icon: 'door' },
      { key: 'checkedOut', label: "Checked Out Today", value: checkedOutToday, icon: 'exit' },
    ];

    data.lists.push(
      {
        title: 'Visitors Currently Inside',
        items: await VisitRequest.find({ status: VISIT_STATUS.CHECKED_IN })
          .populate('employee', 'name')
          .populate('createdBy', 'name')
          .sort({ checkInTime: -1 })
          .limit(8)
          .lean(),
      },
      {
        title: "Today's Approved Visits",
        items: await VisitRequest.find({ date: today, status: VISIT_STATUS.APPROVED })
          .populate('employee', 'name')
          .populate('createdBy', 'name')
          .sort({ expectedArrivalTime: 1 })
          .limit(8)
          .lean(),
      },
      {
        title: 'Recent Registrations',
        items: await VisitRequest.find()
          .populate('employee', 'name')
          .populate('createdBy', 'name')
          .sort({ createdAt: -1 })
          .limit(8)
          .lean(),
      }
    );

    data.charts = await buildChartData(today);
  }

  if (role === 'employee') {
    const user = await User.findById(req.user._id);
    const empId = user.employee;
    const empFilter = empId ? { employee: empId } : { employee: null };

    const [myPending, myToday, myApproved, myCheckedIn] = await Promise.all([
      count({ ...empFilter, status: VISIT_STATUS.PENDING }),
      count({ ...empFilter, date: today }),
      count({ ...empFilter, status: VISIT_STATUS.APPROVED }),
      count({ ...empFilter, status: VISIT_STATUS.CHECKED_IN }),
    ]);

    data.cards = [
      { key: 'pending', label: 'Pending My Approval', value: myPending, icon: 'clock' },
      { key: 'today', label: "Today's Visitors for Me", value: myToday, icon: 'calendar' },
      { key: 'approved', label: 'Awaiting Check-in', value: myApproved, icon: 'check' },
      { key: 'inside', label: 'My Visitors Currently Inside', value: myCheckedIn, icon: 'door' },
    ];

    data.lists.push(
      {
        title: 'Pending Requests for You',
        items: await VisitRequest.find({ ...empFilter, status: VISIT_STATUS.PENDING })
          .populate('employee', 'name')
          .populate('createdBy', 'name')
          .sort({ createdAt: -1 })
          .limit(8)
          .lean(),
      },
      {
        title: "Today's Visitors for You",
        items: await VisitRequest.find({ ...empFilter, date: today })
          .populate('employee', 'name')
          .populate('createdBy', 'name')
          .sort({ createdAt: -1 })
          .limit(8)
          .lean(),
      }
    );
  }

  res.json({ success: true, data });
});

async function buildChartData(today) {
  const days = last7Days();
  const weekStart = days[0];
  const weekEnd = days[days.length - 1];

  const weekVisits = await VisitRequest.find({
    date: { $gte: weekStart, $lte: weekEnd },
  }).lean();

  const weeklyTrend = days.map((day) => {
    const dayVisits = weekVisits.filter((v) => v.date === day);
    return {
      date: day,
      total: dayVisits.length,
      approved: dayVisits.filter((v) => v.status === VISIT_STATUS.APPROVED).length,
      checkedIn: dayVisits.filter((v) => v.status === VISIT_STATUS.CHECKED_IN).length,
      checkedOut: dayVisits.filter((v) => v.status === VISIT_STATUS.CHECKED_OUT).length,
    };
  });

  const statusCounts = {};
  Object.values(VISIT_STATUS).forEach((s) => { statusCounts[s] = 0; });
  weekVisits.forEach((v) => { statusCounts[v.status] = (statusCounts[v.status] || 0) + 1; });
  const statusDistribution = Object.entries(statusCounts)
    .filter(([, count]) => count > 0)
    .map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }));

  const deptMap = new Map();
  weekVisits.forEach((v) => {
    const dept = v.employee?.department || 'Unknown';
    deptMap.set(dept, (deptMap.get(dept) || 0) + 1);
  });
  const departmentDistribution = [...deptMap.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const empIds = [...new Set(weekVisits.filter((v) => v.employee).map((v) => v.employee.toString()))];
  let employeeVisitorCount = [];
  if (empIds.length) {
    const employees = await Employee.find({ _id: { $in: empIds } }).select('name employeeId').lean();
    const empMap = new Map(employees.map((e) => [e._id.toString(), e.name]));
    const empCountMap = new Map();
    weekVisits.forEach((v) => {
      const eid = v.employee?.toString();
      if (eid) empCountMap.set(eid, (empCountMap.get(eid) || 0) + 1);
    });
    employeeVisitorCount = [...empCountMap.entries()]
      .map(([id, value]) => ({ name: empMap.get(id) || id, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 15);
  }

  const hourMap = new Map();
  for (let h = 0; h < 24; h++) hourMap.set(h, 0);
  weekVisits.forEach((v) => {
    if (v.checkInTime) {
      const hour = new Date(v.checkInTime).getHours();
      hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
    }
  });
  const hourlyPattern = [...hourMap.entries()]
    .map(([hour, count]) => ({
      hour: `${String(hour).padStart(2, '0')}:00`,
      checkIns: count,
    }));

  return { weeklyTrend, statusDistribution, departmentDistribution, employeeVisitorCount, hourlyPattern };
}

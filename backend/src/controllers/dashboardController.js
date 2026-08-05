import VisitRequest, { VISIT_STATUS } from '../models/VisitRequest.js';
import Employee from '../models/Employee.js';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { todayStr } from '../utils/visitRules.js';

const statusIn = (arr) => ({ status: { $in: arr } });

export const getDashboard = asyncHandler(async (req, res) => {
  const role = req.user.role;
  const today = todayStr();
  const data = { role, cards: [], lists: [] };

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
          .limit(8),
      },
      {
        title: 'Visitors Currently Inside',
        items: await VisitRequest.find({ status: VISIT_STATUS.CHECKED_IN })
          .populate('employee', 'name')
          .populate('createdBy', 'name')
          .sort({ checkInTime: -1 })
          .limit(8),
      }
    );
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
          .limit(8),
      },
      {
        title: "Today's Approved Visits",
        items: await VisitRequest.find({ date: today, status: VISIT_STATUS.APPROVED })
          .populate('employee', 'name')
          .populate('createdBy', 'name')
          .sort({ expectedArrivalTime: 1 })
          .limit(8),
      },
      {
        title: 'Recent Registrations',
        items: await VisitRequest.find()
          .populate('employee', 'name')
          .populate('createdBy', 'name')
          .sort({ createdAt: -1 })
          .limit(8),
      }
    );
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
          .limit(8),
      },
      {
        title: "Today's Visitors for You",
        items: await VisitRequest.find({ ...empFilter, date: today })
          .populate('employee', 'name')
          .populate('createdBy', 'name')
          .sort({ createdAt: -1 })
          .limit(8),
      }
    );
  }

  res.json({ data });
});

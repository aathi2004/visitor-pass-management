import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Employee from './models/Employee.js';
import VisitRequest, { VISIT_STATUS, ACTION } from './models/VisitRequest.js';
import { config } from './config/index.js';
import { addActivity, todayStr, toDateStr } from './utils/visitRules.js';

dotenv.config();

const run = async () => {
  await mongoose.connect(config.mongoUri);
  console.log('Connected. Seeding database...');

  await Promise.all([
    User.deleteMany({}),
    Employee.deleteMany({}),
    VisitRequest.deleteMany({}),
  ]);

  const [adminUser, receptionistUser, empUser, empUser2] = await User.create([
    {
      name: 'System Administrator',
      username: 'admin',
      email: 'admin@company.com',
      password: 'admin123',
      role: 'admin',
    },
    {
      name: 'Rekha Menon',
      username: 'receptionist',
      email: 'receptionist@company.com',
      password: 'reception123',
      role: 'receptionist',
    },
    {
      name: 'Arjun Nair',
      username: 'arjun',
      email: 'arjun@company.com',
      password: 'employee123',
      role: 'employee',
    },
    {
      name: 'Priya Sharma',
      username: 'priya',
      email: 'priya@company.com',
      password: 'employee123',
      role: 'employee',
    },
  ]);

  const [emp1, emp2, emp3] = await Employee.create([
    {
      name: 'Arjun Nair',
      employeeId: 'EMP001',
      department: 'Engineering',
      designation: 'Senior Software Engineer',
      email: 'arjun@company.com',
      phone: '9847000001',
      user: empUser._id,
    },
    {
      name: 'Priya Sharma',
      employeeId: 'EMP002',
      department: 'Human Resources',
      designation: 'HR Manager',
      email: 'priya@company.com',
      phone: '9847000002',
      user: empUser2._id,
    },
    {
      name: 'Vikram Singh',
      employeeId: 'EMP003',
      department: 'Sales',
      designation: 'Account Executive',
      email: 'vikram@company.com',
      phone: '9847000003',
    },
  ]);

  empUser.employee = emp1._id;
  empUser2.employee = emp2._id;
  await Promise.all([empUser.save(), empUser2.save()]);

  const today = todayStr();
  const past = toDateStr(new Date(Date.now() - 2 * 86400000));
  const future = toDateStr(new Date(Date.now() + 2 * 86400000));

  const mkVisit = async (visitor, employee, date, arrival, depart, purpose, status, opts = {}) => {
    const visit = await VisitRequest.create({
      visitor,
      employee,
      date,
      expectedArrivalTime: arrival,
      expectedDepartureTime: depart,
      purpose,
      createdBy: receptionistUser._id,
      checkInTime: opts.checkInTime || null,
      checkOutTime: opts.checkOutTime || null,
      status,
    });
    addActivity(visit, ACTION.CREATED, receptionistUser, 'Visit request created');
    if (status === VISIT_STATUS.APPROVED || opts.approved) {
      addActivity(visit, ACTION.APPROVED, empUser._id, 'Approved');
    }
    if (status === VISIT_STATUS.REJECTED) {
      addActivity(visit, ACTION.REJECTED, empUser._id, 'Not required at this time');
    }
    if (opts.checkInTime) addActivity(visit, ACTION.CHECKED_IN, receptionistUser, 'Checked in');
    if (opts.checkOutTime) addActivity(visit, ACTION.CHECKED_OUT, receptionistUser, 'Checked out');
    await visit.save();
    return visit;
  };

  const t = (dayOffset, h, m) => new Date(Date.now() + dayOffset * 86400000).setHours(h, m, 0, 0);

  await mkVisit(
    { name: 'Rahul Verma', email: 'rahul.v@vendor.com', phone: '9000000001', company: 'TechVendors', idType: 'Driver License', idNumber: 'DL90001' },
    emp1._id, past, '10:00', '12:00', 'Discuss API integration roadmap', VISIT_STATUS.CHECKED_OUT,
    { checkInTime: t(-2, 10, 10), checkOutTime: t(-2, 12, 30), approved: true }
  );

  await mkVisit(
    { name: 'Sneha Iyer', email: 'sneha@client.com', phone: '9000000002', company: 'ClientCorp', idType: 'Passport', idNumber: 'PP90002' },
    emp1._id, past, '15:00', '16:30', 'Quarterly review meeting', VISIT_STATUS.CHECKED_OUT,
    { checkInTime: t(-1, 15, 5), checkOutTime: t(-1, 16, 45), approved: true }
  );

  await mkVisit(
    { name: 'David Kim', email: 'david@audit.com', phone: '9000000003', company: 'AuditFirm', idType: 'Company ID', idNumber: 'CI90003' },
    emp2._id, past, '11:00', '13:00', 'Compliance audit', VISIT_STATUS.REJECTED
  );

  await mkVisit(
    { name: 'Meera Krishnan', email: 'meera@infra.com', phone: '9000000004', company: 'InfraWorks', idType: 'Driver License', idNumber: 'DL90004' },
    emp1._id, today, '09:30', '11:00', 'Server room maintenance', VISIT_STATUS.CHECKED_IN,
    { checkInTime: t(0, 9, 40), approved: true }
  );

  await mkVisit(
    { name: 'Rohit Kapoor', email: 'rohit@recruit.com', phone: '9000000005', company: 'HireMe Agency', idType: 'Company ID', idNumber: 'CI90005' },
    emp2._id, today, '14:00', '15:30', 'Candidate interview - senior analyst', VISIT_STATUS.APPROVED, { approved: true }
  );

  await mkVisit(
    { name: 'Fatima Begum', email: 'fatima@cafe.com', phone: '9000000006', company: 'OfficeCafe', idType: 'Aadhaar', idNumber: 'AD90006' },
    emp1._id, today, '10:00', '11:00', 'Cafeteria vendor renewal', VISIT_STATUS.PENDING
  );

  await mkVisit(
    { name: 'Alex Fernandes', email: 'alex@cloudhost.com', phone: '9000000007', company: 'CloudHost', idType: 'Driver License', idNumber: 'DL90007' },
    emp1._id, today, '16:00', '18:00', 'New deployment setup', VISIT_STATUS.PENDING
  );

  await mkVisit(
    { name: 'Nisha Rao', email: 'nisha@coach.com', phone: '9000000008', company: 'FitLife', idType: 'Company ID', idNumber: 'CI90008' },
    emp3._id, today, '17:00', '18:00', 'Wellness workshop planning', VISIT_STATUS.CANCELLED
  );

  await mkVisit(
    { name: 'Karthik Menon', email: 'karthik@delivery.com', phone: '9000000009', company: 'QuickDeliver', idType: 'Driver License', idNumber: 'DL90009' },
    emp1._id, future, '10:30', '12:00', 'Equipment handover', VISIT_STATUS.PENDING
  );

  await mkVisit(
    { name: 'Anjali Desai', email: 'anjali@finance.com', phone: '9000000010', company: 'FinSolutions', idType: 'Passport', idNumber: 'PP90010' },
    emp2._id, future, '11:00', '12:30', 'Budget planning session', VISIT_STATUS.APPROVED, { approved: true }
  );

  console.log('Seed complete.');
  console.log('----------------------------------------');
  console.log('Admin       : admin / admin123');
  console.log('Receptionist: receptionist / reception123');
  console.log('Employee 1  : arjun / employee123 (Arjun Nair, ENG)');
  console.log('Employee 2  : priya / employee123 (Priya Sharma, HR)');
  console.log('----------------------------------------');

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

# Visitor Pass Management System

A full-stack MERN application for managing office visitor check-ins. It supports role-based
access for **Administrators**, **Receptionists**, and **Employees**, with a complete
register → approve → check-in → check-out → history workflow, enforced business rules,
search, reports, and activity history.

## Tech Stack

| Layer      | Technology                                             |
| ---------- | ------------------------------------------------------ |
| Frontend   | React 18 + Vite, React Router, Axios, React Toastify   |
| Backend    | Node.js, Express.js, JWT auth, express-validator       |
| Database   | MongoDB (Mongoose)                                     |
| Auth       | JSON Web Tokens (bcrypt password hashing)              |

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB running locally (`mongodb://127.0.0.1:27017`)

### 1. Backend

```bash
cd backend
npm install
copy .env.example .env   # adjust values if needed
npm run seed             # seeds demo users, employees and sample visits
npm run dev              # http://localhost:5000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev              # http://localhost:5173 (proxies /api to backend)
```

### Demo Accounts

| Role          | Username      | Password       |
| ------------- | ------------- | -------------- |
| Administrator | `admin`       | `admin123`     |
| Receptionist  | `receptionist`| `reception123` |
| Employee      | `arjun`       | `employee123`  |
| Employee      | `priya`       | `employee123`  |

## Roles & Capabilities

- **Administrator** — overall dashboard, manage employees, manage user accounts,
  visitor reports, activity history.
- **Receptionist** — register visitors, check in / check out visitors, view and search
  visitor history.
- **Employee** — view visitor requests addressed to them, approve / reject requests,
  add remarks.

Backend APIs are protected with JWT (`protect` middleware) and role-based authorization
(`authorize(...roles)` middleware). Frontend routes are guarded by `<ProtectedRoute>`
and the navigation menu renders based on the logged-in role.

## Visitor Workflow

```
Receptionist registers a visitor
        │  (status: pending)
        ▼
Employee reviews and approves / rejects
        │  (status: approved / rejected)
        ▼
Receptionist checks in approved visitor
        │  (status: checked_in)
        ▼
Receptionist checks out visitor
        │  (status: checked_out)
        ▼
Visitor history + activity log maintained
```

## Business Rules Implemented

| # | Rule                                                              | Location                                                                 |
| - | ----------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 1 | No more than one active visit at the same time                    | `backend/src/utils/visitRules.js` → `validateRegistration`               |
| 2 | No duplicate registration for same visitor on same date           | `backend/src/utils/visitRules.js` → `validateRegistration`               |
| 3 | Visit date cannot be earlier than current date                    | `backend/src/utils/visitRules.js` → `validateVisitTiming`                |
| 4 | Today's arrival time cannot be earlier than now                   | `backend/src/utils/visitRules.js` → `validateVisitTiming`                |
| 5 | Employee can't have more than 3 pending requests                  | `backend/src/utils/visitRules.js` → `validateRegistration`               |
| 6 | Visitors only checked in after approval                           | `backend/src/utils/visitRules.js` → `canCheckIn`                         |
| 7 | Already checked-in visitor can't check in again until check-out   | `backend/src/utils/visitRules.js` → `canCheckIn`                         |
| 8 | Check-out time must be later than check-in time                   | `backend/src/utils/visitRules.js` → `canCheckOut`                        |
| 9 | Rejected requests cannot be checked in                            | `backend/src/utils/visitRules.js` → `canCheckIn`                         |
| 10| Cancelled visits excluded from active lists                       | status filters in list/dashboard queries                                 |

## Project Structure

```
visitor-pass/
├── backend/
│   └── src/
│       ├── config/          # env config
│       ├── models/          # User, Employee, VisitRequest (with activity schema)
│       ├── controllers/     # auth, employee, user, visitor, report, dashboard
│       ├── routes/          # express routers with validation
│       ├── middleware/      # JWT protect, role authorize, request validation
│       ├── utils/           # business rules, error handling, async wrapper
│       ├── app.js           # express app
│       ├── server.js        # entry point
│       └── seed.js          # demo data
└── frontend/
    └── src/
        ├── components/      # Layout, ProtectedRoute, Modal, VisitTable, Badges…
        ├── context/         # AuthProvider (login/logout/session)
        ├── pages/           # Login, Dashboard, admin/, receptionist/, employee/
        ├── services/        # axios instance with auth interceptors
        ├── utils/           # formatting helpers
        └── styles/          # global stylesheet
```

## API Summary

| Method | Endpoint                       | Access                 | Purpose                              |
| ------ | ------------------------------ | ---------------------- | ------------------------------------ |
| POST   | `/api/auth/login`              | public                 | Log in, returns JWT + user           |
| GET    | `/api/auth/me`                 | any authenticated      | Current user profile                 |
| GET    | `/api/dashboard`               | any authenticated      | Role-specific dashboard data         |
| GET    | `/api/employees`               | any authenticated      | List employees (search, pagination)  |
| POST   | `/api/employees`               | admin                  | Create employee                      |
| PUT    | `/api/employees/:id`           | admin                  | Update employee                      |
| DELETE | `/api/employees/:id`           | admin                  | Delete / deactivate employee         |
| GET    | `/api/users`                   | admin                  | List user accounts                   |
| POST   | `/api/users`                   | admin                  | Create user account                  |
| PUT    | `/api/users/:id`               | admin                  | Update user account                  |
| DELETE | `/api/users/:id`               | admin                  | Deactivate user account              |
| GET    | `/api/visitors`                | any authenticated      | List / search / filter visits        |
| POST   | `/api/visitors/register`       | admin, receptionist    | Register visitor request             |
| POST   | `/api/visitors/:id/approve`    | admin, employee        | Approve request                      |
| POST   | `/api/visitors/:id/reject`     | admin, employee        | Reject request                       |
| POST   | `/api/visitors/:id/remark`     | admin, employee        | Add remark                           |
| POST   | `/api/visitors/:id/check-in`   | admin, receptionist    | Check in visitor                     |
| POST   | `/api/visitors/:id/check-out`  | admin, receptionist    | Check out visitor                    |
| POST   | `/api/visitors/:id/cancel`     | admin, receptionist, employee | Cancel visit                   |
| GET    | `/api/reports/visitors`        | admin                  | Summary reports with filters         |
| GET    | `/api/reports/activities`      | admin                  | Global activity history              |

## Notes

- **Activity history**: every request embeds an activity trail (created / approved /
  rejected / checked_in / checked_out / cancelled / remark_added) recording the action,
  timestamp, and acting user. It is visible in the visit detail modal and aggregated in
  the admin Activity Log.
- **Reports**: Today / This Week / Last 30 Days / custom date range, with optional status
  filter. Includes summaries, visits-by-day, top employees, top companies, and average
  visit duration.
- **Duplicate rule**: a cancelled registration can be re-registered, which keeps the
  reception desk usable while still preventing active duplicates.

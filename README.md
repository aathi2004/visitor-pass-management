# Visitor Pass Management System

A full-stack MERN application for managing office visitor check-ins. It supports role-based
access for **Administrators**, **Receptionists**, and **Employees**, with a complete
register → approve → check-in → check-out → history workflow, enforced business rules,
search, reports, and activity history.

## Live Deployment

| App    | URL                                        |
| ------ | ------------------------------------------ |
| Website | https://visitor-pass-management.vercel.app |

A single application: the React frontend and the Express API (`/api/*`) are served from
the same URL. Demo accounts: see [Demo Accounts](#demo-accounts).

## Tech Stack

| Layer      | Technology                                             |
| ---------- | ------------------------------------------------------ |
| Frontend   | React 18 + Vite, React Router, Axios, React Toastify   |
| Backend    | Node.js, Express.js, JWT auth, express-validator       |
| Database   | MongoDB (Mongoose)                                     |
| Auth       | JSON Web Tokens (bcrypt password hashing)              |
| Hosting    | Vercel (single project: static React + serverless Express) |

## Getting Started (Local Development)

### Prerequisites

- Node.js 18+
- MongoDB — either a local instance (`mongodb://127.0.0.1:27017`) or a free
  [MongoDB Atlas](https://www.mongodb.com/atlas) cluster (see
  [MongoDB Setup](#mongodb-setup))

### Install & run (single app)

```bash
npm install
copy .env.example .env   # Windows  (macOS/Linux: cp .env.example .env)
npm run seed             # seeds demo users, employees and sample visits
npm run dev              # starts API (:5000) + Vite dev server (:5173)
```

- Frontend: http://localhost:5173
- API: http://localhost:5000 (the Vite dev server proxies `/api` to it — see `vite.config.js`)

### Demo Accounts

| Role          | Username      | Password       |
| ------------- | ------------- | -------------- |
| Administrator | `admin`       | `admin123`     |
| Receptionist  | `receptionist`| `reception123` |
| Employee      | `arjun`       | `employee123`  |
| Employee      | `priya`       | `employee123`  |

## Environment Variables

Single `.env` at the repository root (used by both the API and the frontend build).

| Variable        | Required | Default                                       | Description                                            |
| --------------- | -------- | --------------------------------------------- | ------------------------------------------------------ |
| `PORT`          | no       | `5000`                                        | Local API server port                                  |
| `MONGODB_URI`   | yes*     | `mongodb://127.0.0.1:27017/visitor-pass`      | MongoDB connection string (*required in production)    |
| `JWT_SECRET`    | yes*     | `visitor-pass-dev-secret`                     | Secret used to sign JWTs (*use a strong value in prod) |
| `JWT_EXPIRES_IN`| no       | `8h`                                          | JWT lifetime                                           |
| `CORS_ORIGINS`  | no       | `http://localhost:5173`                       | Comma-separated allowed origins (same-origin apps don't need it) |
| `VITE_API_URL`  | no       | *(empty)*                                     | External API base URL for the built frontend. Leave empty → requests go to the same origin (`/api`). |

> `VITE_*` variables are inlined into the frontend build, so the app must be
> **rebuilt/redeployed** after changing `VITE_API_URL`.

## MongoDB Setup

### Option A — Local MongoDB

Install MongoDB Community Server and make sure the service is running on the default
port. Keep the default `MONGODB_URI` or point it at your instance.

### Option B — MongoDB Atlas (cloud, required for Vercel)

1. Create a free cluster at https://www.mongodb.com/atlas.
2. **Database Access → Add New Database User** — set a username and password you
   remember (used in the connection string).
3. **Network Access → Add IP Address → Allow access from anywhere** (`0.0.0.0/0`) or
   add your deployment IPs. Atlas returns `bad auth : authentication failed` when the
   requesting IP is not allowlisted.
4. **Database → Connect → Drivers** — copy the `mongodb+srv://...` connection string
   and add your database name, e.g. `...@cluster0.abcd123.mongodb.net/visitor-pass?retryWrites=true&w=majority`.
5. Set it as `MONGODB_URI` locally and on Vercel.

## Deploy to Vercel

A single Vercel project serves both the built React app and the Express API. The
`api/index.js` file is the serverless entry (a cached Mongoose connection), the Vite
build output (`dist/`) is served as static files, and `/api/*` requests are routed to
the function via `vercel.json`.

### Prerequisites

```bash
npm i -g vercel
vercel login
```

### Deploy

```bash
vercel deploy --prod --yes
```

Set these environment variables on the **visitor-pass-management** project
(dashboard → Settings → Environment Variables, or `vercel env add`):

| Variable       | Example value                                                        |
| -------------- | -------------------------------------------------------------------- |
| `MONGODB_URI`  | `mongodb+srv://<user>:<password>@cluster0.abcd123.mongodb.net/visitor-pass` |
| `JWT_SECRET`   | any long random string                                                |
| `CORS_ORIGINS` | `https://visitor-pass-management.vercel.app,http://localhost:5173`    |

Then redeploy:

```bash
vercel deploy --prod --yes
```

The frontend calls `/api` on the same origin, so **no `VITE_API_URL` is needed** for the
combined deployment. Leave it empty in `.env`.

> **Note:** `vercel.json` uses explicit `builds` (serverless function + static build),
> so Vercel skips framework auto-detection and runs `npm run build` (Vite) at the root.
>
> **Deployment Protection:** if your Vercel team enables SSO Deployment Protection by
> default, the deployment URLs may redirect to a Vercel login. Disable it under
> **Project → Settings → Deployment Protection** for public access.

### Local URLs recap

- API: `http://localhost:5000`
- Vite dev server: `http://localhost:5173`

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
├── api/
│   └── index.js            # Vercel serverless entry (cached Mongo connection)
├── backend/
│   └── src/
│       ├── config/          # env config
│       ├── models/          # User, Employee, VisitRequest (with activity schema)
│       ├── controllers/     # auth, employee, user, visitor, report, dashboard
│       ├── routes/          # express routers with validation
│       ├── middleware/      # JWT protect, role authorize, request validation
│       ├── utils/           # business rules, error handling, async wrapper
│       ├── app.js           # express app
│       ├── server.js        # local API entry point
│       └── seed.js          # demo data
├── src/                     # React frontend (Vite)
│   ├── components/          # Layout, ProtectedRoute, Modal, VisitTable, Badges…
│   ├── context/             # AuthProvider (login/logout/session)
│   ├── pages/               # Login, Dashboard, admin/, receptionist/, employee/
│   ├── services/            # axios instance with auth interceptors
│   ├── utils/               # formatting helpers
│   └── styles/              # global stylesheet
├── index.html               # Vite entry
├── vite.config.js           # dev proxy /api → localhost:5000
├── vercel.json              # serverless function + static build + SPA fallback
└── package.json             # combined scripts (dev, build, seed, server)
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

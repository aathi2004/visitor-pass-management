import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import NotFound from './pages/NotFound.jsx';

import Dashboard from './pages/Dashboard.jsx';
import Employees from './pages/admin/Employees.jsx';
import Users from './pages/admin/Users.jsx';
import Reports from './pages/admin/Reports.jsx';
import ActivityLog from './pages/admin/ActivityLog.jsx';
import RegisterVisitor from './pages/receptionist/RegisterVisitor.jsx';
import Visitors from './pages/receptionist/Visitors.jsx';
import MyRequests from './pages/employee/MyRequests.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />

        {/* Admin */}
        <Route
          path="/employees"
          element={
            <ProtectedRoute roles={['admin']}>
              <Employees />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute roles={['admin']}>
              <Users />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute roles={['admin']}>
              <Reports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/activities"
          element={
            <ProtectedRoute roles={['admin']}>
              <ActivityLog />
            </ProtectedRoute>
          }
        />

        {/* Receptionist */}
        <Route
          path="/register"
          element={
            <ProtectedRoute roles={['admin', 'receptionist']}>
              <RegisterVisitor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/visitors"
          element={
            <ProtectedRoute roles={['admin', 'receptionist']}>
              <Visitors />
            </ProtectedRoute>
          }
        />

        {/* Employee */}
        <Route
          path="/requests"
          element={
            <ProtectedRoute roles={['admin', 'employee']}>
              <MyRequests />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="/404" element={<NotFound />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}

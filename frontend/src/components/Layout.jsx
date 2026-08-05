import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { initials, ROLE_META } from '../utils/format.js';

const ICONS = {
  dashboard: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  ),
  employees: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-2a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v2" />
      <path d="M19 3v6M16 6h6" />
    </svg>
  ),
  reports: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3v18h18" />
      <rect x="7" y="10" width="3" height="6" />
      <rect x="12" y="6" width="3" height="10" />
      <rect x="17" y="13" width="3" height="3" />
    </svg>
  ),
  activities: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 8v4l3 3" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  ),
  register: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  visitors: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  ),
  requests: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M9 13h6M9 17h4" />
    </svg>
  ),
};

const NAV_BY_ROLE = {
  admin: [
    { to: '/', label: 'Dashboard', icon: 'dashboard' },
    { to: '/employees', label: 'Employees', icon: 'employees' },
    { to: '/users', label: 'User Accounts', icon: 'users' },
    { to: '/reports', label: 'Reports', icon: 'reports' },
    { to: '/activities', label: 'Activity Log', icon: 'activities' },
  ],
  receptionist: [
    { to: '/', label: 'Dashboard', icon: 'dashboard' },
    { to: '/register', label: 'Register Visitor', icon: 'register' },
    { to: '/visitors', label: 'Visitors', icon: 'visitors' },
  ],
  employee: [
    { to: '/', label: 'Dashboard', icon: 'dashboard' },
    { to: '/requests', label: 'My Requests', icon: 'requests' },
  ],
};

const TITLES = {
  '/': 'Dashboard',
  '/employees': 'Manage Employees',
  '/users': 'User Accounts',
  '/reports': 'Visitor Reports',
  '/activities': 'Activity History',
  '/register': 'Register Visitor',
  '/visitors': 'Visitor Management',
  '/requests': 'My Visitor Requests',
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const navItems = NAV_BY_ROLE[user?.role] || [];
  const roleMeta = ROLE_META[user?.role] || { label: user?.role };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const title = TITLES[window.location.pathname] || 'Dashboard';
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="layout">
      {open && <div className="sidebar-backdrop" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <span className="logo">🛂</span>
          <span>Visitor Pass</span>
        </div>
        <nav className="sidebar-nav">
          <div className="sidebar-section">{roleMeta.label} Menu</div>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setOpen(false)}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <span className="nav-icon">{ICONS[item.icon]}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-user">
          <div className="avatar">{initials(user?.name)}</div>
          <div className="meta">
            <div className="name">{user?.name}</div>
            <div className="role">{roleMeta.label}</div>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Log out">
            ⏻
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="menu-toggle" onClick={() => setOpen(true)} aria-label="Menu">
              ☰
            </button>
            <h2>{title}</h2>
          </div>
          <div className="date">{today}</div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import api, { errorMessage } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Spinner, EmptyState } from '../components/Feedback.jsx';
import VisitTable from '../components/VisitTable.jsx';
import VisitDetailModal from '../components/VisitDetailModal.jsx';
import { WeeklyTrendChart, StatusPieChart, DepartmentBarChart, HourlyPatternChart, EmployeeVisitorChart } from '../components/dashboard/Charts.jsx';

const ICON_MAP = {
  clock: '🕐',
  calendar: '📅',
  door: '🚪',
  check: '✅',
  exit: '🏃',
  people: '👥',
  file: '📄',
};

const ICON_CLASS = {
  totalEmployees: 'blue',
  pending: 'amber',
  today: 'blue',
  inside: 'green',
  scheduled: 'cyan',
  checkedOut: 'green',
  approved: 'cyan',
  totalVisitors: 'blue',
};

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/dashboard');
      setData(res.data.data);
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to load dashboard'));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!data) return <Spinner text="Loading dashboard..." />;

  const welcome = {
    admin: 'Administrator Overview',
    receptionist: 'Reception Desk Overview',
    employee: 'My Visitor Requests',
  }[user.role];

  const hasCharts = data.charts && (user.role === 'admin' || user.role === 'receptionist');

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 20 }}>{welcome}</h3>
        <div style={{ color: 'var(--muted)', marginTop: 2 }}>
          Hello, {user.name}. Here is what is happening today.
        </div>
      </div>

      <div className="stat-grid">
        {data.cards.map((c) => (
          <div className="stat-card" key={c.key}>
            <div className={`stat-icon ${ICON_CLASS[c.key] || 'blue'}`}>
              {ICON_MAP[c.icon] || '📊'}
            </div>
            <div>
              <div className="stat-value">{c.value}</div>
              <div className="stat-label">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {hasCharts && (
        <>
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Analytics</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
              <WeeklyTrendChart data={data.charts.weeklyTrend} />
              <StatusPieChart data={data.charts.statusDistribution} />
              <DepartmentBarChart data={data.charts.departmentDistribution} />
              <EmployeeVisitorChart data={data.charts.employeeVisitorCount} />
              <HourlyPatternChart data={data.charts.hourlyPattern} />
            </div>
          </div>
        </>
      )}

      {data.lists.map((list) => (
        <div className="card" key={list.title} style={{ marginBottom: 24 }}>
          <div className="card-header">
            <h3>{list.title}</h3>
            <span className="badge approved">{list.items.length}</span>
          </div>
          {list.items.length ? (
            <VisitTable
              items={list.items}
              onRowClick={setSelected}
              columns={['visitor', 'employee', 'date', 'time', 'status']}
            />
          ) : (
            <EmptyState icon="📭" title="No records" subtitle={`No ${list.title.toLowerCase()}.`} />
          )}
        </div>
      ))}

      {selected && (
        <VisitDetailModal
          visit={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

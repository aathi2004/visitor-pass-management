import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const STATUS_COLORS = {
  pending: '#d97706',
  approved: '#0891b2',
  checked_in: '#16a34a',
  checked_out: '#4f46e5',
  rejected: '#dc2626',
  cancelled: '#64748b',
};

const DEPT_COLORS = [
  '#2563eb', '#6366f1', '#0891b2', '#16a34a', '#d97706',
  '#dc2626', '#ec4899', '#8b5cf6', '#14b8a6', '#f59e0b',
];

function ChartCard({ title, children }) {
  return (
    <div className="card">
      <div className="card-header">
        <h3>{title}</h3>
      </div>
      <div className="card-body" style={{ padding: '16px 8px 8px' }}>
        {children}
      </div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="empty" style={{ padding: 32 }}>
      <div>No chart data available</div>
    </div>
  );
}

export function WeeklyTrendChart({ data }) {
  if (!data?.length) return <EmptyChart />;

  return (
    <ChartCard title="Weekly Visit Trend">
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickFormatter={(v) => {
              const d = new Date(`${v}T00:00:00`);
              return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            }}
          />
          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              fontSize: 12,
            }}
            labelFormatter={(v) => {
              const d = new Date(`${v}T00:00:00`);
              return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area type="monotone" dataKey="total" stroke="#2563eb" fill="url(#colorTotal)" strokeWidth={2} name="Total" />
          <Area type="monotone" dataKey="approved" stroke="#0891b2" fill="transparent" strokeWidth={1.5} name="Approved" />
          <Area type="monotone" dataKey="checkedIn" stroke="#16a34a" fill="transparent" strokeWidth={1.5} name="Checked In" />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function StatusPieChart({ data }) {
  if (!data?.length) return <EmptyChart />;

  return (
    <ChartCard title="Status Distribution">
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={85}
            paddingAngle={3}
            dataKey="value"
            nameKey="name"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            labelLine={{ strokeWidth: 1 }}
          >
            {data.map((entry, i) => (
              <Cell
                key={entry.name}
                fill={STATUS_COLORS[entry.name.replace(/ /g, '_')] || DEPT_COLORS[i % DEPT_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              fontSize: 12,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function DepartmentBarChart({ data }) {
  if (!data?.length) return <EmptyChart />;

  return (
    <ChartCard title="Visits by Department">
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: '#64748b' }}
            width={100}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              fontSize: 12,
            }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} name="Visits">
            {data.map((_, i) => (
              <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function HourlyPatternChart({ data }) {
  if (!data?.length) return <EmptyChart />;

  return (
    <ChartCard title="Check-in Pattern by Hour">
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#64748b' }} />
          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              fontSize: 12,
            }}
          />
          <Bar dataKey="checkIns" fill="#6366f1" radius={[4, 4, 0, 0]} name="Check-ins" />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function EmployeeVisitorChart({ data }) {
  if (!data?.length) return <EmptyChart />;

  return (
    <ChartCard title="Visits per Employee (Last 7 Days)">
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: '#64748b' }}
            width={120}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              fontSize: 12,
            }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} name="Visits">
            {data.map((_, i) => (
              <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

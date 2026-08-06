import { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import api, { errorMessage } from '../../services/api.js';
import { Spinner } from '../../components/Feedback.jsx';
import { formatDate } from '../../utils/format.js';

const today = () => new Date().toISOString().slice(0, 10);

const STATUS_COLORS = {
  pending: 'var(--warning)',
  approved: 'var(--info)',
  checked_in: 'var(--success)',
  checked_out: '#4f46e5',
  rejected: 'var(--danger)',
  cancelled: 'var(--muted)',
};

const SUMMARY = [
  { key: 'total', label: 'Total Requests', color: '#2563eb' },
  { key: 'pending', label: 'Pending', color: 'var(--warning)' },
  { key: 'approved', label: 'Approved', color: 'var(--info)' },
  { key: 'checkedIn', label: 'Checked In', color: 'var(--success)' },
  { key: 'checkedOut', label: 'Checked Out', color: '#4f46e5' },
  { key: 'rejected', label: 'Rejected', color: 'var(--danger)' },
  { key: 'cancelled', label: 'Cancelled', color: 'var(--muted)' },
];

export default function Reports() {
  const [range, setRange] = useState('week');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { range, status };
      if (range === 'custom') {
        params.from = from || today();
        params.to = to || today();
      }
      const res = await api.get('/reports/visitors', { params });
      setData(res.data.data);
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to load report'));
    } finally {
      setLoading(false);
    }
  }, [range, from, to, status]);

  useEffect(() => {
    load();
  }, [load]);

  const s = data?.summary;
  const max = data?.topEmployees?.length ? Math.max(...data.topEmployees.map((e) => e.total)) : 1;
  const maxComp = data?.topCompanies?.length ? Math.max(...data.topCompanies.map((c) => c.total)) : 1;

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body">
          <div className="filter-bar">
            <div className="form-group">
              <label>Date Range</label>
              <select value={range} onChange={(e) => setRange(e.target.value)}>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">Last 30 Days</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>
            {range === 'custom' && (
              <>
                <div className="form-group">
                  <label>From</label>
                  <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>To</label>
                  <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                </div>
              </>
            )}
            <div className="form-group">
              <label>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="checked_in">Checked In</option>
                <option value="checked_out">Checked Out</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <button className="btn btn-primary" onClick={load} style={{ alignSelf: 'flex-end' }}>
              Apply
            </button>
            <button
              className="btn btn-outline no-print"
              style={{ alignSelf: 'flex-end' }}
              onClick={() => window.print()}
            >
              Print / PDF
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <Spinner text="Generating report…" />
      ) : !s ? null : (
        <>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <h3>
                Summary · {formatDate(s.range.from)} — {formatDate(s.range.to)}
              </h3>
              <span className="badge approved">Unique visitors: {s.uniqueVisitors}</span>
            </div>
            <div className="card-body">
              <div className="stat-grid" style={{ marginBottom: 0 }}>
                {SUMMARY.map((item) => (
                  <div className="stat-card" key={item.key}>
                    <div
                      className="stat-icon"
                      style={{ background: `${item.color}14`, color: item.color }}
                    >
                      {s[item.key]}
                    </div>
                    <div>
                      <div className="stat-value">{s[item.key]}</div>
                      <div className="stat-label">{item.label}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 16 }}>
                <div>
                  <span className="stat-label">Average visit duration</span>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>
                    {s.averageDurationMinutes != null
                      ? `${Math.floor(s.averageDurationMinutes / 60)}h ${s.averageDurationMinutes % 60}m`
                      : '—'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
            <div className="card">
              <div className="card-header">
                <h3>Visits by Day</h3>
              </div>
              {data.byDate.length ? (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Total</th>
                        <th>Checked In</th>
                        <th>Checked Out</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.byDate.map((row) => (
                        <tr key={row.date}>
                          <td>{formatDate(row.date)}</td>
                          <td style={{ fontWeight: 600 }}>{row.total}</td>
                          <td style={{ color: 'var(--success)' }}>{row.checkedIn}</td>
                          <td style={{ color: '#4f46e5' }}>{row.checkedOut}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty">No data for this period.</div>
              )}
            </div>

            <div className="card">
              <div className="card-header">
                <h3>Top Employees</h3>
              </div>
              <div className="card-body">
                {data.topEmployees.length ? (
                  data.topEmployees.map((e) => (
                    <div className="bar-row" key={e.employee + e.employeeId}>
                      <div className="bar-label" title={e.employee}>
                        {e.employee}
                      </div>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width: `${(e.total / max) * 100}%` }} />
                      </div>
                      <div className="bar-value">{e.total}</div>
                    </div>
                  ))
                ) : (
                  <div className="empty">No data.</div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3>Top Companies</h3>
              </div>
              <div className="card-body">
                {data.topCompanies.length ? (
                  data.topCompanies.map((c) => (
                    <div className="bar-row" key={c.company}>
                      <div className="bar-label" title={c.company}>
                        {c.company}
                      </div>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width: `${(c.total / maxComp) * 100}%` }} />
                      </div>
                      <div className="bar-value">{c.total}</div>
                    </div>
                  ))
                ) : (
                  <div className="empty">No data.</div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3>Status Breakdown</h3>
              </div>
              <div className="card-body">
                {SUMMARY.filter((x) => x.key !== 'total').map((x) => (
                  <div className="bar-row" key={x.key}>
                    <div className="bar-label">{x.label}</div>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{
                          width: `${s.total ? (s[x.key] / s.total) * 100 : 0}%`,
                          background: STATUS_COLORS[x.key],
                        }}
                      />
                    </div>
                    <div className="bar-value">{s[x.key]}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

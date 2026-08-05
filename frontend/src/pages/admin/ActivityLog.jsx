import { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import api, { errorMessage } from '../../services/api.js';
import { Spinner, EmptyState } from '../../components/Feedback.jsx';
import Pagination from '../../components/Pagination.jsx';
import { formatDateTime, ACTION_LABELS } from '../../utils/format.js';

const ACTION_COLORS = {
  created: 'var(--primary)',
  approved: 'var(--success)',
  rejected: 'var(--danger)',
  checked_in: 'var(--success)',
  checked_out: '#4f46e5',
  cancelled: 'var(--muted)',
  remark_added: 'var(--warning)',
};

export default function ActivityLog() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 0, total: 0 });
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const res = await api.get('/reports/activities', {
          params: { action, from, to, page, limit: 20 },
        });
        setRows(res.data.data);
        setMeta(res.data.pagination);
      } catch (err) {
        toast.error(errorMessage(err, 'Failed to load activity log'));
      } finally {
        setLoading(false);
      }
    },
    [action, from, to]
  );

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action, from, to]);

  const apply = () => load(1);

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body">
          <div className="filter-bar">
            <div className="form-group">
              <label>Action</label>
              <select value={action} onChange={(e) => setAction(e.target.value)}>
                <option value="">All Actions</option>
                {Object.entries(ACTION_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>From</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="form-group">
              <label>To</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <button className="btn btn-primary" style={{ alignSelf: 'flex-end' }} onClick={apply}>
              Filter
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Activity History</h3>
          <span className="badge approved">{meta.total} events</span>
        </div>
        {loading ? (
          <Spinner text="Loading activity…" />
        ) : rows.length === 0 ? (
          <EmptyState icon="🕒" title="No activity found" subtitle="Try adjusting the filters." />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Visitor</th>
                    <th>Employee</th>
                    <th>Visit Date</th>
                    <th>Date & Time</th>
                    <th>Performed By</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i}>
                      <td>
                        <span
                          className="badge"
                          style={{
                            background: `${ACTION_COLORS[r.action] || 'var(--primary)'}14`,
                            color: ACTION_COLORS[r.action] || 'var(--primary)',
                          }}
                        >
                          {ACTION_LABELS[r.action] || r.action}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{r.visitorName}</td>
                      <td>{r.employeeName || '—'}</td>
                      <td>{r.date}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDateTime(r.timestamp)}</td>
                      <td>
                        {r.actorName}
                        <div style={{ color: 'var(--muted)', fontSize: 12, textTransform: 'capitalize' }}>
                          {r.actorRole}
                        </div>
                      </td>
                      <td style={{ maxWidth: 220 }}>
                        <span
                          style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {r.note || '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={meta.page} pages={meta.pages} total={meta.total} onChange={load} />
          </>
        )}
      </div>
    </div>
  );
}

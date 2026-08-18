import { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import api, { errorMessage } from '../../services/api.js';
import { Spinner, EmptyState } from '../../components/Feedback.jsx';
import Pagination from '../../components/Pagination.jsx';
import { formatDateTime } from '../../utils/format.js';

const ENTITY_COLORS = {
  VisitRequest: 'var(--primary)',
  Employee: 'var(--info)',
  User: 'var(--warning)',
  Auth: 'var(--muted)',
};

const AUDIT_ACTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'auth.login', label: 'Login' },
  { value: 'auth.login_failed', label: 'Login Failed' },
  { value: 'visit.created', label: 'Visit Created' },
  { value: 'visit.approved', label: 'Visit Approved' },
  { value: 'visit.rejected', label: 'Visit Rejected' },
  { value: 'visit.checked_in', label: 'Check In' },
  { value: 'visit.checked_out', label: 'Check Out' },
  { value: 'visit.cancelled', label: 'Visit Cancelled' },
  { value: 'employee.created', label: 'Employee Created' },
  { value: 'employee.updated', label: 'Employee Updated' },
  { value: 'employee.deactivated', label: 'Employee Deactivated' },
  { value: 'employee.deleted', label: 'Employee Deleted' },
  { value: 'user.created', label: 'User Created' },
  { value: 'user.updated', label: 'User Updated' },
  { value: 'user.deactivated', label: 'User Deactivated' },
];

const ENTITY_TYPES = [
  { value: '', label: 'All Entities' },
  { value: 'VisitRequest', label: 'Visit Request' },
  { value: 'Employee', label: 'Employee' },
  { value: 'User', label: 'User' },
  { value: 'Auth', label: 'Authentication' },
];

export default function AuditLog() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 0, total: 0 });
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = { action, entity, from, to, page, limit: 20 };
        Object.keys(params).forEach((k) => !params[k] && delete params[k]);
        const res = await api.get('/audit-logs', { params });
        setRows(res.data.data);
        setMeta(res.data.pagination);
      } catch (err) {
        toast.error(errorMessage(err, 'Failed to load audit log'));
      } finally {
        setLoading(false);
      }
    },
    [action, entity, from, to]
  );

  useEffect(() => {
    load(1);
  }, [load]);

  const formatChanges = (changes) => {
    if (!changes || (!changes.before && !changes.after)) return null;
    return (
      <div style={{ fontSize: 12, marginTop: 4 }}>
        {changes.before && (
          <div>
            <span style={{ color: 'var(--muted)' }}>Before: </span>
            <code style={{ background: '#fef2f2', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>
              {JSON.stringify(changes.before)}
            </code>
          </div>
        )}
        {changes.after && (
          <div>
            <span style={{ color: 'var(--muted)' }}>After: </span>
            <code style={{ background: '#f0fdf4', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>
              {JSON.stringify(changes.after)}
            </code>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body">
          <div className="filter-bar">
            <div className="form-group">
              <label>Action</label>
              <select value={action} onChange={(e) => setAction(e.target.value)}>
                {AUDIT_ACTIONS.map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Entity</label>
              <select value={entity} onChange={(e) => setEntity(e.target.value)}>
                {ENTITY_TYPES.map((e) => (
                  <option key={e.value} value={e.value}>{e.label}</option>
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
            <button className="btn btn-primary" style={{ alignSelf: 'flex-end' }} onClick={() => load(1)}>
              Filter
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Audit Trail</h3>
          <span className="badge approved">{meta.total} entries</span>
        </div>
        {loading ? (
          <Spinner text="Loading audit log..." />
        ) : rows.length === 0 ? (
          <EmptyState icon="🔍" title="No audit entries found" subtitle="Try adjusting the filters." />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Action</th>
                    <th>Entity</th>
                    <th>User</th>
                    <th>IP</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <>
                      <tr
                        key={r._id}
                        onClick={() => setExpanded(expanded === r._id ? null : r._id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td style={{ whiteSpace: 'nowrap' }}>{formatDateTime(r.timestamp)}</td>
                        <td>
                          <span className="badge" style={{
                            background: 'var(--primary-light)',
                            color: 'var(--primary)',
                          }}>
                            {r.action}
                          </span>
                        </td>
                        <td>
                          <span className="badge" style={{
                            background: `${ENTITY_COLORS[r.entity] || 'var(--muted)'}14`,
                            color: ENTITY_COLORS[r.entity] || 'var(--muted)',
                          }}>
                            {r.entity}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 500 }}>{r.user?.name || 'Unknown'}</div>
                          <div style={{ color: 'var(--muted)', fontSize: 11, textTransform: 'capitalize' }}>
                            {r.user?.role || '—'}
                          </div>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--muted)' }}>{r.ip || '—'}</td>
                        <td style={{ fontSize: 12 }}>
                          {r.changes?.before || r.changes?.after ? 'Click to expand' : '—'}
                        </td>
                      </tr>
                      {expanded === r._id && (
                        <tr key={`${r._id}-detail`}>
                          <td colSpan={6} style={{ background: '#f8fafc', padding: '12px 14px' }}>
                            {r.userAgent && (
                              <div style={{ fontSize: 12, marginBottom: 4 }}>
                                <span style={{ color: 'var(--muted)' }}>User Agent: </span>
                                <span style={{ fontSize: 11 }}>{r.userAgent}</span>
                              </div>
                            )}
                            {formatChanges(r.changes)}
                          </td>
                        </tr>
                      )}
                    </>
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

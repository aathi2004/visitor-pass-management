import { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import api, { errorMessage } from '../services/api.js';
import { Spinner, EmptyState } from '../components/Feedback.jsx';
import Pagination from '../components/Pagination.jsx';
import { formatDateTime } from '../utils/format.js';

const TYPE_ICONS = {
  visit_registered: '📋',
  visit_approved: '✅',
  visit_rejected: '❌',
  visit_checked_in: '🚪',
  visit_checked_out: '🏃',
  visit_cancelled: '🚫',
  system: '🔔',
};

export default function Notifications() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 0, total: 0 });
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = { page, limit: 20 };
        if (unreadOnly) params.unreadOnly = 'true';
        const res = await api.get('/notifications', { params });
        setRows(res.data.data);
        setMeta(res.data.pagination);
      } catch (err) {
        toast.error(errorMessage(err, 'Failed to load notifications'));
      } finally {
        setLoading(false);
      }
    },
    [unreadOnly]
  );

  useEffect(() => {
    load(1);
  }, [load]);

  const markRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setRows((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to mark as read'));
    }
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setRows((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success('All notifications marked as read');
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to mark all as read'));
    }
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <h3>Notifications</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              className={`btn btn-sm ${unreadOnly ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setUnreadOnly(!unreadOnly)}
            >
              {unreadOnly ? 'Show All' : 'Unread Only'}
            </button>
            <button className="btn btn-sm btn-outline" onClick={markAllRead}>
              Mark All Read
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <Spinner text="Loading notifications..." />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="🔔"
            title="No notifications"
            subtitle={unreadOnly ? 'All caught up! No unread notifications.' : 'Notifications will appear here.'}
          />
        ) : (
          <>
            {rows.map((n) => (
              <div
                key={n._id}
                onClick={() => !n.read && markRead(n._id)}
                style={{
                  padding: '14px 20px',
                  borderBottom: '1px solid var(--border)',
                  cursor: n.read ? 'default' : 'pointer',
                  background: n.read ? 'transparent' : 'var(--primary-light)',
                  display: 'flex',
                  gap: 12,
                  transition: 'background 0.15s',
                }}
              >
                <span style={{ fontSize: 22, flexShrink: 0 }}>{TYPE_ICONS[n.type] || '🔔'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: n.read ? 400 : 700, fontSize: 14 }}>{n.title}</div>
                  <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 2 }}>{n.message}</div>
                  <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 6 }}>
                    {formatDateTime(n.timestamp)}
                    {n.visit && n.visit.visitor?.name && (
                      <span style={{ marginLeft: 8 }}>
                        Visitor: {n.visit.visitor.name} ({n.visit.date})
                      </span>
                    )}
                  </div>
                </div>
                {!n.read && (
                  <div style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: 'var(--primary)',
                    flexShrink: 0,
                    marginTop: 4,
                  }} />
                )}
              </div>
            ))}
            <Pagination page={meta.page} pages={meta.pages} total={meta.total} onChange={load} />
          </>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api.js';

export default function NotificationBell() {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  const fetchCount = useCallback(async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      setCount(res.data.data.count);
    } catch {
      // silent
    }
  }, []);

  const fetchRecent = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications', { params: { limit: 10 } });
      setNotifications(res.data.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  useEffect(() => {
    if (open) fetchRecent();
  }, [open, fetchRecent]);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const markRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
      setCount((prev) => Math.max(0, prev - 1));
    } catch {
      // silent
    }
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setCount(0);
    } catch {
      // silent
    }
  };

  const getNotifIcon = (type) => {
    const icons = {
      visit_registered: '📋',
      visit_approved: '✅',
      visit_rejected: '❌',
      visit_checked_in: '🚪',
      visit_checked_out: '🏃',
      visit_cancelled: '🚫',
      system: '🔔',
    };
    return icons[type] || '🔔';
  };

  const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: 'none',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '6px 10px',
          cursor: 'pointer',
          position: 'relative',
          fontSize: 18,
          lineHeight: 1,
        }}
        title="Notifications"
      >
        🔔
        {count > 0 && (
          <span style={{
            position: 'absolute',
            top: -4,
            right: -4,
            background: 'var(--danger)',
            color: '#fff',
            borderRadius: '50%',
            width: 18,
            height: 18,
            fontSize: 10,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          width: 380,
          maxHeight: 480,
          overflowY: 'auto',
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 200,
        }}>
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>Notifications</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {count > 0 && (
                <button
                  onClick={markAllRead}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => { setOpen(false); navigate('/notifications'); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary)',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                View all
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>Loading...</div>
          ) : notifications.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>No notifications yet</div>
          ) : (
            notifications.map((n) => (
              <div
                key={n._id}
                onClick={() => !n.read && markRead(n._id)}
                style={{
                  padding: '10px 16px',
                  borderBottom: '1px solid var(--border)',
                  cursor: n.read ? 'default' : 'pointer',
                  background: n.read ? 'transparent' : 'var(--primary-light)',
                  display: 'flex',
                  gap: 10,
                  transition: 'background 0.15s',
                }}
              >
                <span style={{ fontSize: 18, flexShrink: 0 }}>{getNotifIcon(n.type)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: n.read ? 400 : 600, fontSize: 13 }}>{n.title}</div>
                  <div style={{
                    color: 'var(--muted)',
                    fontSize: 12,
                    marginTop: 2,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {n.message}
                  </div>
                  <div style={{ color: 'var(--muted)', fontSize: 11, marginTop: 4 }}>
                    {timeAgo(n.timestamp)}
                  </div>
                </div>
                {!n.read && (
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: 'var(--primary)',
                    flexShrink: 0,
                    marginTop: 4,
                  }} />
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

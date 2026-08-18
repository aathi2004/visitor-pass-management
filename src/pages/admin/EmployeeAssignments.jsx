import { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import api, { errorMessage } from '../../services/api.js';
import { Spinner, EmptyState } from '../../components/Feedback.jsx';
import VisitDetailModal from '../../components/VisitDetailModal.jsx';
import SlotTimer from '../../components/SlotTimer.jsx';

const STATUS_LABELS = {
  pending: { label: 'Pending', color: '#d97706' },
  approved: { label: 'Approved', color: '#0891b2' },
  checked_in: { label: 'Checked In', color: '#16a34a' },
  checked_out: { label: 'Checked Out', color: '#4f46e5' },
  rejected: { label: 'Rejected', color: '#dc2626' },
  cancelled: { label: 'Cancelled', color: '#64748b' },
};

export default function EmployeeAssignments() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/slots/employee-assignments', { params: { date } });
      setData(res.data.data);
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to load assignments'));
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <h3>Employee Visitor Allotments</h3>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <label style={{ fontSize: 13, color: 'var(--muted)' }}>Date:</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={today}
              style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 8 }}
            />
            <button className="btn btn-outline btn-sm" onClick={load}>
              Refresh
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <Spinner text="Loading assignments…" />
      ) : !data?.employees?.length ? (
        <EmptyState icon="👥" title="No employees" subtitle="No active employees found." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 16 }}>
          {data.employees.map((item) => {
            const barPct = data.maxPerEmp ? (item.assignedCount / data.maxPerEmp) * 100 : 0;
            const barColor = barPct >= 100 ? '#dc2626' : barPct >= 66 ? '#d97706' : '#16a34a';
            return (
              <div className="card" key={item.employee._id || 'unassigned'} style={{ margin: 0 }}>
                <div className="card-header" style={{ padding: '12px 16px' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{item.employee.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {item.employee.employeeId} · {item.employee.department}
                      {item.employee.workingHours && (
                        <span> · {item.employee.workingHours.start}–{item.employee.workingHours.end}</span>
                      )}
                    </div>
                  </div>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: 12,
                      fontSize: 13,
                      fontWeight: 600,
                      background: barColor + '18',
                      color: barColor,
                    }}
                  >
                    {item.assignedCount} / {item.maxPerEmp}
                  </span>
                </div>
                <div style={{ padding: '0 16px 4px' }}>
                  <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(barPct, 100)}%`,
                        background: barColor,
                        borderRadius: 3,
                        transition: 'width 0.3s',
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                    {item.remaining > 0
                      ? `${item.remaining} slot${item.remaining > 1 ? 's' : ''} available`
                      : 'No slots available'}
                  </div>
                </div>
                {item.visits.length > 0 ? (
                  <div style={{ padding: '0 16px 12px' }}>
                    {item.visits.map((v) => {
                      const s = STATUS_LABELS[v.status] || { label: v.status, color: '#64748b' };
                      return (
                        <div
                          key={v._id}
                          onClick={() => setSelected(v)}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 10px',
                            marginTop: 6,
                            borderRadius: 8,
                            border: '1px solid var(--border)',
                            cursor: 'pointer',
                            background: 'var(--card-bg, #fff)',
                            fontSize: 13,
                            transition: 'box-shadow 0.15s',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)')}
                          onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
                        >
                          <div>
                            <div style={{ fontWeight: 600 }}>{v.visitor?.name || '—'}</div>
                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                              {v.visitor?.phone || ''} {v.purpose ? `· ${v.purpose}` : ''}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                              {v.expectedArrivalTime}
                              {v.slotEndTime && (
                                <> — {new Date(v.slotEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>
                              )}
                              {(v.status === 'approved' || v.status === 'checked_in') && v.slotEndTime && (
                                <SlotTimer slotEndTime={v.slotEndTime} />
                              )}
                            </div>
                          </div>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 10,
                              fontSize: 11,
                              fontWeight: 600,
                              background: s.color + '18',
                              color: s.color,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {s.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ padding: '12px 16px', fontSize: 13, color: 'var(--muted)' }}>
                    No visitors assigned today
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {selected && <VisitDetailModal visit={selected} onClose={() => setSelected(null)} onAction={load} />}
    </div>
  );
}

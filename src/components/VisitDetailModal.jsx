import { useState } from 'react';
import { toast } from 'react-toastify';
import Modal from './Modal.jsx';
import { StatusBadge } from './Badge.jsx';
import { formatDate, formatTime, formatDateTime, ACTION_LABELS } from '../utils/format.js';
import SlotTimer from './SlotTimer.jsx';
import api, { errorMessage } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

function Detail({ label, value }) {
  return (
    <div className="detail-item">
      <span className="label">{label}</span>
      <span className="value">{value || '—'}</span>
    </div>
  );
}

export default function VisitDetailModal({ visit, onClose, footer: footerProp, onAction }) {
  if (!visit) return null;
  const v = visit;
  const { user } = useAuth();
  const [processing, setProcessing] = useState(false);

  const canReview = v.status === 'pending' && (user?.role === 'admin' || user?.role === 'receptionist');

  const handleApprove = async () => {
    setProcessing(true);
    try {
      await api.post(`/visitors/${v._id}/approve`);
      toast.success('Visit approved.');
      onAction?.();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to approve'));
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    const reason = window.prompt('Reason for rejection (optional):');
    if (reason === null) return;
    setProcessing(true);
    try {
      await api.post(`/visitors/${v._id}/reject`, { reason: reason || 'No reason provided' });
      toast.success('Visit rejected.');
      onAction?.();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to reject'));
    } finally {
      setProcessing(false);
    }
  };

  const defaultFooter = canReview ? (
    <div style={{ display: 'flex', gap: 10 }}>
      <button className="btn btn-outline" onClick={onClose}>
        Close
      </button>
      <button className="btn btn-danger-ghost btn-sm" onClick={handleReject} disabled={processing}>
        Reject
      </button>
      <button className="btn btn-primary" onClick={handleApprove} disabled={processing}>
        {processing ? 'Processing…' : 'Approve'}
      </button>
    </div>
  ) : null;

  return (
    <Modal title="Visit Request Details" onClose={onClose} footer={footerProp || defaultFooter} wide>
      <div className="form-section-title">Visitor</div>
      <div className="detail-grid">
        <Detail label="Name" value={v.visitor?.name} />
        <Detail label="Company" value={v.visitor?.company} />
        <Detail label="Phone" value={v.visitor?.phone} />
        <Detail label="Email" value={v.visitor?.email} />
        <Detail label="ID Type" value={v.visitor?.idType} />
        <Detail label="ID Number" value={v.visitor?.idNumber} />
        <Detail label="Address" value={v.visitor?.address} />
      </div>

      <div className="form-section-title">Visit</div>
      <div className="detail-grid">
        <Detail label="Employee to Visit" value={v.employee?.name || 'Pending assignment'} />
        <Detail label="Employee ID" value={v.employee?.employeeId || '—'} />
        <Detail label="Department" value={v.employee?.department || '—'} />
        <Detail label="Visit Date" value={formatDate(v.date)} />
        <Detail label="Expected Arrival" value={formatTime(v.expectedArrivalTime)} />
        <Detail label="Registered At" value={formatDateTime(v.currentTime)} />
        {v.slotStartTime && <Detail label="Slot Start" value={formatDateTime(v.slotStartTime)} />}
        {v.slotEndTime && <Detail label="Slot End" value={formatDateTime(v.slotEndTime)} />}
        <Detail label="Status" value={<StatusBadge status={v.status} />} />
        <Detail label="Registered By" value={v.createdBy?.name} />
      </div>

      {v.status === 'checked_in' && v.slotEndTime && (
        <div style={{ margin: '12px 0', padding: 12, background: 'var(--bg)', borderRadius: 8 }}>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>Time Remaining</div>
          <SlotTimer slotEndTime={v.slotEndTime} status={v.status} />
        </div>
      )}

      <div className="detail-grid" style={{ marginTop: 12 }}>
        <Detail label="Purpose" value={v.purpose} />
        <Detail label="Remark" value={v.remark} />
        <Detail label="Checked In" value={formatDateTime(v.checkInTime)} />
        <Detail label="Checked Out" value={formatDateTime(v.checkOutTime)} />
        {v.autoCompleted && <Detail label="Auto-Completed" value="Yes" />}
      </div>

      <div className="form-section-title">Activity History</div>
      {v.activities?.length ? (
        <ul className="timeline">
          {[...v.activities]
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .map((a, i) => (
              <li key={i}>
                <div className="tl-action">{ACTION_LABELS[a.action] || a.action}</div>
                <div className="tl-meta">
                  {formatDateTime(a.timestamp)} · by {a.user?.name || 'Unknown'} ({a.user?.role || '—'})
                </div>
                {a.note && <div className="tl-note">“{a.note}”</div>}
              </li>
            ))}
        </ul>
      ) : (
        <div style={{ color: 'var(--muted)' }}>No activity recorded.</div>
      )}
    </Modal>
  );
}

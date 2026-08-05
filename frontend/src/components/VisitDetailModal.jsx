import Modal from './Modal.jsx';
import { StatusBadge } from './Badge.jsx';
import { formatDate, formatTime, formatDateTime, ACTION_LABELS } from '../utils/format.js';

function Detail({ label, value }) {
  return (
    <div className="detail-item">
      <span className="label">{label}</span>
      <span className="value">{value || '—'}</span>
    </div>
  );
}

export default function VisitDetailModal({ visit, onClose, footer }) {
  if (!visit) return null;
  const v = visit;

  return (
    <Modal title="Visit Request Details" onClose={onClose} footer={footer} wide>
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
        <Detail label="Employee to Visit" value={v.employee?.name} />
        <Detail label="Employee ID" value={v.employee?.employeeId} />
        <Detail label="Department" value={v.employee?.department} />
        <Detail label="Visit Date" value={formatDate(v.date)} />
        <Detail label="Expected Arrival" value={formatTime(v.expectedArrivalTime)} />
        <Detail label="Expected Departure" value={formatTime(v.expectedDepartureTime)} />
        <Detail label="Status" value={<StatusBadge status={v.status} />} />
        <Detail label="Registered By" value={v.createdBy?.name} />
      </div>

      <div className="detail-grid" style={{ marginTop: 12 }}>
        <Detail label="Purpose" value={v.purpose} />
        <Detail label="Remark" value={v.remark} />
        <Detail label="Checked In" value={formatDateTime(v.checkInTime)} />
        <Detail label="Checked Out" value={formatDateTime(v.checkOutTime)} />
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

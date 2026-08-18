import { StatusBadge } from './Badge.jsx';
import { formatDate, formatTime, formatDateTime } from '../utils/format.js';

export default function VisitTable({ items = [], onRowClick, columns = ['visitor', 'employee', 'date', 'time', 'status', 'purpose'], emptyText = 'No visitor records found.' }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {columns.includes('visitor') && <th>Visitor</th>}
            {columns.includes('employee') && <th>Employee to Visit</th>}
            {columns.includes('date') && <th>Date</th>}
            {columns.includes('time') && <th>Expected Time</th>}
            {columns.includes('status') && <th>Status</th>}
            {columns.includes('purpose') && <th>Purpose</th>}
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>{emptyText}</td>
            </tr>
          ) : (
            items.map((v) => (
              <tr
                key={v._id}
                onClick={() => onRowClick?.(v)}
                style={onRowClick ? { cursor: 'pointer' } : undefined}
              >
                {columns.includes('visitor') && (
                  <td>
                    <div style={{ fontWeight: 600 }}>{v.visitor?.name}</div>
                    <div style={{ color: 'var(--muted)', fontSize: 12 }}>
                      {v.visitor?.company ? v.visitor.company : ''}
                      {v.visitor?.company && v.visitor?.phone ? ' · ' : ''}
                      {v.visitor?.phone}
                    </div>
                  </td>
                )}
                {columns.includes('employee') && (
                  <td>
                    <div style={{ fontWeight: 500 }}>{v.employee?.name || '—'}</div>
                    <div style={{ color: 'var(--muted)', fontSize: 12 }}>
                      {v.employee?.employeeId}
                    </div>
                  </td>
                )}
                {columns.includes('date') && <td>{formatDate(v.date)}</td>}
                {columns.includes('time') && (
                  <td>
                    {v.slotStartTime && v.slotEndTime ? (
                      <>
                        {formatDateTime(v.slotStartTime)}
                        <span style={{ color: 'var(--muted)' }}> – </span>
                        {formatDateTime(v.slotEndTime)}
                      </>
                    ) : (
                      formatTime(v.expectedArrivalTime)
                    )}
                  </td>
                )}
                {columns.includes('status') && (
                  <td>
                    <StatusBadge status={v.status} />
                  </td>
                )}
                {columns.includes('purpose') && (
                  <td style={{ maxWidth: 220 }}>
                    <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {v.purpose}
                    </span>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

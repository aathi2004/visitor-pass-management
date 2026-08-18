export const STATUS_META = {
  pending: { label: 'Pending', cls: 'pending' },
  approved: { label: 'Approved', cls: 'approved' },
  checked_in: { label: 'Checked In', cls: 'checked_in' },
  checked_out: { label: 'Checked Out', cls: 'checked_out' },
  rejected: { label: 'Rejected', cls: 'rejected' },
  cancelled: { label: 'Cancelled', cls: 'cancelled' },
};

export const ROLE_META = {
  admin: { label: 'Administrator', cls: 'admin' },
  receptionist: { label: 'Receptionist', cls: 'receptionist' },
  employee: { label: 'Employee', cls: 'employee' },
};

export const ACTION_LABELS = {
  created: 'Created',
  approved: 'Approved',
  rejected: 'Rejected',
  checked_in: 'Checked In',
  checked_out: 'Checked Out',
  cancelled: 'Cancelled',
  remark_added: 'Remark Added',
  auto_completed: 'Auto-Completed',
};

export function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(value) {
  if (!value) return '—';
  const d = new Date(`${value}T00:00:00`);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatTime(value) {
  if (!value) return '—';
  const [h, m] = value.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

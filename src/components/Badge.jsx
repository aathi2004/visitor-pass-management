import { STATUS_META, ROLE_META } from '../utils/format.js';

export function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status, cls: '' };
  return (
    <span className={`badge ${meta.cls}`}>
      <span className="dot" />
      {meta.label}
    </span>
  );
}

export function RoleBadge({ role }) {
  const meta = ROLE_META[role] || { label: role, cls: '' };
  return <span className={`badge ${meta.cls}`}>{meta.label}</span>;
}

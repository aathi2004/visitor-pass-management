export function Spinner({ text = 'Loading…' }) {
  return (
    <div className="page-loader">
      <span className="spinner" /> <span style={{ marginLeft: 10 }}>{text}</span>
    </div>
  );
}

export function EmptyState({ icon = '🗂️', title = 'Nothing here yet', subtitle }) {
  return (
    <div className="empty">
      <div className="big">{icon}</div>
      <div style={{ fontWeight: 600 }}>{title}</div>
      {subtitle && <div style={{ marginTop: 4, fontSize: 13 }}>{subtitle}</div>}
    </div>
  );
}

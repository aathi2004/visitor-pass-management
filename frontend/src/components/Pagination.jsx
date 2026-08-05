export default function Pagination({ page, pages, total, onChange }) {
  if (!pages || pages <= 1) {
    return total ? (
      <div className="pagination">
        <span className="page-info">{total} record(s)</span>
      </div>
    ) : null;
  }
  return (
    <div className="pagination">
      <span className="page-info">
        Page {page} of {pages} · {total} record(s)
      </span>
      <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        ‹ Prev
      </button>
      <button
        className="btn btn-outline btn-sm"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
      >
        Next ›
      </button>
    </div>
  );
}

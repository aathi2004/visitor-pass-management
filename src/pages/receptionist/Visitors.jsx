import { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import api, { errorMessage } from '../../services/api.js';
import { Spinner, EmptyState } from '../../components/Feedback.jsx';
import Pagination from '../../components/Pagination.jsx';
import VisitTable from '../../components/VisitTable.jsx';
import VisitDetailModal from '../../components/VisitDetailModal.jsx';
import SlotTimer from '../../components/SlotTimer.jsx';

const EMPTY_FILTER = { visitorName: '', employeeName: '', dateFrom: '', dateTo: '', status: '', department: '' };

export default function Visitors() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 0, total: 0 });
  const [filter, setFilter] = useState(EMPTY_FILTER);
  const [applied, setApplied] = useState(EMPTY_FILTER);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(null);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    api.get('/employees/departments').then((res) => setDepartments(res.data.data || [])).catch(() => {});
  }, []);

  const load = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = { ...applied, page, limit: 10 };
        Object.keys(params).forEach((k) => !params[k] && delete params[k]);
        const res = await api.get('/visitors', { params });
        setRows(res.data.data);
        setMeta(res.data.pagination);
      } catch (err) {
        toast.error(errorMessage(err, 'Failed to load visitors'));
      } finally {
        setLoading(false);
      }
    },
    [applied]
  );

  useEffect(() => {
    load(1);
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => load(1), 5000);
    return () => clearInterval(id);
  }, [load]);

  const apply = () => {
    setApplied(filter);
    load(1);
  };

  const reset = () => {
    setFilter(EMPTY_FILTER);
    setApplied(EMPTY_FILTER);
    load(1);
  };

  const act = async (id, action, successMsg) => {
    setBusy(id);
    try {
      const res = await api.post(`/visitors/${id}/${action}`);
      toast.success(successMsg);
      load();
      setSelected((prev) => (prev && prev._id === id ? res.data.data : prev));
    } catch (err) {
      toast.error(errorMessage(err, 'Action failed'));
    } finally {
      setBusy(null);
    }
  };

  const canCheckIn = (v) => v.status === 'approved';
  const canCheckOut = (v) => v.status === 'checked_in';
  const canCancel = (v) => ['pending', 'approved'].includes(v.status);

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body">
          <div className="filter-bar">
            <div className="form-group">
              <label>Visitor Name</label>
              <input
                value={filter.visitorName}
                onChange={(e) => setFilter((f) => ({ ...f, visitorName: e.target.value }))}
                placeholder="Search visitor..."
              />
            </div>
            <div className="form-group">
              <label>Employee Name</label>
              <input
                value={filter.employeeName}
                onChange={(e) => setFilter((f) => ({ ...f, employeeName: e.target.value }))}
                placeholder="Search employee..."
              />
            </div>
            <div className="form-group">
              <label>From Date</label>
              <input
                type="date"
                value={filter.dateFrom}
                onChange={(e) => setFilter((f) => ({ ...f, dateFrom: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>To Date</label>
              <input
                type="date"
                value={filter.dateTo}
                onChange={(e) => setFilter((f) => ({ ...f, dateTo: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Department</label>
              <select value={filter.department} onChange={(e) => setFilter((f) => ({ ...f, department: e.target.value }))}>
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={filter.status} onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}>
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="checked_in">Checked In</option>
                <option value="checked_out">Checked Out</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <button className="btn btn-primary" style={{ alignSelf: 'flex-end' }} onClick={apply}>
              Search
            </button>
            <button className="btn btn-outline" style={{ alignSelf: 'flex-end' }} onClick={reset}>
              Clear
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Visitor Records</h3>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span className="badge checked_in">
              Inside now: {rows.filter((r) => r.status === 'checked_in').length}
            </span>
            <span className="badge approved">Total: {meta.total}</span>
          </div>
        </div>
        {loading ? (
          <Spinner text="Loading visitors..." />
        ) : rows.length === 0 ? (
          <EmptyState icon="🔍" title="No visitors found" subtitle="Try adjusting your search filters." />
        ) : (
          <>
            <VisitTable items={rows} onRowClick={setSelected} />
            <div className="pagination" style={{ justifyContent: 'space-between', borderTop: 'none', paddingTop: 6 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {rows.filter(canCheckIn).length > 0 && (
                  <span className="badge approved">Tap a row to see details & actions</span>
                )}
              </div>
            </div>
            <Pagination page={meta.page} pages={meta.pages} total={meta.total} onChange={load} />
          </>
        )}
      </div>

      {selected && (
        <VisitDetailModal
          visit={selected}
          onClose={() => setSelected(null)}
          footer={
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center' }}>
              {selected.status === 'checked_in' && (
                <SlotTimer slotEndTime={selected.slotEndTime} status={selected.status} />
              )}
              {canCheckIn(selected) && (
                <button
                  className="btn btn-success"
                  disabled={busy === selected._id}
                  onClick={() => act(selected._id, 'check-in', `${selected.visitor?.name} checked in.`)}
                >
                  ✓ Check In
                </button>
              )}
              {canCheckOut(selected) && (
                <button
                  className="btn btn-success"
                  disabled={busy === selected._id}
                  onClick={() => act(selected._id, 'check-out', `${selected.visitor?.name} checked out.`)}
                >
                  ⏻ End Visit
                </button>
              )}
              {canCancel(selected) && (
                <button
                  className="btn btn-danger-ghost"
                  disabled={busy === selected._id}
                  onClick={() => {
                    if (window.confirm('Cancel this visit request?')) {
                      act(selected._id, 'cancel', 'Visit cancelled.');
                    }
                  }}
                >
                  ✕ Cancel Visit
                </button>
              )}
            </div>
          }
        />
      )}
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import api, { errorMessage } from '../../services/api.js';
import { Spinner, EmptyState } from '../../components/Feedback.jsx';
import Pagination from '../../components/Pagination.jsx';
import Modal from '../../components/Modal.jsx';
import VisitTable from '../../components/VisitTable.jsx';
import VisitDetailModal from '../../components/VisitDetailModal.jsx';
import SlotTimer from '../../components/SlotTimer.jsx';

const TABS = [
  { key: '', label: 'All Requests' },
  { key: 'pending', label: 'Pending Approval' },
  { key: 'approved', label: 'Approved' },
  { key: 'checked_in', label: 'Checked In' },
  { key: 'checked_out', label: 'Completed' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'cancelled', label: 'Cancelled' },
];

export default function MyRequests() {
  const [tab, setTab] = useState('pending');
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null); // 'approve' | 'reject' | 'remark'
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = { scope: 'employee', status: tab || undefined, page, limit: 10 };
        Object.keys(params).forEach((k) => params[k] === undefined && delete params[k]);
        const res = await api.get('/visitors', { params });
        setRows(res.data.data);
        setMeta(res.data.pagination);
      } catch (err) {
        toast.error(errorMessage(err, 'Failed to load requests'));
      } finally {
        setLoading(false);
      }
    },
    [tab]
  );

  useEffect(() => {
    load(1);
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => load(1), 5000);
    return () => clearInterval(id);
  }, [load]);

  const submitAction = async (action, body = {}) => {
    setBusy(true);
    try {
      const res = await api.post(`/visitors/${selected._id}/${action}`, body);
      toast.success(res.data.message);
      setModal(null);
      setReason('');
      load();
      setSelected((prev) => (prev && prev._id === selected._id ? res.data.data : prev));
    } catch (err) {
      toast.error(errorMessage(err, 'Action failed'));
    } finally {
      setBusy(false);
    }
  };

  const canApprove = selected?.status === 'pending';

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header" style={{ gap: 8 }}>
          <h3 style={{ marginRight: 8 }}>My Visitor Requests</h3>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {TABS.map((t) => (
              <button
                key={t.key}
                className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <Spinner text="Loading requests…" />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="📋"
            title="No requests"
            subtitle="Visitor requests addressed to you will appear here."
          />
        ) : (
          <>
            <VisitTable items={rows} onRowClick={setSelected} />
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
              {(selected.status === 'checked_in' || selected.status === 'approved') && selected.slotEndTime && (
                <SlotTimer slotEndTime={selected.slotEndTime} status={selected.status === 'checked_in' ? 'checked_in' : ''} />
              )}
              <button className="btn btn-outline" onClick={() => setModal('remark')}>
                Add Remark
              </button>
              {canApprove && (
                <>
                  <button
                    className="btn btn-danger-ghost"
                    onClick={() => {
                      setReason('');
                      setModal('reject');
                    }}
                  >
                    Reject
                  </button>
                  <button
                    className="btn btn-success"
                    onClick={() => submitAction('approve', { remark: 'Approved' })}
                  >
                    Approve
                  </button>
                </>
              )}
            </div>
          }
        />
      )}

      {modal === 'reject' && (
        <Modal
          title="Reject Visit Request"
          onClose={() => setModal(null)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setModal(null)}>
                Cancel
              </button>
              <button
                className="btn btn-danger"
                disabled={busy}
                onClick={() => submitAction('reject', { reason })}
              >
                {busy ? 'Rejecting…' : 'Confirm Rejection'}
              </button>
            </>
          }
        >
          <div className="form-group">
            <label>
              Reason for rejection <span className="req">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this visit request is being rejected"
              autoFocus
            />
          </div>
        </Modal>
      )}

      {modal === 'remark' && (
        <Modal
          title="Add Remark"
          onClose={() => setModal(null)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setModal(null)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                disabled={busy || !reason.trim()}
                onClick={() => submitAction('remark', { remark: reason })}
              >
                {busy ? 'Saving…' : 'Save Remark'}
              </button>
            </>
          }
        >
          <div className="form-group">
            <label>Remark</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Add notes to this visitor request"
              autoFocus
            />
          </div>
        </Modal>
      )}
    </div>
  );
}

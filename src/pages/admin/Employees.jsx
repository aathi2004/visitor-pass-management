import { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import api, { errorMessage } from '../../services/api.js';
import { Spinner, EmptyState } from '../../components/Feedback.jsx';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';
import { formatDateTime } from '../../utils/format.js';

const EMPTY_FORM = {
  name: '',
  employeeId: '',
  department: '',
  designation: '',
  email: '',
  phone: '',
  status: 'active',
  workingHours: { start: '09:00', end: '17:00' },
};

export default function Employees() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 0, total: 0 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // 'create' | editing employee
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.get('/employees', { params: { search, page, limit: 10 } });
      setRows(res.data.data);
      setMeta(res.data.pagination);
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to load employees'));
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setModal('create');
  };

  const openEdit = (emp) => {
    setForm({ ...emp });
    setErrors({});
    setModal(emp);
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setWorkingHours = (field) => (e) => setForm((f) => ({ ...f, workingHours: { ...f.workingHours, [field]: e.target.value } }));

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.employeeId.trim()) errs.employeeId = 'Employee ID is required';
    if (!form.department.trim()) errs.department = 'Department is required';
    if (!form.designation.trim()) errs.designation = 'Designation is required';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Valid email is required';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      const editing = modal !== 'create';
      const res = editing
        ? await api.put(`/employees/${modal._id}`, form)
        : await api.post('/employees', form);
      toast.success(res.data.message);
      setModal(null);
      load();
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to save employee'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (emp) => {
    if (!window.confirm(`Delete/deactivate employee "${emp.name}"? Their visit history will be preserved.`)) return;
    try {
      const res = await api.delete(`/employees/${emp._id}`);
      toast.success(res.data.message);
      load();
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to delete employee'));
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h3>Employees</h3>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              placeholder="Search name, ID, department…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, minWidth: 220 }}
            />
            <button className="btn btn-primary" onClick={openCreate}>
              + Add Employee
            </button>
          </div>
        </div>

        {loading ? (
          <Spinner text="Loading employees…" />
        ) : rows.length === 0 ? (
          <EmptyState icon="👥" title="No employees found" subtitle="Add your first employee to get started." />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Employee ID</th>
                    <th>Department</th>
                    <th>Designation</th>
                    <th>Contact</th>
                    <th>Working Hours</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th className="actions" style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((emp) => (
                    <tr key={emp._id}>
                      <td style={{ fontWeight: 600 }}>{emp.name}</td>
                      <td>{emp.employeeId}</td>
                      <td>{emp.department}</td>
                      <td>{emp.designation}</td>
                      <td>
                        <div>{emp.email}</div>
                        <div style={{ color: 'var(--muted)', fontSize: 12 }}>{emp.phone || '—'}</div>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {emp.workingHours?.start || '09:00'} – {emp.workingHours?.end || '17:00'}
                      </td>
                      <td>
                        <span className={`badge ${emp.status}`}>{emp.status}</span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDateTime(emp.createdAt)}</td>
                      <td>
                        <div className="actions" style={{ justifyContent: 'flex-end' }}>
                          <button className="btn btn-outline btn-sm" onClick={() => openEdit(emp)}>
                            Edit
                          </button>
                          <button className="btn btn-danger-ghost btn-sm" onClick={() => remove(emp)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={meta.page}
              pages={meta.pages}
              total={meta.total}
              onChange={(p) => load(p)}
            />
          </>
        )}
      </div>

      {modal && (
        <Modal
          title={modal === 'create' ? 'Add Employee' : 'Edit Employee'}
          onClose={() => setModal(null)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setModal(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={submit} disabled={saving}>
                {saving ? 'Saving…' : modal === 'create' ? 'Create Employee' : 'Save Changes'}
              </button>
            </>
          }
        >
          <form onSubmit={submit} className="form-grid">
            <div className="form-group">
              <label>
                Full Name <span className="req">*</span>
              </label>
              <input value={form.name} onChange={set('name')} placeholder="e.g. Arjun Nair" />
              {errors.name && <span className="field-error">{errors.name}</span>}
            </div>
            <div className="form-group">
              <label>
                Employee ID <span className="req">*</span>
              </label>
              <input value={form.employeeId} onChange={set('employeeId')} placeholder="e.g. EMP010" />
              {errors.employeeId && <span className="field-error">{errors.employeeId}</span>}
            </div>
            <div className="form-group">
              <label>
                Department <span className="req">*</span>
              </label>
              <input value={form.department} onChange={set('department')} placeholder="e.g. Engineering" />
              {errors.department && <span className="field-error">{errors.department}</span>}
            </div>
            <div className="form-group">
              <label>
                Designation <span className="req">*</span>
              </label>
              <input value={form.designation} onChange={set('designation')} placeholder="e.g. Engineer" />
              {errors.designation && <span className="field-error">{errors.designation}</span>}
            </div>
            <div className="form-group">
              <label>
                Email <span className="req">*</span>
              </label>
              <input value={form.email} onChange={set('email')} placeholder="e.g. emp@company.com" />
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input value={form.phone} onChange={set('phone')} placeholder="e.g. 9876543210" />
            </div>
            <div className="form-group">
              <label>Working Hours Start</label>
              <input type="time" value={form.workingHours?.start || '09:00'} onChange={setWorkingHours('start')} />
            </div>
            <div className="form-group">
              <label>Working Hours End</label>
              <input type="time" value={form.workingHours?.end || '17:00'} onChange={setWorkingHours('end')} />
            </div>
            {modal !== 'create' && (
              <div className="form-group">
                <label>Status</label>
                <select value={form.status} onChange={set('status')}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            )}
          </form>
        </Modal>
      )}
    </div>
  );
}

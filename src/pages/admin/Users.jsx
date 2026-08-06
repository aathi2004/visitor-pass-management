import { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import api, { errorMessage } from '../../services/api.js';
import { Spinner, EmptyState } from '../../components/Feedback.jsx';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';
import { RoleBadge } from '../../components/Badge.jsx';
import { formatDateTime } from '../../utils/format.js';

const EMPTY = {
  name: '',
  username: '',
  email: '',
  password: '',
  role: 'employee',
  employee: '',
  isActive: true,
};

export default function Users() {
  const [rows, setRows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 0, total: 0 });
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.get('/users', {
        params: { search, role: roleFilter, page, limit: 10 },
      });
      setRows(res.data.data);
      setMeta(res.data.pagination);
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to load users'));
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, roleFilter]);

  useEffect(() => {
    api
      .get('/employees', { params: { limit: 200 } })
      .then((res) => setEmployees(res.data.data))
      .catch(() => {});
  }, []);

  const openCreate = () => {
    setForm(EMPTY);
    setErrors({});
    setModal('create');
  };

  const openEdit = (u) => {
    setForm({ ...u, password: '', employee: u.employee?._id || '' });
    setErrors({});
    setModal(u);
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.username.trim() || form.username.trim().length < 3) errs.username = 'Username must be at least 3 characters';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Valid email is required';
    if (modal === 'create' && form.password.length < 6) errs.password = 'Password must be at least 6 characters';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      const payload = { ...form, employee: form.employee || null };
      if (!form.password && modal !== 'create') delete payload.password;
      const editing = modal !== 'create';
      const res = editing
        ? await api.put(`/users/${modal._id}`, payload)
        : await api.post('/users', payload);
      toast.success(res.data.message);
      setModal(null);
      load();
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to save user'));
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (u) => {
    if (!window.confirm(`Deactivate account for "${u.name}"?`)) return;
    try {
      const res = await api.delete(`/users/${u._id}`);
      toast.success(res.data.message);
      load();
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to deactivate user'));
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h3>User Accounts</h3>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              placeholder="Search name, username, email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, minWidth: 200 }}
            />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8 }}
            >
              <option value="">All roles</option>
              <option value="admin">Administrator</option>
              <option value="receptionist">Receptionist</option>
              <option value="employee">Employee</option>
            </select>
            <button className="btn btn-primary" onClick={openCreate}>
              + Add User
            </button>
          </div>
        </div>

        {loading ? (
          <Spinner text="Loading users…" />
        ) : rows.length === 0 ? (
          <EmptyState icon="🔐" title="No user accounts found" />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Username</th>
                    <th>Role</th>
                    <th>Linked Employee</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((u) => (
                    <tr key={u._id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{u.name}</div>
                        <div style={{ color: 'var(--muted)', fontSize: 12 }}>{u.email}</div>
                      </td>
                      <td>{u.username}</td>
                      <td>
                        <RoleBadge role={u.role} />
                      </td>
                      <td>
                        {u.employee ? (
                          <span>
                            {u.employee.name}
                            <div style={{ color: 'var(--muted)', fontSize: 12 }}>{u.employee.employeeId}</div>
                          </span>
                        ) : (
                          <span style={{ color: 'var(--muted)' }}>—</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${u.isActive ? 'active' : 'inactive'}`}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDateTime(u.createdAt)}</td>
                      <td>
                        <div className="actions" style={{ justifyContent: 'flex-end' }}>
                          <button className="btn btn-outline btn-sm" onClick={() => openEdit(u)}>
                            Edit
                          </button>
                          {u.isActive && (
                            <button className="btn btn-danger-ghost btn-sm" onClick={() => deactivate(u)}>
                              Deactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={meta.page} pages={meta.pages} total={meta.total} onChange={load} />
          </>
        )}
      </div>

      {modal && (
        <Modal
          title={modal === 'create' ? 'Add User Account' : 'Edit User Account'}
          onClose={() => setModal(null)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setModal(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={submit} disabled={saving}>
                {saving ? 'Saving…' : modal === 'create' ? 'Create User' : 'Save Changes'}
              </button>
            </>
          }
        >
          <form onSubmit={submit} className="form-grid">
            <div className="form-group">
              <label>
                Full Name <span className="req">*</span>
              </label>
              <input value={form.name} onChange={set('name')} />
              {errors.name && <span className="field-error">{errors.name}</span>}
            </div>
            <div className="form-group">
              <label>
                Username <span className="req">*</span>
              </label>
              <input value={form.username} onChange={set('username')} autoComplete="off" />
              {errors.username && <span className="field-error">{errors.username}</span>}
            </div>
            <div className="form-group">
              <label>
                Email <span className="req">*</span>
              </label>
              <input value={form.email} onChange={set('email')} />
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>
            <div className="form-group">
              <label>
                Role <span className="req">*</span>
              </label>
              <select value={form.role} onChange={set('role')}>
                <option value="admin">Administrator</option>
                <option value="receptionist">Receptionist</option>
                <option value="employee">Employee</option>
              </select>
            </div>
            <div className="form-group">
              <label>
                {modal === 'create' ? (
                  <>
                    Password <span className="req">*</span>
                  </>
                ) : (
                  'New Password (leave blank to keep)'
                )}
              </label>
              <input
                type="password"
                value={form.password}
                onChange={set('password')}
                autoComplete="new-password"
                placeholder="Min. 6 characters"
              />
              {errors.password && <span className="field-error">{errors.password}</span>}
            </div>
            <div className="form-group">
              <label>Link to Employee</label>
              <select value={form.employee} onChange={set('employee')}>
                <option value="">— No employee link —</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.name} ({emp.employeeId})
                  </option>
                ))}
              </select>
            </div>
            {modal !== 'create' && (
              <div className="form-group">
                <label>Account Status</label>
                <select value={String(form.isActive)} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.value === 'true' }))}>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            )}
          </form>
        </Modal>
      )}
    </div>
  );
}

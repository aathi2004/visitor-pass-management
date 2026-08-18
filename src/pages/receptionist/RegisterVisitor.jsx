import { useState } from 'react';
import { toast } from 'react-toastify';
import api, { errorMessage } from '../../services/api.js';

const EMPTY = {
  name: '',
  email: '',
  phone: '',
  company: '',
  address: '',
  idType: '',
  idNumber: '',
  date: new Date().toISOString().slice(0, 10),
  expectedArrivalTime: '',
  purpose: '',
};

const toMin = (t) => {
  if (!t) return -1;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

export default function RegisterVisitor() {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const today = new Date().toISOString().slice(0, 10);
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Visitor name is required';
    if (!form.phone.trim()) e.phone = 'Visitor phone is required';
    else if (!/^[+\d][\d\s-]{6,}$/.test(form.phone.trim())) e.phone = 'Enter a valid phone number';
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.date) e.date = 'Visit date is required';
    else if (form.date < today) e.date = 'Visit date cannot be earlier than today';
    if (!form.expectedArrivalTime) e.expectedArrivalTime = 'Expected arrival time is required';
    if (form.date === today && form.expectedArrivalTime && toMin(form.expectedArrivalTime) < nowMin) {
      e.expectedArrivalTime = 'Arrival time for today cannot be earlier than now';
    }
    if (!form.purpose.trim()) e.purpose = 'Purpose of visit is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await api.post('/visitors/register', form);
      toast.success(res.data.message);
      setSuccess(res.data.data);
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to register visitor'));
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="card">
        <div className="card-header">
          <h3>Visitor Registered</h3>
        </div>
        <div className="card-body">
          <div style={{ padding: 16, background: 'var(--success-bg, #f0fdf4)', borderRadius: 8, marginBottom: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Registration Successful</div>
            <div style={{ fontSize: 14, color: 'var(--muted)' }}>
              <strong>{success.visitor?.name}</strong> has been registered for <strong>{success.date}</strong> at <strong>{success.expectedArrivalTime}</strong>.
              <br />The system will auto-assign an available employee when the request is approved.
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => { setSuccess(null); setForm(EMPTY); }}>
            Register Another Visitor
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3>Register Visitor</h3>
        <span style={{ color: 'var(--muted)', fontSize: 13 }}>
          The system will auto-assign an available employee.
        </span>
      </div>
      <div className="card-body">
        <form onSubmit={submit}>
          <div className="form-section-title">Visitor Details</div>
          <div className="form-grid">
            <div className="form-group">
              <label>
                Visitor Name <span className="req">*</span>
              </label>
              <input value={form.name} onChange={set('name')} placeholder="Full name" />
              {errors.name && <span className="field-error">{errors.name}</span>}
            </div>
            <div className="form-group">
              <label>Email</label>
              <input value={form.email} onChange={set('email')} placeholder="visitor@email.com" />
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>
            <div className="form-group">
              <label>
                Phone <span className="req">*</span>
              </label>
              <input value={form.phone} onChange={set('phone')} placeholder="e.g. 9876543210" />
              {errors.phone && <span className="field-error">{errors.phone}</span>}
            </div>
            <div className="form-group">
              <label>Company</label>
              <input value={form.company} onChange={set('company')} placeholder="Company / organization" />
            </div>
            <div className="form-group">
              <label>ID Type</label>
              <select value={form.idType} onChange={set('idType')}>
                <option value="">— Select —</option>
                <option value="Aadhaar">Aadhaar</option>
                <option value="Driver License">Driver License</option>
                <option value="Passport">Passport</option>
                <option value="Company ID">Company ID</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label>ID Number</label>
              <input value={form.idNumber} onChange={set('idNumber')} placeholder="ID card number" />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Address</label>
              <input value={form.address} onChange={set('address')} placeholder="Residential / office address" />
            </div>
          </div>

          <div className="form-section-title">Visit Schedule</div>
          <div className="form-grid">
            <div className="form-group">
              <label>
                Visit Date <span className="req">*</span>
              </label>
              <input type="date" value={form.date} onChange={set('date')} min={today} />
              {errors.date && <span className="field-error">{errors.date}</span>}
            </div>
            <div className="form-group">
              <label>
                Expected Arrival <span className="req">*</span>
              </label>
              <input type="time" value={form.expectedArrivalTime} onChange={set('expectedArrivalTime')} />
              {errors.expectedArrivalTime && <span className="field-error">{errors.expectedArrivalTime}</span>}
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>
                Purpose of Visit <span className="req">*</span>
              </label>
              <textarea
                value={form.purpose}
                onChange={set('purpose')}
                placeholder="Briefly describe the purpose of the visit"
              />
              {errors.purpose && <span className="field-error">{errors.purpose}</span>}
            </div>
          </div>

          <div className="form-actions">
            <button className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Registering…' : 'Register Visitor'}
            </button>
            <button type="button" className="btn btn-outline" onClick={() => setForm(EMPTY)}>
              Reset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
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
  employee: '',
  date: new Date().toISOString().slice(0, 10),
  expectedArrivalTime: '',
  expectedDepartureTime: '',
  purpose: '',
};

const toMin = (t) => {
  if (!t) return -1;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

export default function RegisterVisitor() {
  const [form, setForm] = useState(EMPTY);
  const [employees, setEmployees] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .get('/employees', { params: { limit: 500, status: 'active' } })
      .then((res) => setEmployees(res.data.data))
      .catch(() => toast.error('Could not load employee list'));
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const today = new Date().toISOString().slice(0, 10);
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Visitor name is required';
    if (!form.phone.trim()) e.phone = 'Visitor phone is required';
    else if (!/^[+\d][\d\s-]{6,}$/.test(form.phone.trim())) e.phone = 'Enter a valid phone number';
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.employee) e.employee = 'Select the employee to visit';
    if (!form.date) e.date = 'Visit date is required';
    else if (form.date < today) e.date = 'Visit date cannot be earlier than today';
    if (!form.expectedArrivalTime) e.expectedArrivalTime = 'Expected arrival time is required';
    if (!form.expectedDepartureTime) e.expectedDepartureTime = 'Expected departure time is required';
    if (form.date === today && form.expectedArrivalTime && toMin(form.expectedArrivalTime) < nowMin) {
      e.expectedArrivalTime = 'Arrival time for today cannot be earlier than now';
    }
    if (
      form.expectedArrivalTime &&
      form.expectedDepartureTime &&
      toMin(form.expectedDepartureTime) <= toMin(form.expectedArrivalTime)
    ) {
      e.expectedDepartureTime = 'Departure time must be later than arrival time';
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
      setForm(EMPTY);
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to register visitor'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3>Register Visitor</h3>
        <span style={{ color: 'var(--muted)', fontSize: 13 }}>
          The request will be sent to the employee for approval.
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
                Employee to Visit <span className="req">*</span>
              </label>
              <select value={form.employee} onChange={set('employee')}>
                <option value="">— Select employee —</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.name} · {emp.department} ({emp.employeeId})
                  </option>
                ))}
              </select>
              {errors.employee && <span className="field-error">{errors.employee}</span>}
            </div>
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
            <div className="form-group">
              <label>
                Expected Departure <span className="req">*</span>
              </label>
              <input type="time" value={form.expectedDepartureTime} onChange={set('expectedDepartureTime')} />
              {errors.expectedDepartureTime && (
                <span className="field-error">{errors.expectedDepartureTime}</span>
              )}
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

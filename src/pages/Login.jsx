import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext.jsx';
import { errorMessage } from '../services/api.js';

const DEMO = [
  { label: 'Admin', id: 'admin', pw: 'admin123' },
  { label: 'Receptionist', id: 'receptionist', pw: 'reception123' },
  { label: 'Employee', id: 'arjun', pw: 'employee123' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!identifier.trim()) e.identifier = 'Username or email is required';
    if (!password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const user = await login(identifier, password);
      toast.success(`Welcome back, ${user.name}!`);
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(errorMessage(err, 'Login failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const fill = (id, pw) => {
    setIdentifier(id);
    setPassword(pw);
    setErrors({});
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-brand">
          <div className="logo">🛂</div>
          <div>
            <h1>Visitor Pass</h1>
            <div className="subtitle" style={{ margin: 0 }}>
              Management System
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="identifier">Username or Email</label>
            <input
              id="identifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. admin"
              autoComplete="username"
            />
            {errors.identifier && <span className="field-error">{errors.identifier}</span>}
          </div>
          <div className="form-group" style={{ marginTop: 14 }}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>
          <button className="btn btn-primary btn-block" style={{ marginTop: 20 }} disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className="login-hint">
          <strong>Demo accounts</strong> — click to fill
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            {DEMO.map((d) => (
              <button
                key={d.id}
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => fill(d.id, d.pw)}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

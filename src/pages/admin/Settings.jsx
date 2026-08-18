import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api, { errorMessage } from '../../services/api.js';
import { Spinner } from '../../components/Feedback.jsx';

export default function Settings() {
  const [config, setConfig] = useState({ slotDuration: 20, slotUnit: 'minutes', maxQueueSize: 3, maxVisitorsPerEmployee: 3 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/slots/config')
      .then((res) => setConfig(res.data.data))
      .catch(() => toast.error('Failed to load config'))
      .finally(() => setLoading(false));
  }, []);

  const set = (k) => (e) => setConfig((c) => ({ ...c, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        slotDuration: Number(config.slotDuration),
        slotUnit: config.slotUnit,
        maxQueueSize: Number(config.maxQueueSize),
        maxVisitorsPerEmployee: Number(config.maxVisitorsPerEmployee),
      };
      const res = await api.put('/slots/config', payload);
      setConfig(res.data.data);
      toast.success('Settings saved.');
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to save settings'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner text="Loading settings…" />;

  return (
    <div className="card">
      <div className="card-header">
        <h3>System Settings</h3>
      </div>
      <div className="card-body">
        <div className="form-section-title">Time Slot Configuration</div>
        <div className="form-grid">
          <div className="form-group">
            <label>Slot Duration <span className="req">*</span></label>
            <input
              type="number"
              min="1"
              value={config.slotDuration}
              onChange={set('slotDuration')}
            />
          </div>
          <div className="form-group">
            <label>Unit <span className="req">*</span></label>
            <select value={config.slotUnit} onChange={set('slotUnit')}>
              <option value="seconds">Seconds (for demo/testing)</option>
              <option value="minutes">Minutes (production)</option>
            </select>
          </div>
          <div className="form-group">
            <label>Max Active Visitors (Queue Cap) <span className="req">*</span></label>
            <input
              type="number"
              min="1"
              value={config.maxQueueSize}
              onChange={set('maxQueueSize')}
            />
          </div>
          <div className="form-group">
            <label>Max Visitors Per Employee Per Day <span className="req">*</span></label>
            <input
              type="number"
              min="1"
              value={config.maxVisitorsPerEmployee}
              onChange={set('maxVisitorsPerEmployee')}
            />
          </div>
        </div>

        <div style={{ marginTop: 16, padding: 12, background: 'var(--bg)', borderRadius: 8, fontSize: 14, color: 'var(--muted)' }}>
          Visitors will have <strong>{config.slotDuration} {config.slotUnit}</strong> per slot.
          Maximum <strong>{config.maxQueueSize}</strong> active visitors in the system at once.
          Each employee can handle up to <strong>{config.maxVisitorsPerEmployee}</strong> visitors per day.
        </div>

        <div className="form-actions" style={{ marginTop: 20 }}>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}

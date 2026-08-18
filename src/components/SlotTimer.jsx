import { useState, useEffect } from 'react';

export default function SlotTimer({ slotEndTime, status }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (status !== 'checked_in' || !slotEndTime) {
      setRemaining(0);
      return;
    }

    const calc = () => Math.max(0, Math.floor((new Date(slotEndTime) - Date.now()) / 1000));
    setRemaining(calc());

    const id = setInterval(() => {
      const r = calc();
      setRemaining(r);
      if (r <= 0) clearInterval(id);
    }, 1000);

    return () => clearInterval(id);
  }, [slotEndTime, status]);

  if (status !== 'checked_in' || !slotEndTime) return null;

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const totalSecs = remaining;

  let color = 'var(--success, #22c55e)';
  if (totalSecs <= 0) color = 'var(--danger, #ef4444)';
  else if (totalSecs <= 10) color = 'var(--danger, #ef4444)';
  else if (totalSecs <= 30) color = 'var(--warning, #f59e0b)';

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'monospace', fontSize: 14, fontWeight: 600, color }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
      {totalSecs <= 0 ? 'Time Expired' : `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`}
    </div>
  );
}

import { formatDayLabel } from '../utils/dateUtils';

const getIntensityColor = (count) => {
  if (!count) return '#eceef3';
  if (count < 2) return '#ffd6d6';
  if (count < 4) return '#ff6b6b';
  return '#c92a2a';
};

export default function WeeklyProgress({ days = [], selectedDayKey }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <p className="section-label">Weekly progress</p>
        <h2 className="section-title">7-day heatmap</h2>
        <p className="text-secondary" style={{ marginTop: '6px' }}>
          Track consistency and muscle activation across the last week.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '10px' }}>
        {days.map((day) => (
          <div key={day.dateKey} style={{ textAlign: 'center' }}>
            <div
              style={{
                height: '56px',
                borderRadius: '12px',
                background: getIntensityColor(day.activationCount),
                border: day.dateKey === selectedDayKey ? '2px solid var(--accent)' : '1px solid var(--border)',
                boxShadow: day.dateKey === selectedDayKey ? 'var(--shadow-glow)' : 'none',
                transition: 'all 200ms ease',
              }}
              title={`Activation: ${day.activationCount}`}
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '6px' }}>
              {formatDayLabel(day.dateKey)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

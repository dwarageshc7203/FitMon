import { exerciseList, buildWorkoutSummary } from '../utils/muscleMapping';

export default function ExerciseSelector({ selectedExercises, onToggle, onReset }) {
  const summary = buildWorkoutSummary(selectedExercises);

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <p className="section-label">Today</p>
        <h2 className="section-title">Exercise checklist</h2>
        <p className="text-secondary" style={{ marginTop: '6px' }}>
          Select exercises you performed to update the heatmap instantly.
        </p>
      </div>

      <div style={{ display: 'grid', gap: '12px' }}>
        {exerciseList.map((exercise) => (
          <label key={exercise.id} className="card" style={{
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={selectedExercises.includes(exercise.id)}
              onChange={() => onToggle(exercise.id)}
              style={{ accentColor: 'var(--accent)' }}
            />
            <span style={{ color: 'var(--text)', fontWeight: 600 }}>{exercise.label}</span>
          </label>
        ))}
      </div>

      <div className="card" style={{
        padding: '16px',
        borderColor: 'var(--border)',
        background: 'var(--surface)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p className="section-label">Today</p>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--text)' }}>
              Workout summary
            </h3>
          </div>
          <button type="button" className="btn-secondary" onClick={onReset}>
            Reset today
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px', marginTop: '14px' }}>
          <div>
            <p className="metric-label">Exercises</p>
            <p className="metric-value metric-value--accent">{summary.totalExercises}</p>
          </div>
          <div>
            <p className="metric-label">Muscles</p>
            <p className="metric-value metric-value--blue">{summary.activeMuscles}</p>
          </div>
          <div>
            <p className="metric-label">Activation</p>
            <p className="metric-value metric-value--accent">{summary.totalActivations}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

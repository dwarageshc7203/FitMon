import { useEffect, useState } from 'react';
import { auth } from '../firebase/config';
import useAuthStore from '../store/useAuthStore';
import { authorizedRequest } from '../services/apiClient';
import { toDayKey } from '../utils/dateUtils';
import '../index.css';

const workouts = [
  { id: 1, name: 'Push-Up', muscle: 'Chest', difficulty: 'Beginner', ytId: 'IODxDxX7oi4' },
  { id: 2, name: 'Bench Press', muscle: 'Chest', difficulty: 'Intermediate', ytId: 'rT7DgCr-3pg' },
  { id: 3, name: 'Pull-Up', muscle: 'Back', difficulty: 'Intermediate', ytId: 'eGo4IYlbE5g' },
  { id: 4, name: 'Deadlift', muscle: 'Back', difficulty: 'Advanced', ytId: 'op9kVnSso6Q' },
  { id: 5, name: 'Squat', muscle: 'Legs', difficulty: 'Beginner', ytId: 'aclHkVaku9U' },
  { id: 6, name: 'Leg Press', muscle: 'Legs', difficulty: 'Intermediate', ytId: 'IZxyjW7LOLM' },
  { id: 7, name: 'Shoulder Press', muscle: 'Shoulders', difficulty: 'Intermediate', ytId: 'qEwKCR5JCog' },
  { id: 8, name: 'Lateral Raise', muscle: 'Shoulders', difficulty: 'Beginner', ytId: '3VcKaXpzqRo' },
  { id: 9, name: 'Bicep Curl', muscle: 'Arms', difficulty: 'Beginner', ytId: 'ykJmrZ5v0Oo' },
  { id: 10, name: 'Tricep Dips', muscle: 'Arms', difficulty: 'Intermediate', ytId: '0326dy_-CzM' },
  { id: 11, name: 'Plank', muscle: 'Core', difficulty: 'Beginner', ytId: 'ASdvN_XEl_c' },
  { id: 12, name: 'Ab Workout', muscle: 'Core', difficulty: 'Intermediate', ytId: 'DHD1-2P4ngg' },
];

export default function Workout() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const [search, setSearch] = useState('');
  const [minutesOfCardio, setMinutesOfCardio] = useState('');
  const [calorieLog, setCalorieLog] = useState({ minutes: 0, calories: 0 });
  const [workoutTracker, setWorkoutTracker] = useState([]);
  const [customWorkout, setCustomWorkout] = useState('');
  const [savedWorkoutSummary, setSavedWorkoutSummary] = useState([]);

  const getActiveToken = async () => {
    if (token) return token;
    if (auth?.currentUser) return auth.currentUser.getIdToken();
    return null;
  };

  useEffect(() => {
    async function fetchMeasureData() {
      if (!user?.uid) return;
      const activeToken = await getActiveToken();
      if (!activeToken) return;
      const { day } = await authorizedRequest(`/api/workout/day?dateKey=${encodeURIComponent(toDayKey(Date.now()))}`, activeToken, {
        method: 'GET',
      });
      const data = day || {};
      setCalorieLog({
        minutes: Number(data.cardioMinutes || 0),
        calories: Number(data.caloriesBurned || 0),
      });
      setWorkoutTracker(Array.isArray(data.workoutTracker) ? data.workoutTracker : []);
      setSavedWorkoutSummary(Array.isArray(data.selectedMuscleGroups) ? data.selectedMuscleGroups : []);
    }

    fetchMeasureData();
  }, [user?.uid]);

  const filtered = workouts.filter((workout) =>
    workout.name.toLowerCase().includes(search.toLowerCase()) ||
    workout.muscle.toLowerCase().includes(search.toLowerCase())
  );

  const difficultyBadge = (difficulty) => {
    if (difficulty === 'Beginner') return 'badge-success';
    if (difficulty === 'Intermediate') return 'badge-warning';
    return 'badge-danger';
  };

  const workoutMuscleMap = {
    Chest: ['chest', 'shoulders_left', 'shoulders_right', 'triceps_left', 'triceps_right'],
    Back: ['back', 'biceps_left', 'biceps_right'],
    Legs: ['quads_left', 'quads_right', 'hamstrings_left', 'hamstrings_right', 'glutes'],
    Shoulders: ['shoulders_left', 'shoulders_right', 'triceps_left', 'triceps_right'],
    Arms: ['biceps_left', 'biceps_right', 'triceps_left', 'triceps_right'],
    Core: ['abs', 'obliques_left', 'obliques_right'],
  };

  const saveMeasureData = async (patch) => {
    if (!user?.uid) return;
    const activeToken = await getActiveToken();
    if (!activeToken) return;
    await authorizedRequest('/api/workout/day', activeToken, {
      method: 'POST',
      body: JSON.stringify({ dateKey: toDayKey(Date.now()), ...patch }),
    });
  };

  const estimatedCalories = Math.max(0, Math.round(Number(minutesOfCardio || 0) * 8));

  const logCardio = async () => {
    const minutes = Number(minutesOfCardio);
    if (!Number.isFinite(minutes) || minutes < 0) return;
    setCalorieLog({ minutes, calories: Math.max(0, Math.round(minutes * 8)) });
    await saveMeasureData({
      cardioMinutes: minutes,
      caloriesBurned: Math.max(0, Math.round(minutes * 8)),
    });
  };

  const toggleWorkout = async (workout) => {
    // Persist raw workout names (not guide ids)
    const exists = workoutTracker.includes(workout.name);
    const next = exists
      ? workoutTracker.filter((item) => item !== workout.name)
      : [...workoutTracker, workout.name];
    setWorkoutTracker(next);
    const selectedMuscleGroups = workouts
      .filter((item) => next.includes(item.name))
      .flatMap((item) => workoutMuscleMap[item.muscle] || []);
    setSavedWorkoutSummary(selectedMuscleGroups);
    await saveMeasureData({ workoutTracker: next, selectedMuscleGroups });
  };

  const addCustomWorkout = async () => {
    const normalized = customWorkout.trim();
    if (!normalized) return;
    if (workouts.some((item) => item.name.toLowerCase() === normalized.toLowerCase()) || workoutTracker.includes(normalized)) {
      setCustomWorkout('');
      return;
    }
    const next = [...workoutTracker, normalized];
    setWorkoutTracker(next);
    setCustomWorkout('');
    await saveMeasureData({ workoutTracker: next, selectedMuscleGroups: savedWorkoutSummary });
  };

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: '80px' }}>

      <div className="container" style={{ paddingTop: '96px' }}>
        <div style={{ marginBottom: '32px' }}>
          <p className="section-label">Workouts</p>
          <h1 className="page-title">Workouts</h1>
        </div>

        <section style={{ marginBottom: '36px' }}>
          <p className="section-label">Measure</p>
          <h2 className="section-title" style={{ marginBottom: '14px' }}>Calorie and workout tracking</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
            <div className="card">
              <p style={{ color: 'var(--text)', fontWeight: 600, marginBottom: '8px' }}>Calorie Tracker</p>
              <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '12px' }}>
                Enter cardio minutes and get a live calorie estimate.
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  className="input-field"
                  type="number"
                  min="1"
                  value={minutesOfCardio}
                  onChange={(event) => setMinutesOfCardio(event.target.value)}
                  placeholder="Minutes of cardio"
                />
              </div>
              <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                <p style={{ color: 'var(--text)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                  Approx. calories: {estimatedCalories} kcal
                </p>
                <button type="button" className="btn-primary" onClick={logCardio}>Log cardio</button>
              </div>
              <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginTop: '10px' }}>
                Saved today: {calorieLog.minutes || 0} min · {calorieLog.calories || 0} kcal
              </p>
            </div>

            <div className="card">
              <p style={{ color: 'var(--text)', fontWeight: 600, marginBottom: '8px' }}>Workout Tracker</p>
              <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '12px' }}>
                Check completed workouts or add your own.
              </p>
              <div style={{ maxHeight: '210px', overflow: 'auto', display: 'grid', gap: '8px', marginBottom: '10px' }}>
                {workouts.map((workout) => (
                  <label key={workout.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text)' }}>
                    <input
                      type="checkbox"
                      checked={workoutTracker.includes(workout.name)}
                      onChange={() => toggleWorkout(workout)}
                    />
                    <span>{workout.name}</span>
                  </label>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  className="input-field"
                  value={customWorkout}
                  onChange={(event) => setCustomWorkout(event.target.value)}
                  placeholder="Add a custom workout"
                />
                <button type="button" className="btn-secondary" onClick={addCustomWorkout}>Add</button>
              </div>
            </div>
          </div>
        </section>

        <section>
          <p className="section-label">Refer</p>
          <h2 className="section-title" style={{ marginBottom: '14px' }}>Video references</h2>

        <div style={{ maxWidth: '520px', marginBottom: '32px' }}>
          <input
            className="input-field"
            placeholder="Search by workout or muscle group..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '20px',
          }}
        >
          {filtered.map((workout) => (
            <div key={workout.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  position: 'relative',
                  paddingTop: '56.25%',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                }}
              >
                <iframe
                  src={`https://www.youtube.com/embed/${workout.ytId}?rel=0&controls=0`}
                  title={workout.name}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    border: '0',
                  }}
                />
              </div>

              <div>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem', color: 'var(--text)' }}>
                  {workout.name}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                  <span className="badge-blue">{workout.muscle}</span>
                  <span className={difficultyBadge(workout.difficulty)}>{workout.difficulty}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        </section>
      </div>
    </div>
  );
}
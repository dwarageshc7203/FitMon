import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import { authorizedRequest } from '../services/apiClient';
import { auth } from '../firebase/config';
import useProfileStore from '../stores/useProfileStore';
import MuscleHeatmap from '../components/MuscleHeatmap';
import WeeklyProgress from '../components/WeeklyProgress';
import { toDayKey, shiftDayKey } from '../utils/dateUtils';
import '../index.css';

export default function Profile() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const setAuthState = useAuthStore((state) => state.setAuthState);
    const getActiveToken = async () => {
      if (token) return token;
      if (auth?.currentUser) return auth.currentUser.getIdToken();
      return null;
    };

  const {
    goal, streak, totalSessions, recentSessions,
    fetchProfileMetrics, updateGoal, isLoading,
    heatmapByDay, selectedHeatmapDate, weeklyHeatmap,
    setHeatmapDate, fetchHeatmapDay, fetchWeeklyHeatmap,
    isHeatmapLoading,
  } = useProfileStore();

  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState('');

  useEffect(() => {
    if (user) fetchProfileMetrics(user);
  }, [user, fetchProfileMetrics]);

  useEffect(() => {
    if (!user?.uid) return;
    const dateKey = selectedHeatmapDate || toDayKey(Date.now());
    fetchHeatmapDay(user.uid, dateKey);
    fetchWeeklyHeatmap(user.uid, dateKey);
  }, [user, selectedHeatmapDate, fetchHeatmapDay, fetchWeeklyHeatmap]);

  useEffect(() => {
    setGoalInput(goal || '');
  }, [goal]);

  const activeDateKey = selectedHeatmapDate || toDayKey(Date.now());
  const selectedExercises = useMemo(
    () => heatmapByDay[activeDateKey] || [],
    [heatmapByDay, activeDateKey]
  );

  const handleSaveGoal = async () => {
    if (user?.uid) await updateGoal(user.uid, goalInput);
    setIsEditingGoal(false);
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()
    : 'T';

  const riskBadge = (score) => {
    if (score < 25) return <span className="badge-success">Low Risk</span>;
    if (score < 55) return <span className="badge-warning">Moderate</span>;
    return <span className="badge-danger">High Risk</span>;
  };

  const getSessionTimestamp = (session) => {
    const ts = session?.startedAt ?? session?.createdAt ?? session?.endedAt;
    if (!ts) return null;
    if (typeof ts === 'number') return ts;
    if (typeof ts?.toDate === 'function') return ts.toDate().getTime();
    if (typeof ts?.seconds === 'number') return ts.seconds * 1000;
    const parsed = new Date(ts).getTime();
    return Number.isNaN(parsed) ? null : parsed;
  };

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: '80px' }}>

      <div className="container" style={{ paddingTop: '96px', maxWidth: '800px', margin: '0 auto' }}>

        {/* Page header */}
        <div style={{ marginBottom: '40px' }}>
          <p className="section-label">Profile</p>
          <h1 className="page-title" style={{ fontSize: 'clamp(1.8rem, 3vw, 2.4rem)' }}>Profile</h1>
        </div>

        {/* ── IDENTITY ── */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '24px', padding: '28px' }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%',
            background: 'var(--accent-dim)', border: '1px solid var(--accent-border)',
            color: 'var(--accent)', fontFamily: 'var(--font-display)',
            fontSize: '1.6rem', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            {initials}
          </div>
          <div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>
              {user?.name || 'Trainee'}
            </p>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
              {user?.email || '—'}
            </p>
            <div style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <label style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Role</label>
              <select
                value={user?.role || 'fitness_enthusiast'}
                onChange={async (e) => {
                  const newRole = e.target.value;
                  try {
                    const activeToken = await getActiveToken();
                    if (!activeToken) return;
                    await authorizedRequest('/api/users/role', activeToken, {
                      method: 'PATCH',
                      body: JSON.stringify({ role: newRole }),
                    });
                    const body = await authorizedRequest('/api/auth/me', activeToken, { method: 'GET' });
                    const nextUser = body?.user || { ...(user || {}), role: newRole };
                    setAuthState({ user: nextUser, token: activeToken });
                  } catch {
                    // fallback local update if backend readback fails
                    if (user) {
                      setAuthState({ user: { ...user, role: newRole }, token: token || null });
                    }
                  }
                }}
                className="input-field"
                style={{ padding: '6px 10px' }}
              >
                <option value="fitness_enthusiast">Fitness Enthusiast</option>
                <option value="coach">Coach</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── GOAL ── */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <p className="section-label" style={{ margin: 0 }}>Goal</p>
            {!isEditingGoal && (
              <button
                onClick={() => setIsEditingGoal(true)}
                className="btn-secondary"
                style={{ padding: '6px 16px', fontSize: '0.8rem' }}
              >
                Edit Goal
              </button>
            )}
          </div>

          {isEditingGoal ? (
            <div style={{ display: 'flex', gap: '12px' }}>
              <input
                type="text"
                className="input-field"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                placeholder="Improve posture, Build endurance, Recover from injury"
                autoFocus
              />
              <button onClick={handleSaveGoal} className="btn-primary" style={{ flexShrink: 0 }}>
                Save
              </button>
              <button onClick={() => setIsEditingGoal(false)} className="btn-secondary" style={{ flexShrink: 0 }}>
                Cancel
              </button>
            </div>
          ) : (
            <p style={{ color: 'var(--text)', fontSize: '1.1rem' }}>
              {goal || <span style={{ color: 'var(--muted)' }}>No goal set yet. Tap Edit Goal to add one.</span>}
            </p>
          )}
          <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginTop: '12px' }}>
            Suggestions: Improve posture, Build endurance, Recover from injury.
          </p>
        </div>

        {/* ── STATS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          <StatCard emoji="🔥" label="Streak" value={`${streak ?? 0}`} unit="days" />
          <StatCard emoji="📊" label="Sessions" value={`${totalSessions ?? 0}`} unit="total" />
        </div>

        {/* ── RECENT ACTIVITY ── */}
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--text)', marginBottom: '20px' }}>
            Recent Activity
          </h2>

          {isLoading ? (
            <p style={{ color: 'var(--muted)' }}>Loading...</p>
          ) : recentSessions?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recentSessions.slice(0, 3).map((sess, idx) => (
                <div key={idx} className="card" style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '16px 24px',
                }}>
                  <div>
                    <p style={{ color: 'var(--text)', fontWeight: 500, marginBottom: '4px', fontSize: '0.95rem' }}>
                      {new Date(getSessionTimestamp(sess) || 0).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                      Posture: {sess.avgPostureScore || 0}/100
                    </p>
                  </div>
                  {riskBadge(sess.injuryRiskScore || 0)}
                </div>
              ))}
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
              No recent activity. <Link to="/session" style={{ color: 'var(--accent)' }}>Start a session</Link> to see it here.
            </div>
          )}
        </div>

        {/* ── TODAY'S HEATMAP ── */}
        <div style={{ marginTop: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <p className="section-label">Progress</p>
              <h2 className="section-title">Muscle heatmap</h2>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setHeatmapDate(toDayKey(Date.now()))}
              >
                Today
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setHeatmapDate(shiftDayKey(activeDateKey, -1))}
              >
                Yesterday
              </button>
              <input
                type="date"
                value={activeDateKey}
                onChange={(event) => setHeatmapDate(event.target.value)}
                className="input-field"
                style={{ padding: '8px 12px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            <MuscleHeatmap selectedMuscles={selectedExercises} />
          </div>

          {isHeatmapLoading && (
            <p style={{ color: 'var(--muted)', marginTop: '12px' }}>Loading heatmap…</p>
          )}
        </div>

        {/* ── WEEKLY PROGRESS ── */}
        <div style={{ marginTop: '32px' }}>
          <WeeklyProgress
            days={weeklyHeatmap}
            selectedDayKey={activeDateKey}
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ emoji, label, value, unit, accent }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '24px 16px' }}>
      <p style={{ fontSize: '1.4rem', marginBottom: '8px' }}>{emoji}</p>
      <p style={{ color: 'var(--muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>{label}</p>
      <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.6rem', color: accent ? 'var(--accent)' : 'var(--text)', lineHeight: 1 }}>
        {value}
        {unit && <span style={{ fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 400, marginLeft: '4px' }}>{unit}</span>}
      </p>
    </div>
  );
}
import { createElement, useEffect, useMemo, useState } from 'react';
import { BarChart3, Camera, ShieldCheck, Users } from 'lucide-react';
import { collection, getDocs, getFirestore, query, where } from 'firebase/firestore';
import { firebaseApp } from '../firebase/config';
import useAuthStore from '../store/useAuthStore';
import useSessionStore from '../stores/useSessionStore';
import socketService from '../services/socketService';
import { authorizedRequest } from '../services/apiClient';

const db = firebaseApp ? getFirestore(firebaseApp) : null;

export default function Mentor() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const isConnected = useSessionStore((state) => state.isConnected);
  const [sharedReports, setSharedReports] = useState([]);
  const coachSessionCode = useSessionStore((state) => state.coachSessionCode);
  const athleteVideoFrame = useSessionStore((state) => state.athleteVideoFrame);

  const coachProfile = useMemo(() => ({
    name: user?.name || 'Coach',
    email: user?.email || '',
    role: user?.role || 'coach',
  }), [user]);

  useEffect(() => {
    async function fetchSharedReports() {
      if (!db || !user?.uid) return;
      const sessionsRef = collection(db, 'sessions');
      const snapshots = await getDocs(query(sessionsRef, where('coachUid', '==', user.uid)));
      const items = [];
      snapshots.forEach((docSnap) => items.push({ id: docSnap.id, ...docSnap.data() }));
      items.sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
      setSharedReports(items.slice(0, 5));
    }

    fetchSharedReports();
  }, [user?.uid]);

  useEffect(() => {
    if (!token) return;
    socketService.connect(token);
  }, [token]);

  useEffect(() => {
    if (!isConnected) return;
    socketService.createCoachSessionCode();
  }, [isConnected]);

  const handleGenerateCoachCode = () => {
    if (token && !isConnected) {
      socketService.connect(token);
    }
    socketService.createCoachSessionCode();
  };

  const handleRoleChange = async (event) => {
    const newRole = event.target.value;
    if (!token) return;

    try {
      await authorizedRequest('/api/users/role', token, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });
      const nextUser = { ...(user || {}), role: newRole };
      useAuthStore.getState().setAuthState({ user: nextUser, token });
    } catch {
      // ignore for now
    }
  };

  return (
    <div className="page mentor-page">
      <div className="container mentor-layout">
        <aside className="mentor-sidebar" aria-label="Conversations">
          <p className="section-label">Coach Studio</p>
          <h2 className="mentor-sidebar-title">Inbox</h2>
          <ul className="mentor-thread-list">
            <li>
              <div className="mentor-thread mentor-thread--active">
                <span className="mentor-thread-title">Workspace</span>
                <span className="mentor-thread-meta">Active</span>
              </div>
            </li>
            <li>
              <div className="mentor-thread">
                <span className="mentor-thread-title">Session reviews</span>
                <span className="mentor-thread-meta">Soon</span>
              </div>
            </li>
          </ul>
          <p className="text-secondary mentor-sidebar-note">
            Use this space to review sessions, share notes, and guide safer training.
          </p>
        </aside>

        <section className="mentor-main mentor-chat-area">
          <header className="mentor-chat-header">
            <p className="section-label">Coach Workspace</p>
            <h1 className="page-title">Coach workspace for {user?.name || 'coach'}</h1>
          </header>
          <div className="card" style={{ marginBottom: '16px' }}>
            <p className="section-label">Coach Profile</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div>
                <p style={{ color: 'var(--text)', fontWeight: 700, fontSize: '1.05rem' }}>{coachProfile.name}</p>
                <p className="text-secondary" style={{ fontSize: '0.86rem' }}>{coachProfile.email}</p>
              </div>
              <select
                value={user?.role || 'coach'}
                onChange={handleRoleChange}
                className="input-field"
                style={{ padding: '6px 10px', maxWidth: '220px' }}
              >
                <option value="coach">Coach</option>
                <option value="fitness_enthusiast">Fitness Enthusiast</option>
              </select>
            </div>
          </div>
          <div className="card" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
              <div>
                <p className="section-label" style={{ marginBottom: '6px' }}>Coach Profile</p>
                <p style={{ color: 'var(--text)', fontWeight: 700 }}>{coachProfile.name}</p>
                <p className="text-secondary" style={{ fontSize: '0.86rem' }}>{coachProfile.email}</p>
              </div>
              <div className="card" style={{ padding: '10px 14px', minWidth: '170px', textAlign: 'center' }}>
                <p style={{ color: 'var(--muted)', fontSize: '0.78rem', marginBottom: '4px' }}>Coach Code</p>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.08em' }}>
                  {coachSessionCode || '------'}
                </p>
              </div>
            </div>
            <button type="button" className="btn-primary" style={{ marginTop: '14px' }} onClick={handleGenerateCoachCode}>
              Generate Coach Code
            </button>
          </div>
          <div className="card" style={{ marginBottom: '16px' }}>
            <p className="section-label" style={{ marginBottom: '8px' }}>Client Video Stream</p>
            {athleteVideoFrame?.imageData ? (
              <img
                src={athleteVideoFrame.imageData}
                alt="Athlete live frame"
                style={{ width: '100%', borderRadius: '12px', border: '1px solid var(--border)' }}
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--muted)' }}>
                <Camera className="icon-sm" />
                <span>Waiting for athlete video stream...</span>
              </div>
            )}
          </div>
          <div className="mentor-chat">
            <MentorCard role="user" icon={Users} title="Athlete Overview" copy="Keep tabs on progress, patterns, and areas that need attention." />
            <MentorCard role="assistant" icon={BarChart3} title="Report Review" copy="Compare recent sessions and highlight the next focus areas." />
            <MentorCard role="assistant" icon={ShieldCheck} title="Trusted Space" copy="A focused workspace to keep coaching notes and guidance in one place." />
            <div className="chat-bubble chat-bubble--assistant">
              <h3 className="card-title">Shared Session Reports</h3>
              {sharedReports.length === 0 ? (
                <p className="text-secondary">No shared reports yet. Ask an athlete to join with your coach code.</p>
              ) : (
                <div style={{ display: 'grid', gap: '8px' }}>
                  {sharedReports.map((report) => (
                    <div key={report.id} className="card" style={{ padding: '10px 12px' }}>
                      <p style={{ color: 'var(--text)', marginBottom: '4px' }}>
                        Accuracy {report.accuracy ?? 0}% · Reps {report.totalReps ?? 0}
                      </p>
                      <p className="text-secondary" style={{ fontSize: '0.82rem' }}>
                        {new Date(report.startedAt || Date.now()).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="mentor-input-bar">
            <input type="text" className="input-field" placeholder="Coach messaging coming soon" readOnly aria-readonly="true" />
            <button type="button" className="btn-primary mentor-send-btn" disabled>
              Send
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function MentorCard({ icon, title, copy, role = 'assistant' }) {
  return (
    <div className={`chat-bubble chat-bubble--${role}`}>
      {createElement(icon, { className: 'icon-sm text-accent' })}
      <h3 className="card-title">{title}</h3>
      <p className="text-secondary">{copy}</p>
    </div>
  );
}

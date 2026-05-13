import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, ShieldCheck, Users } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import useSessionStore from '../stores/useSessionStore';
import socketService from '../services/socketService';
import MentorCard from '../components/MentorCard';
import { authorizedRequest } from '../services/apiClient';

export default function CoachProfile() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const isConnected = useSessionStore((state) => state.isConnected);
  const coachSessionCode = useSessionStore((state) => state.coachSessionCode);
  const setAuthState = useAuthStore((state) => state.setAuthState);

  const [generatedAt, setGeneratedAt] = useState('');

  useEffect(() => {
    if (!token) return;
    socketService.connect(token);
  }, [token]);

  useEffect(() => {
    if (!isConnected) return;
    socketService.createCoachSessionCode();
    setGeneratedAt(new Date().toLocaleTimeString());
  }, [isConnected]);

  const handleGenerateCode = async () => {
    socketService.createCoachSessionCode();
    setGeneratedAt(new Date().toLocaleTimeString());
  };

  const handleRoleChange = async (event) => {
    const newRole = event.target.value;
    if (!token) return;

    try {
      await authorizedRequest('/api/users/role', token, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });
      setAuthState({ user: { ...(user || {}), role: newRole }, token });
      if (newRole === 'fitness_enthusiast') {
        navigate('/dashboard', { replace: true });
      }
    } catch {
      // keep current role visible if backend update fails
    }
  };

  return (
    <div className="page mentor-page">
      <div className="container mentor-layout">
        <aside className="mentor-sidebar">
          <p className="section-label">Coach Profile</p>
          <h2 className="mentor-sidebar-title">Account</h2>
          <p className="text-secondary mentor-sidebar-note">
            Manage your coach identity and keep a fresh session code ready for athletes.
          </p>
        </aside>

        <section className="mentor-main mentor-chat-area">
          <header className="mentor-chat-header">
            <p className="section-label">Profile</p>
            <h1 className="page-title">Coach profile</h1>
          </header>

          <div className="card" style={{ marginBottom: '16px' }}>
            <p className="section-label">Identity</p>
            <p style={{ color: 'var(--text)', fontWeight: 700, fontSize: '1.05rem' }}>{user?.name || 'Coach'}</p>
            <p className="text-secondary" style={{ fontSize: '0.86rem' }}>{user?.email || ''}</p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
              <span className="badge-blue">{user?.role || 'coach'}</span>
              {generatedAt ? <span className="badge-success">Code refreshed {generatedAt}</span> : null}
            </div>
            <div style={{ marginTop: '12px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <label style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Role</label>
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
            <p className="section-label">Session Code</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div>
                <h2 className="section-title" style={{ marginBottom: '8px' }}>Active coach code</h2>
                <p className="text-secondary">Share this code with a fitness enthusiast to start a coached session.</p>
              </div>
              <div className="card" style={{ padding: '12px 16px', minWidth: '180px', textAlign: 'center' }}>
                <p style={{ color: 'var(--muted)', fontSize: '0.78rem', marginBottom: '4px' }}>Code</p>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.12em' }}>
                  {coachSessionCode || '------'}
                </p>
              </div>
            </div>
            <button type="button" className="btn-primary" style={{ marginTop: '14px' }} onClick={handleGenerateCode}>
              Generate Coach Code
            </button>
          </div>

          <div className="mentor-chat">
            <MentorCard role="user" icon={Users} title="Coach Overview" copy="Track your shared sessions and coach athletes from one place." />
            <MentorCard role="assistant" icon={BarChart3} title="Shared Reports" copy="Reports from coached sessions appear here after each athlete finishes." />
            <MentorCard role="assistant" icon={ShieldCheck} title="Coach Tools" copy="Use your coach code on the session screen to connect with athletes." />
          </div>
        </section>
      </div>
    </div>
  );
}
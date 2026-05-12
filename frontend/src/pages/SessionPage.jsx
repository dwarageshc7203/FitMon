import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Play, Square } from 'lucide-react';
import FeedbackPanel from '../components/FeedbackPanel';
import WebcamFeed from '../components/WebcamFeed';
import socketService from '../services/socketService';
import useAuthStore from '../store/useAuthStore';
import useSessionStore from '../stores/useSessionStore';

export default function SessionPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const isConnected = useSessionStore((state) => state.isConnected);
  const sessionActive = useSessionStore((state) => state.sessionActive);
  const coachSessionCode = useSessionStore((state) => state.coachSessionCode);
  const coachedReports = useSessionStore((state) => state.coachedReports);
  const poseReady = useSessionStore((state) => state.poseReady);
  const report = useSessionStore((state) => state.report);
  const isGeneratingReport = useSessionStore((state) => state.isGeneratingReport);
  const socketError = useSessionStore((state) => state.socketError);
  const resetSession = useSessionStore((state) => state.resetSession);
  const [sessionMode, setSessionMode] = useState('solo');
  const [coachCodeInput, setCoachCodeInput] = useState('');

  useEffect(() => {
    if (!token) return undefined;
    socketService.connect(token);
    return () => {
      socketService.disconnect();
      resetSession();
    };
  }, [resetSession, token]);

  useEffect(() => {
    if (report) {
      navigate('/report/latest', { state: { report } });
    }
  }, [navigate, report]);


  const handleStart = useCallback(() => {
    if (!isConnected && token) socketService.connect(token);
    if (sessionMode === 'with_coach') {
      socketService.startSession({ mode: 'with_coach', coachCode: coachCodeInput.trim().toUpperCase() });
      return;
    }
    socketService.startSession({ mode: 'solo' });
  }, [coachCodeInput, isConnected, sessionMode, token]);

  const handleEnd = useCallback(() => {
    socketService.endSession();
  }, []);

  const handleGenerateCoachCode = useCallback(() => {
    if (!isConnected && token) socketService.connect(token);
    socketService.createCoachSessionCode();
  }, [isConnected, token]);

  const isReady = poseReady && isConnected;
  const isCoach = user?.role === 'coach' || user?.role === 'mentor';

  return (
    <div className="page session-page">
      <div className="container">

        {/* ── HEADER ── */}
        <div className="session-header fade-up">
          <p className="section-label">Live Session</p>
          <h1 className="page-title" style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', marginBottom: '8px' }}>
            {sessionActive ? 'Session in Progress' : 'Ready to Start'}
          </h1>
          <p className="text-secondary" style={{ maxWidth: '540px' }}>
            {!sessionActive
              ? 'Position yourself clearly in front of the camera and press Start when ready.'
              : 'Keep your form steady. FitMon is tracking your posture and scoring each rep.'}
          </p>
        </div>

        {isCoach ? (
          <div className="card" style={{ maxWidth: '620px', marginBottom: '24px' }}>
            <p className="section-label">Coach Session Access</p>
            <h2 className="section-title" style={{ marginBottom: '8px' }}>Generate a coach session code</h2>
            <p className="text-secondary" style={{ marginBottom: '16px' }}>
              Share this code with a fitness enthusiast. They can join the coached flow and their session report will be shared back to you.
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button type="button" className="btn-primary" onClick={handleGenerateCoachCode}>
                Generate Code
              </button>
              <div className="card" style={{ padding: '10px 14px', minWidth: '170px', textAlign: 'center' }}>
                <p style={{ color: 'var(--muted)', fontSize: '0.78rem', marginBottom: '4px' }}>Current Code</p>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.08em' }}>
                  {coachSessionCode || '------'}
                </p>
              </div>
            </div>
            {coachedReports.length > 0 && (
              <div style={{ marginTop: '18px' }}>
                <p className="section-label" style={{ marginBottom: '8px' }}>Latest Shared Report</p>
                <div className="card" style={{ padding: '12px 14px' }}>
                  <p style={{ marginBottom: '4px', color: 'var(--text)' }}>Athlete session shared successfully.</p>
                  <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                    Accuracy: {coachedReports[0]?.accuracy ?? 0}% | Reps: {coachedReports[0]?.totalReps ?? 0}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* ── MAIN GRID ── */}
        <div className="session-grid">

          {/* LEFT — camera + controls */}
          <div className="session-stack">

            {/* Camera feed */}
            <div className="card session-feed-card">
              <WebcamFeed />
            </div>

            {/* Socket error */}
            {socketError && (
              <div className="camera-error camera-error-inline">
                <div>
                  <strong style={{ display: 'block', marginBottom: '4px' }}>Connection issue</strong>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Could not connect to the session. Please refresh and try again.
                  </p>
                </div>
              </div>
            )}

            {/* Controls */}
            <div className="card session-control-dock">
              <div className="session-control-copy">
                {!isCoach && !sessionActive && (
                  <div style={{ marginBottom: '12px' }}>
                    <p className="section-label" style={{ marginBottom: '6px' }}>Session Type</p>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                      <button
                        type="button"
                        className={sessionMode === 'solo' ? 'btn-primary' : 'btn-secondary'}
                        onClick={() => setSessionMode('solo')}
                      >
                        Solo
                      </button>
                      <button
                        type="button"
                        className={sessionMode === 'with_coach' ? 'btn-primary' : 'btn-secondary'}
                        onClick={() => setSessionMode('with_coach')}
                      >
                        With Coach
                      </button>
                    </div>
                    {sessionMode === 'with_coach' && (
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Enter coach session code"
                        value={coachCodeInput}
                        onChange={(event) => setCoachCodeInput(event.target.value.toUpperCase())}
                        maxLength={8}
                      />
                    )}
                  </div>
                )}

                <div className={`status-badge ${isReady ? 'connected' : 'disconnected'}`}>
                  {isReady ? '● Ready' : '○ Preparing…'}
                </div>
                <p className="session-control-note">
                  {isReady
                    ? 'Camera and tracking are ready. Press Start when you are.'
                    : 'Please wait while the camera initialises.'}
                </p>
              </div>

              <div className="session-control-actions">
                {!sessionActive ? (
                  <button
                    onClick={handleStart}
                    disabled={!poseReady || !token || (sessionMode === 'with_coach' && !coachCodeInput.trim())}
                    className="btn-primary session-control-button button-inline"
                  >
                    <Play className="icon-sm" />
                    Start Session
                  </button>
                ) : (
                  <button
                    onClick={handleEnd}
                    disabled={isGeneratingReport}
                    className="btn-danger session-control-button button-inline"
                  >
                    {isGeneratingReport ? (
                      <>
                        <Loader2 className="icon-sm spin" />
                        Generating Report…
                      </>
                    ) : (
                      <>
                        <Square className="icon-sm" />
                        End Session
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT — feedback panel */}
          <aside className="fade-up fade-up-2">
            <FeedbackPanel />
          </aside>

        </div>
      </div>
    </div>
  );
}
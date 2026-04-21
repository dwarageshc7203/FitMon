import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Play, Square } from 'lucide-react';
import FeedbackPanel from '../components/FeedbackPanel';
import WebcamFeed from '../components/WebcamFeed';
import socketService from '../services/socketService';
import useAuthStore from '../store/useAuthStore';
import useSessionStore from '../stores/useSessionStore';

export default function SessionPage() {
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.token);
  const isConnected = useSessionStore((state) => state.isConnected);
  const sessionActive = useSessionStore((state) => state.sessionActive);
  const poseReady = useSessionStore((state) => state.poseReady);
  const report = useSessionStore((state) => state.report);
  const isGeneratingReport = useSessionStore((state) => state.isGeneratingReport);
  const socketError = useSessionStore((state) => state.socketError);
  const resetSession = useSessionStore((state) => state.resetSession);

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
    socketService.startSession();
  }, [isConnected, token]);

  const handleEnd = useCallback(() => {
    socketService.endSession();
  }, []);

  const isReady = poseReady && isConnected;

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
                    disabled={!poseReady || !token}
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
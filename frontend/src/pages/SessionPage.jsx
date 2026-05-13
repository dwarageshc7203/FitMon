import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Loader2, MessageSquare, Play, Square } from 'lucide-react';
import FeedbackPanel from '../components/FeedbackPanel';
import WebcamFeed from '../components/WebcamFeed';
import { authorizedRequest } from '../services/apiClient';
import socketService from '../services/socketService';
import useAuthStore from '../store/useAuthStore';
import useSessionStore from '../stores/useSessionStore';

export default function SessionPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const isCoach = user?.role === 'coach' || user?.role === 'mentor';
  const isConnected = useSessionStore((state) => state.isConnected);
  const sessionActive = useSessionStore((state) => state.sessionActive);
  const coachSessionCode = useSessionStore((state) => state.coachSessionCode);
  const availableCoaches = useSessionStore((state) => state.availableCoaches);
  const selectedCoach = useSessionStore((state) => state.selectedCoach);
  const coachCodeStatus = useSessionStore((state) => state.coachCodeStatus);
  const activeAthlete = useSessionStore((state) => state.activeAthlete);
  const chatMessages = useSessionStore((state) => state.chatMessages);
  const coachedReports = useSessionStore((state) => state.coachedReports);
  const athleteVideoFrame = useSessionStore((state) => state.athleteVideoFrame);
  const poseReady = useSessionStore((state) => state.poseReady);
  const report = useSessionStore((state) => state.report);
  const isGeneratingReport = useSessionStore((state) => state.isGeneratingReport);
  const socketError = useSessionStore((state) => state.socketError);
  const resetSession = useSessionStore((state) => state.resetSession);
  const setAvailableCoaches = useSessionStore((state) => state.setAvailableCoaches);
  const setSelectedCoach = useSessionStore((state) => state.setSelectedCoach);
  const setCoachCodeStatus = useSessionStore((state) => state.setCoachCodeStatus);
  const [sessionMode, setSessionMode] = useState('solo');
  const [coachCodeInput, setCoachCodeInput] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [coachListError, setCoachListError] = useState('');
  const [isLoadingCoaches, setIsLoadingCoaches] = useState(false);

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

  useEffect(() => {
    if (!token || isCoach) return undefined;
    let active = true;
    setIsLoadingCoaches(true);
    setCoachListError('');

    authorizedRequest('/api/users/coaches', token)
      .then((data) => {
        if (!active) return;
        setAvailableCoaches(data?.coaches || []);
      })
      .catch((error) => {
        if (!active) return;
        setCoachListError(error?.message || 'Unable to load coaches right now.');
      })
      .finally(() => {
        if (!active) return;
        setIsLoadingCoaches(false);
      });

    return () => {
      active = false;
    };
  }, [isCoach, setAvailableCoaches, token]);

  useEffect(() => {
    if (sessionMode !== 'with_coach') {
      setCoachCodeStatus(null);
      return undefined;
    }

    const trimmedCode = coachCodeInput.trim().toUpperCase();
    if (!trimmedCode) {
      setCoachCodeStatus(null);
      return undefined;
    }

    const timer = setTimeout(() => {
      socketService.validateCoachCode(trimmedCode);
    }, 400);

    return () => clearTimeout(timer);
  }, [coachCodeInput, sessionMode, setCoachCodeStatus]);

  useEffect(() => {
    if (!coachCodeStatus?.valid || !coachCodeStatus.code) return;
    setCoachCodeInput(coachCodeStatus.code);
  }, [coachCodeStatus?.code, coachCodeStatus?.valid]);

  useEffect(() => {
    if (!isCoach || !isConnected) return;
    if (!coachSessionCode) {
      socketService.createCoachSessionCode();
    }
  }, [coachSessionCode, isCoach, isConnected]);


  const handleStart = useCallback(() => {
    if (!isConnected && token) socketService.connect(token);

    if (sessionMode === 'with_coach') {
      const trimmedCode = coachCodeInput.trim().toUpperCase();
      if (!trimmedCode) return;
      if (!coachCodeStatus?.valid || coachCodeStatus.code !== trimmedCode) {
        socketService.validateCoachCode(trimmedCode);
        return;
      }
      socketService.startSession({ mode: 'with_coach', coachCode: trimmedCode });
      return;
    }

    socketService.startSession({ mode: 'solo' });
  }, [coachCodeInput, coachCodeStatus?.code, coachCodeStatus?.valid, isConnected, sessionMode, token]);

  const handleEnd = useCallback(() => {
    socketService.endSession();
  }, []);

  const handleGenerateCoachCode = useCallback(() => {
    if (!isConnected && token) socketService.connect(token);
    socketService.createCoachSessionCode();
  }, [isConnected, token]);

  const handleModeChange = useCallback((mode) => {
    setSessionMode(mode);
    if (mode === 'solo') {
      setCoachCodeInput('');
      setCoachCodeStatus(null);
      setSelectedCoach(null);
    }
  }, [setCoachCodeStatus, setSelectedCoach]);

  const handleSelectCoach = useCallback((coach) => {
    setSelectedCoach(coach);
    setCoachCodeStatus(null);
    setSessionMode('with_coach');
    setCoachCodeInput('');
    if (coach?.uid) {
      socketService.requestCoachCode(coach.uid);
    }
  }, [setCoachCodeStatus, setSelectedCoach]);

  const chatPartner = isCoach ? activeAthlete : selectedCoach;
  const chatThread = useMemo(() => {
    if (!chatPartner?.uid) return [];
    return chatMessages.filter((message) =>
      message.fromUid === chatPartner.uid || message.toUid === chatPartner.uid);
  }, [chatMessages, chatPartner?.uid]);

  const isReady = isCoach ? isConnected : poseReady && isConnected;

  const statusLabel = isReady
    ? (isCoach ? '● Connected' : '● Ready')
    : (isCoach ? '○ Waiting…' : '○ Preparing…');
  const statusNote = isCoach
    ? (activeAthlete?.name
      ? `Streaming from ${activeAthlete.name}. Share guidance via chat.`
      : 'Waiting for an athlete to join with your coach code.')
    : (isReady
      ? 'Camera and tracking are ready. Press Start when you are.'
      : 'Please wait while the camera initialises.');
  const coachStatusText = coachCodeStatus?.valid
    ? `Coach verified: ${coachCodeStatus.coachName || selectedCoach?.name || 'Coach'}`
    : (coachCodeStatus?.message || 'Enter a coach code to confirm.');

  const handleSendChat = useCallback((event) => {
    event.preventDefault();
    if (!chatPartner?.uid) return;
    const message = chatInput.trim();
    if (!message) return;
    socketService.sendChatMessage(chatPartner.uid, message);
    setChatInput('');
  }, [chatInput, chatPartner?.uid]);

  return (
    <div className="page session-page">
      <div className="container">

        {/* ── HEADER ── */}
        <div className="session-header fade-up">
          <p className="section-label">Live Session</p>
          <h1 className="page-title" style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', marginBottom: '8px' }}>
            {isCoach
              ? (activeAthlete?.name ? `Coaching ${activeAthlete.name}` : 'Coach Live View')
              : (sessionActive ? 'Session in Progress' : 'Ready to Start')}
          </h1>
          <p className="text-secondary" style={{ maxWidth: '540px' }}>
            {isCoach
              ? (activeAthlete?.name
                ? 'Follow the live stream and message your athlete with real-time cues.'
                : 'Stay connected so the athlete stream and chat can appear instantly.')
              : (!sessionActive
                ? 'Position yourself clearly in front of the camera and press Start when ready.'
                : 'Keep your form steady. FitMon is tracking your posture and scoring each rep.')}
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
              {isCoach ? (
                <div className="camera-shell">
                  {athleteVideoFrame?.imageData ? (
                    <img
                      src={athleteVideoFrame.imageData}
                      alt="Athlete live frame"
                      className="camera-layer"
                    />
                  ) : (
                    <div className="camera-placeholder">
                      <Camera className="icon-sm" />
                      <span>Waiting for athlete video stream...</span>
                    </div>
                  )}
                  <div className="camera-gradient" />
                  <div className="camera-hud">
                    <div className="camera-chip">
                      <span>Athlete Stream</span>
                    </div>
                  </div>
                  <div className="camera-tip">
                    {activeAthlete?.name
                      ? `Connected to ${activeAthlete.name}. Watch form and share guidance.`
                      : 'Stay connected. The athlete video stream will appear once they join.'}
                  </div>
                </div>
              ) : (
                <WebcamFeed enableFrameStreaming={sessionMode === 'with_coach'} />
              )}
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
                {isCoach ? (
                  <>
                    <p className="section-label">Coach View</p>
                    <p className="text-secondary">
                      Stay connected to receive athlete streams. Share your coach code so they can start a coached session.
                    </p>
                  </>
                ) : !sessionActive ? (
                  <div style={{ marginBottom: '12px' }}>
                    <p className="section-label" style={{ marginBottom: '6px' }}>Session Type</p>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                      <button
                        type="button"
                        className={sessionMode === 'solo' ? 'btn-primary' : 'btn-secondary'}
                        onClick={() => handleModeChange('solo')}
                      >
                        Solo
                      </button>
                      <button
                        type="button"
                        className={sessionMode === 'with_coach' ? 'btn-primary' : 'btn-secondary'}
                        onClick={() => handleModeChange('with_coach')}
                      >
                        With Coach
                      </button>
                    </div>
                    {sessionMode === 'with_coach' && (
                      <>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="Enter coach session code"
                          value={coachCodeInput}
                          onChange={(event) => setCoachCodeInput(event.target.value.toUpperCase())}
                          maxLength={6}
                        />
                        {(coachCodeInput.trim() || coachCodeStatus) && (
                          <div className={`coach-code-status ${coachCodeStatus?.valid ? 'coach-code-status--valid' : 'coach-code-status--invalid'}`}>
                            {coachStatusText}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ) : null}

                <div className={`status-badge ${isReady ? 'connected' : 'disconnected'}`}>
                  {statusLabel}
                </div>
                <p className="session-control-note">
                  {statusNote}
                </p>
              </div>
              {!isCoach && (
                <div className="session-control-actions">
                  {!sessionActive ? (
                    <button
                      onClick={handleStart}
                      disabled={!poseReady || !token || (sessionMode === 'with_coach' && !coachCodeStatus?.valid)}
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
              )}
            </div>
          </div>

          {/* RIGHT — feedback + coach connect */}
          <aside className="fade-up fade-up-2 session-right">
            <FeedbackPanel />

            {!isCoach && (
              <div className="card session-coach-panel">
                <div className="session-coach-header">
                  <div>
                    <p className="section-label">Coaches</p>
                    <h2 className="section-title">Hire a coach</h2>
                    <p className="text-secondary">
                      Pick a coach to start a private chat and verify a coached session code.
                    </p>
                  </div>
                </div>

                {isLoadingCoaches ? (
                  <p className="text-secondary">Loading coaches…</p>
                ) : coachListError ? (
                  <p className="text-secondary">{coachListError}</p>
                ) : availableCoaches.length === 0 ? (
                  <p className="text-secondary">No coaches are available yet.</p>
                ) : (
                  <div className="coach-list">
                    {availableCoaches.map((coach) => {
                      const isSelected = selectedCoach?.uid === coach.uid;
                      const initials = (coach.name || 'Coach').slice(0, 1).toUpperCase();

                      return (
                        <button
                          key={coach.uid}
                          type="button"
                          className={`coach-card ${isSelected ? 'coach-card--active' : ''}`}
                          onClick={() => handleSelectCoach(coach)}
                        >
                          <div className="coach-card-main">
                            {coach.photoURL ? (
                              <img src={coach.photoURL} alt={coach.name || 'Coach'} className="coach-avatar" />
                            ) : (
                              <div className="coach-avatar coach-avatar--placeholder">{initials}</div>
                            )}
                            <div className="coach-meta">
                              <span className="coach-name">{coach.name || 'Coach'}</span>
                              <span className="coach-email">{coach.email || 'Coach account'}</span>
                            </div>
                          </div>
                          {isSelected && <span className="coach-selected">Selected</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="card session-chat-panel">
              <div className="session-chat-header">
                <div>
                  <p className="section-label">Chat</p>
                  <h2 className="section-title">
                    {chatPartner?.name ? `Chat with ${chatPartner.name}` : 'Private coach chat'}
                  </h2>
                  <p className="text-secondary">Text-only messages between you and your coach.</p>
                </div>
                <MessageSquare className="icon-sm text-accent" />
              </div>

              <div className="session-chat-body">
                {!chatPartner?.uid ? (
                  <p className="text-secondary">
                    {isCoach ? 'Waiting for an athlete to join.' : 'Select a coach to start chatting.'}
                  </p>
                ) : chatThread.length === 0 ? (
                  <p className="text-secondary">No messages yet. Say hello.</p>
                ) : (
                  chatThread.map((message) => (
                    <div
                      key={message.id}
                      className={`session-chat-message ${message.fromUid === user?.uid ? 'session-chat-message--me' : 'session-chat-message--them'}`}
                    >
                      <p>{message.message}</p>
                      <span className="session-chat-time">
                        {new Date(message.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
              </div>

              <form className="session-chat-input" onSubmit={handleSendChat}>
                <input
                  type="text"
                  className="input-field"
                  placeholder={chatPartner?.uid ? 'Type a message…' : 'Select a coach to chat'}
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  disabled={!chatPartner?.uid || !isConnected}
                  maxLength={500}
                />
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={!chatPartner?.uid || !chatInput.trim() || !isConnected}
                >
                  Send
                </button>
              </form>
            </div>
          </aside>

        </div>
      </div>
    </div>
  );
}
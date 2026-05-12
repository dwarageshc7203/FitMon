import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import jsPDF from 'jspdf';
import { firebaseApp } from '../firebase/config';
import useAuthStore from '../store/useAuthStore';
import '../index.css';

const db = firebaseApp ? getFirestore(firebaseApp) : null;

export default function History() {
  const user = useAuthStore((state) => state.user);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    async function fetchSessions() {
      if (!db || (!user?.uid && !user?.email)) {
        setLoading(false);
        return;
      }
      try {
        const sessionsRef = collection(db, 'sessions');
        const queries = [];
        if (user?.uid) queries.push(getDocs(query(sessionsRef, where('uid', '==', user.uid))));
        if (user?.email) queries.push(getDocs(query(sessionsRef, where('email', '==', user.email))));

        const snapshots = await Promise.all(queries);
        const sessionMap = new Map();
        snapshots.forEach((snap) => {
          snap.forEach((docSnap) => {
            sessionMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
          });
        });

        const data = Array.from(sessionMap.values());
        data.sort((a, b) => getSessionTimestamp(b) - getSessionTimestamp(a));
        setSessions(data);
      } catch (e) {
        console.error('Failed to fetch history', e);
      } finally {
        setLoading(false);
      }
    }
    fetchSessions();
  }, [user]);

  const getRiskLevel = (score) => {
    if (score < 25) return 'Low Risk';
    if (score < 55) return 'Moderate Risk';
    return 'High Risk';
  };

  const getRiskBadge = (score) => {
    if (score < 25) return { text: 'Low Risk', cls: 'badge-success' };
    if (score < 55) return { text: 'Moderate', cls: 'badge-warning' };
    return { text: 'High Risk', cls: 'badge-danger' };
  };

  const getSessionTimestamp = (session) => {
    const ts = session?.startedAt ?? session?.createdAt ?? session?.endedAt;
    if (!ts) return 0;
    if (typeof ts === 'number') return ts;
    if (typeof ts?.toDate === 'function') return ts.toDate().getTime();
    if (typeof ts?.seconds === 'number') return ts.seconds * 1000;
    const parsed = new Date(ts).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const filteredSessions = sessions.filter((sess) => {
    if (filter === 'All') return true;
    return getRiskLevel(sess.injuryRiskScore || 0) === filter;
  });

  const handleDownload = (session) => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 14;
    let y = 18;

    const addTitle = (text) => {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.setTextColor(25, 25, 25);
      pdf.text(text, margin, y);
      y += 10;
    };

    const addSubTitle = (text) => {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(11);
      pdf.setTextColor(90, 90, 90);
      pdf.text(text, margin, y);
      y += 8;
    };

    const addRow = (label, value) => {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(11);
      pdf.setTextColor(90, 90, 90);
      pdf.text(`${label}:`, margin, y);
      pdf.setTextColor(25, 25, 25);
      pdf.text(String(value ?? '—'), margin + 42, y);
      y += 7;
    };

    const timestamp = getSessionTimestamp(session);
    const dateLabel = timestamp
      ? new Date(timestamp).toLocaleString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric',
          hour: 'numeric', minute: '2-digit',
        })
      : '—';
    const repsCount = session.totalReps ?? (session.correctReps || 0) + (session.incorrectReps || 0);

    addTitle('FitMon Session Report');
    addSubTitle(`Session Date: ${dateLabel}`);

    addRow('Duration', formatDuration(session.duration));
    addRow('Total Reps', repsCount || 0);
    addRow('Correct Reps', session.correctReps ?? '—');
    addRow('Incorrect Reps', session.incorrectReps ?? '—');
    addRow('Posture Score', session.avgPostureScore ?? '—');
    addRow('Accuracy', session.accuracy ? `${session.accuracy}%` : '—');
    addRow('Injury Risk', session.injuryRiskScore ? `${session.injuryRiskScore}%` : '—');

    pdf.save(`fitmon-session-${new Date(timestamp || Date.now()).toISOString().split('T')[0]}.pdf`);
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '—';
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const formatDate = (ts) =>
    new Date(ts).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: '80px' }}>

      <div className="container" style={{ paddingTop: '96px', maxWidth: '960px', margin: '0 auto' }}>

        {/* Page header */}
        <div style={{ marginBottom: '32px' }}>
          <p className="section-label">History</p>
          <h1 className="page-title" style={{ fontSize: 'clamp(1.8rem, 3vw, 2.4rem)' }}>Session History</h1>
        </div>

        {/* Filter row */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', flexWrap: 'wrap' }}>
          {['All', 'Low Risk', 'Moderate Risk', 'High Risk'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={filter === f ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '8px 18px', fontSize: '0.82rem' }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '64px' }}>
            Loading your sessions...
          </div>
        ) : filteredSessions.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '20px',
          }}>
            {filteredSessions.map((sess) => {
              const badge = getRiskBadge(sess.injuryRiskScore || 0);
              const postureColor = (sess.avgPostureScore || 0) >= 70 ? 'var(--accent)' : 'var(--warning)';
              const repsCount = sess.totalReps ?? (sess.correctReps || 0) + (sess.incorrectReps || 0);
              return (
                <div key={sess.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                  {/* Top row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ color: 'var(--text)', fontWeight: 500, fontSize: '0.95rem', marginBottom: '4px' }}>
                        {formatDate(getSessionTimestamp(sess))}
                      </p>
                      <p style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>
                        Duration: {formatDuration(sess.duration)}
                      </p>
                    </div>
                    <span className={badge.cls}>{badge.text}</span>
                  </div>

                  {/* Metrics */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <p style={{ color: 'var(--muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                        Posture Score
                      </p>
                      <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.3rem', color: postureColor }}>
                        {sess.avgPostureScore || 0}
                        <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: '0.9rem' }}>/100</span>
                      </p>
                    </div>
                    <div>
                      <p style={{ color: 'var(--muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                        Reps
                      </p>
                      <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.3rem', color: 'var(--text)' }}>
                        {repsCount || 0}
                      </p>
                    </div>
                  </div>

                  {/* Download */}
                  <button
                    onClick={() => handleDownload(sess)}
                    className="btn-secondary"
                    style={{ width: '100%', padding: '10px', fontSize: '0.85rem', marginTop: 'auto' }}
                  >
                    Download PDF
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: '64px 32px' }}>
            <p style={{ color: 'var(--muted)', marginBottom: '24px' }}>
              No sessions yet. Start your first session to see your history here.
            </p>
            <Link to="/session" className="btn-primary">Start a Session</Link>
          </div>
        )}
      </div>
    </div>
  );
}
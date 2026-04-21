import { createElement } from 'react';
import { Activity, ArrowRight, BarChart3, BookOpen, Clock, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import useSessionStore from '../stores/useSessionStore';

export default function Dashboard() {
  const user = useAuthStore((state) => state.user);
  const sessionActive = useSessionStore((state) => state.sessionActive);
  const repCount = useSessionStore((state) => state.repCount);
  const postureScore = useSessionStore((state) => state.postureScore);
  const averageFsr = useSessionStore((state) => state.averageFsr);
  const engagementStatus = useSessionStore((state) => state.engagementStatus);
  const lastCompletedReport = useSessionStore((state) => state.lastCompletedReport);

  const firstName = user?.name?.split(' ')[0] || 'Trainee';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const metrics = sessionActive
    ? [
        { label: 'Reps', value: repCount, tone: 'metric-value--accent' },
        { label: 'Posture Score', value: postureScore, tone: 'metric-value--accent' },
        { label: 'Pressure', value: Math.round(averageFsr || 0), tone: 'metric-value--blue' },
        { label: 'Form Quality', value: engagementStatus || '—', tone: 'metric-value--accent' },
      ]
    : [
        { label: 'Reps', value: lastCompletedReport?.totalReps ?? '—', tone: 'metric-value--accent' },
        { label: 'Posture Score', value: lastCompletedReport?.avgPostureScore ?? '—', tone: 'metric-value--accent' },
        { label: 'Pressure', value: Math.round(lastCompletedReport?.perRepData?.at?.(-1)?.avgFsr ?? 0) || '—', tone: 'metric-value--blue' },
        { label: 'Injury Risk', value: lastCompletedReport ? `${lastCompletedReport?.injuryRiskScore ?? 0}%` : '—', tone: 'metric-value--danger' },
      ];

  return (
    <div className="dashboard-page" style={{ paddingTop: '96px' }}>
      <div className="container">

        {/* ── LIVE SESSION BANNER ── */}
        {sessionActive && (
          <section
            className="card live-banner live-session-banner fade-up"
            style={{
              background: 'var(--accent-dim)',
              borderColor: 'var(--accent-border)',
              boxShadow: 'var(--shadow-glow)',
            }}
          >
            <span
              className="live-dot"
              aria-hidden
              style={{
                background: 'var(--accent)',
                boxShadow: 'var(--shadow-glow)',
              }}
            />
            <div>
              <p style={{ color: 'var(--text)', fontWeight: 500 }}>
                Session in progress —{' '}
                <Link to="/session" style={{ color: 'var(--accent)' }}>
                  Resume Session →
                </Link>
              </p>
            </div>
          </section>
        )}

        {/* ── GREETING ── */}
        <section className="card dashboard-hero-card fade-up">
          <div className="dashboard-hero">
            <div>
              <p className="section-label">Dashboard</p>
              <h1 className="page-title" style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', marginBottom: '12px' }}>
                {greeting}, {firstName}
              </h1>
              <p className="text-secondary" style={{ maxWidth: '440px' }}>
                Keep your training consistent and watch your form improve session by session.
              </p>
            </div>
            <Link to="/session" className="btn-primary button-inline">
              {sessionActive ? 'Resume Session' : 'Start Session'}
              <ArrowRight className="icon-sm" />
            </Link>
          </div>
        </section>

        {/* ── LAST REPORT BANNER ── */}
        {lastCompletedReport && !sessionActive && (
          <section className="card report-card fade-up" style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <p className="section-label" style={{ marginBottom: '4px' }}>Last Session</p>
                <p className="text-secondary" style={{ fontSize: '0.9rem' }}>
                  Last session complete — your report is ready.
                </p>
              </div>
              <Link to="/report/latest" className="btn-secondary" style={{ padding: '8px 20px', fontSize: '0.85rem' }}>
                View Report →
              </Link>
            </div>
          </section>
        )}

        {/* ── METRICS ── */}
        <section className="card fade-up">
          <div className="section-header">
            <BarChart3 className="icon-md text-accent" />
            <h2 className="section-title">
              {sessionActive ? 'Live Session' : 'Last Session Snapshot'}
            </h2>
          </div>
          <div className="metrics-grid">
            {metrics.map((m) => (
              <div key={m.label} className="card metric-card" style={{ boxShadow: 'none' }}>
                <p className="metric-label">{m.label}</p>
                <p className={`metric-value tabular-nums ${m.tone}`}>{m.value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── QUICK ACTIONS ── */}
        <div className="dashboard-grid">
          <QuickAction
            icon={Activity}
            title="Start Session"
            desc="Begin a new workout and track your form live."
            href="/session"
            accent
          />
          <QuickAction
            icon={Clock}
            title="View History"
            desc="Review past sessions and download your reports."
            href="/history"
          />
          <QuickAction
            icon={BookOpen}
            title="My Workouts"
            desc="Explore guided routines curated for you."
            href="/workout"
          />
        </div>

        {/* ── HOW TO USE ── */}
        <section className="card fade-up">
          <div className="section-header" style={{ marginBottom: '24px' }}>
            <Shield className="icon-md text-accent" />
            <h2 className="section-title">Getting Started</h2>
          </div>
          <div className="dashboard-checklist-grid">
            {[
              { num: '01', text: 'Go to Session to begin tracking your workout.' },
              { num: '02', text: 'Follow the on-screen guidance for posture and form.' },
              { num: '03', text: 'Complete your session to generate a report.' },
              { num: '04', text: 'Check History to track your progress over time.' },
            ].map((item) => (
              <div key={item.num} className="dashboard-checklist-item" style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  color: 'var(--accent)',
                  fontSize: '0.75rem',
                  flexShrink: 0,
                  marginTop: '2px',
                }}>
                  {item.num}
                </span>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}

function QuickAction({ icon, title, desc, href, accent }) {
  return (
    <Link to={href} style={{ textDecoration: 'none' }}>
      <div className="card dashboard-card" style={{
        height: '100%',
        borderColor: accent ? 'var(--accent-border)' : 'var(--border)',
        background: accent ? 'var(--accent-dim)' : 'var(--card)',
      }}>
        <div className={`feature-icon ${accent ? 'icon-green' : 'icon-blue'}`}>
          {createElement(icon, { className: 'icon-md' })}
        </div>
        <h3 className="card-title">{title}</h3>
        <p className="text-secondary" style={{ fontSize: '0.88rem', marginTop: '8px' }}>{desc}</p>
        <div style={{ marginTop: '16px', color: accent ? 'var(--accent)' : 'var(--muted)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
          Open <ArrowRight style={{ width: '14px', height: '14px' }} />
        </div>
      </div>
    </Link>
  );
}
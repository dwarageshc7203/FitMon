import { createElement } from 'react';
import { BarChart3, ShieldCheck, Users } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';

export default function Mentor() {
  const user = useAuthStore((state) => state.user);

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
          <div className="mentor-chat">
            <MentorCard role="user" icon={Users} title="Athlete Overview" copy="Keep tabs on progress, patterns, and areas that need attention." />
            <MentorCard role="assistant" icon={BarChart3} title="Report Review" copy="Compare recent sessions and highlight the next focus areas." />
            <MentorCard role="assistant" icon={ShieldCheck} title="Trusted Space" copy="A focused workspace to keep coaching notes and guidance in one place." />
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

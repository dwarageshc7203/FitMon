import { createElement } from 'react';

export default function MentorCard({ icon, title, copy, role = 'assistant' }) {
  return (
    <div className={`chat-bubble chat-bubble--${role}`}>
      {createElement(icon, { className: 'icon-sm text-accent' })}
      <h3 className="card-title">{title}</h3>
      <p className="text-secondary">{copy}</p>
    </div>
  );
}
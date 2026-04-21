import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../services/apiClient';
import useAuthStore from '../store/useAuthStore';

const stats = [
  { value: '92%', label: 'Form clarity' },
  { value: '1.4k', label: 'Sessions analyzed' },
  { value: '120ms', label: 'Signal refresh' },
];

const features = [
  {
    title: 'Live posture guidance',
    copy: 'Confidence cues that stay visible while you move through each rep.',
    tone: 'var(--accent)',
  },
  {
    title: 'Pressure-aware feedback',
    copy: 'Pairs motion with load to surface early stress patterns.',
    tone: 'var(--blue)',
  },
  {
    title: 'Risk scoring',
    copy: 'Maps micro-errors into a single, readable safety score.',
    tone: 'var(--warning)',
  },
  {
    title: 'Session intelligence',
    copy: 'Highlights what improved, what drifted, and where to focus next.',
    tone: 'var(--accent)',
  },
  {
    title: 'Coach-ready reports',
    copy: 'Shareable summaries built for mentors and clinical partners.',
    tone: 'var(--blue)',
  },
  {
    title: 'Ready for scale',
    copy: 'Built for studios, colleges, and performance labs.',
    tone: 'var(--warning)',
  },
];

const steps = [
  { num: '01', title: 'Open a session', desc: 'Position the camera and confirm the athlete profile.' },
  { num: '02', title: 'Move with cues', desc: 'Follow posture guidance while live metrics update.' },
  { num: '03', title: 'See risk live', desc: 'Pressure and form scores respond on every rep.' },
  { num: '04', title: 'Review the report', desc: 'Export a full summary for the next workout.' },
];

const signals = [
  {
    title: 'Range consistency',
    copy: 'Detects subtle drift in elbow and shoulder alignment across sets.',
  },
  {
    title: 'Load balance',
    copy: 'Highlights pressure spikes before they become injury risk.',
  },
  {
    title: 'Tempo control',
    copy: 'Tracks speed changes that reduce quality over time.',
  },
];

const rotatingWords = ['athletes', 'gym bros', 'rehab', 'fitness'];

export default function LandingPage() {
  const user = useAuthStore((state) => state.user);
  const primaryHref = user ? '/dashboard' : '/login';
  const [scrolled, setScrolled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contactStatus, setContactStatus] = useState(null);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    organization: '',
    message: '',
  });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const waveBars = useMemo(
    () => Array.from({ length: 18 }, (_, i) => ({
      id: i,
      delay: `${i * 0.08}s`,
    })),
    []
  );

  const handleContactChange = (event) => {
    const { name, value } = event.target;
    setContactForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleContactSubmit = async (event) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const payload = {
      name: contactForm.name.trim(),
      email: contactForm.email.trim(),
      organization: contactForm.organization.trim(),
      message: contactForm.message.trim(),
    };

    if (!payload.name || !payload.email || !payload.message) {
      setContactStatus({
        type: 'error',
        message: 'Please fill in your name, email, and message.',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      setContactStatus(null);

      const response = await fetch(`${API_BASE_URL}/api/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.message || 'Unable to send your message right now.');
      }

      setContactStatus({
        type: 'success',
        message: 'Thanks! We will reach out within 24 hours.',
      });

      setContactForm({
        name: '',
        email: '',
        organization: '',
        message: '',
      });
    } catch (error) {
      setContactStatus({
        type: 'error',
        message: error.message || 'Unable to send your message right now.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="lp-root lp-light" id="top">
      <nav className={`lp-nav lp-nav--light ${scrolled ? 'lp-nav--scrolled' : ''}`}>
        <div className="lp-nav__inner">
          <div className="lp-nav__shell">
            <Link to="/" className="lp-nav__brand lp-nav__brand--pill">
              Fit<span className="lp-brand-dot">·</span>Mon
            </Link>
            <div className="lp-dock">
              <a href="#top" className="lp-dock__item">Home</a>
              <a href="#features" className="lp-dock__item">Platform</a>
              <a href="#signals" className="lp-dock__item">Signals</a>
              <a href="#contact" className="lp-dock__item">Contact</a>
            </div>
            <div className="lp-nav__cta">
              <Link to="/login" className="lp-pill">Sign in</Link>
              <Link to={primaryHref} className="lp-pill lp-pill--filled">Get started</Link>
            </div>
          </div>
        </div>
      </nav>

      <section className="lp-hero lp-hero-light">
        <div className="lp-hero-light__bg" />
        <div className="lp-hero-light__halo lp-hero-light__halo--a" />
        <div className="lp-hero-light__halo lp-hero-light__halo--b" />

        <div className="lp-container lp-hero-light__grid">
          <div className="lp-hero-light__copy">
            <div className="lp-eyebrow lp-eyebrow--light">
              <span className="lp-eyebrow__dot" />
              LIVE MOTION INTELLIGENCE
            </div>
            <h1 className="lp-hero-light__title">
              <span>Precision feedback for</span>
              <span className="lp-rotator">
                <RotatingText words={rotatingWords} />
              </span>
            </h1>
            <p className="lp-hero-light__lead">
              FitMon pairs computer vision with pressure sensing to surface risk, highlight technique drift,
              and keep every athlete moving with confidence.
            </p>
            <div className="lp-hero-light__actions">
              <Link to={primaryHref} className="lp-pill lp-pill--filled lp-pill--lg">Start a session</Link>
              <a href="#features" className="lp-pill lp-pill--outline lp-pill--lg">Explore the platform</a>
            </div>
            <div className="lp-hero-light__meta">
              <div>
                <span className="lp-hero-light__meta-label">Deployment</span>
                <span className="lp-hero-light__meta-value">Studio · Lab · University</span>
              </div>
              <div>
                <span className="lp-hero-light__meta-label">Reporting</span>
                <span className="lp-hero-light__meta-value">PDF + coach insights</span>
              </div>
            </div>
          </div>

          <div className="lp-hero-light__visual">
            <div className="lp-showcase">
              <div className="lp-showcase__panel">
                <div className="lp-showcase__head">
                  <span className="lp-chip">Live session</span>
                  <span className="lp-status">Aligned</span>
                </div>
                <div className="lp-wave">
                  {waveBars.map((bar) => (
                    <span
                      key={bar.id}
                      className="lp-wave__bar"
                      style={{ animationDelay: bar.delay }}
                    />
                  ))}
                </div>
                <div className="lp-showcase__metrics">
                  <div className="lp-metric">
                    <span className="lp-metric__value">86%</span>
                    <span className="lp-metric__label">Form</span>
                  </div>
                  <div className="lp-metric">
                    <span className="lp-metric__value">62</span>
                    <span className="lp-metric__label">Pressure</span>
                  </div>
                  <div className="lp-metric">
                    <span className="lp-metric__value">14</span>
                    <span className="lp-metric__label">Reps</span>
                  </div>
                </div>
              </div>
              <div className="lp-showcase__card">
                <p className="lp-showcase__card-label">Session highlight</p>
                <p className="lp-showcase__card-title">Shoulder alignment improved</p>
                <p className="lp-showcase__card-copy">Stability held across 4 consecutive sets.</p>
                <div className="lp-showcase__card-footer">
                  <span className="lp-chip lp-chip--muted">Report ready</span>
                  <span className="lp-showcase__card-score">Low risk</span>
                </div>
                <div className="lp-showcase__accent">
                  Risk
                  <span>12%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-band">
        <div className="lp-container lp-band__grid">
          <div className="lp-band__image">
            <img
              src="/landing/fitness-band.png"
              alt="FitMon fitness band on athlete"
              onError={(event) => {
                event.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwMCIgaGVpZ2h0PSI2MDAiIHZpZXdCb3g9IjAgMCAxMDAwIDYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMDAiIGhlaWdodD0iNjAwIiBmaWxsPSIjZWZlZWRlIi8+PHRleHQgeD0iNTAiIHk9IjMwMCIgZm9udC1mYW1pbHk9Ik1hbnJvcGUsIEFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjI4IiBmaWxsPSIjNjI2YjczIj5GaXRuZXNzIGJhbmQgaW1hZ2UgbWlzc2luZzwvdGV4dD48L3N2Zz4=';
              }}
            />
          </div>
          <div className="lp-band__copy">
            <span className="lp-section-label">FitMon band</span>
            <h2 className="lp-section__h2">Hardware that feels invisible. Data that does not.</h2>
            <p className="lp-section__sub">
              A lightweight FSR band captures load and balance in real time, paired with ESP8266 telemetry
              so the software stays focused on precision.
            </p>
            <div className="lp-band__specs">
              <div>
                <span className="lp-band__spec-label">Sensors</span>
                <span className="lp-band__spec-value">FSR array</span>
              </div>
              <div>
                <span className="lp-band__spec-label">Connectivity</span>
                <span className="lp-band__spec-value">ESP8266 + Wi-Fi</span>
              </div>
              <div>
                <span className="lp-band__spec-label">Wear</span>
                <span className="lp-band__spec-value">Flexible, sweat-safe</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-stats">
        <div className="lp-container lp-stats__grid">
          {stats.map((stat) => (
            <div key={stat.label} className="lp-stat">
              <div className="lp-stat__val">{stat.value}</div>
              <div className="lp-stat__lbl">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="lp-section lp-section--tint">
        <div className="lp-container">
          <span className="lp-section-label">Platform</span>
          <h2 className="lp-section__h2">
            Professional insight for every <em>training decision</em>.
          </h2>
          <p className="lp-section__sub">
            Designed for performance teams who need clear, high signal data without adding friction to the workout.
          </p>
          <div className="lp-features-grid">
            {features.map((feature) => (
              <div key={feature.title} className="lp-feature-card">
                <div className="lp-feature-card__icon" style={{ '--feature-tone': feature.tone }}>
                  <span>{feature.title.slice(0, 1)}</span>
                </div>
                <div className="lp-feature-card__title">{feature.title}</div>
                <div className="lp-feature-card__copy">{feature.copy}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="signals" className="lp-section lp-signal">
        <div className="lp-container lp-signal__grid">
          <div className="lp-signal__copy">
            <span className="lp-section-label">Signals</span>
            <h2 className="lp-section__h2">Make risk visible before it builds.</h2>
            <p className="lp-section__sub">
              FitMon separates safe effort from risky compensation by tracking subtle changes in form, tempo,
              and pressure distribution.
            </p>
            <div className="lp-hero-light__actions">
              <Link to={primaryHref} className="lp-pill lp-pill--filled">See it live</Link>
              <a href="#contact" className="lp-pill lp-pill--outline">Talk to a specialist</a>
            </div>
          </div>
          <div className="lp-signal__list">
            {signals.map((signal) => (
              <div key={signal.title} className="lp-signal__card">
                <div className="lp-signal__card-title">{signal.title}</div>
                <div className="lp-signal__card-copy">{signal.copy}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="lp-section lp-how">
        <div className="lp-container">
          <span className="lp-section-label">How it works</span>
          <h2 className="lp-section__h2">
            From setup to report in <em>four clear steps</em>.
          </h2>
          <p className="lp-section__sub">
            FitMon keeps the workflow focused so athletes stay engaged and coaches get the insight they need.
          </p>
          <div className="lp-steps">
            {steps.map((step) => (
              <div key={step.num} className="lp-step">
                <div className="lp-step__num">{step.num}</div>
                <div className="lp-step__title">{step.title}</div>
                <div className="lp-step__desc">{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-cta-section">
        <div className="lp-container">
          <div className="lp-cta-card">
            <div className="lp-cta-card__glow" />
            <div className="lp-cta-card__content">
              <h2 className="lp-cta-card__h2">Make every rep count with FitMon.</h2>
              <p className="lp-cta-card__sub">
                Start a session in minutes and deliver professional-grade feedback with no extra hardware.
              </p>
              <div className="lp-hero-light__actions">
                <Link to={primaryHref} className="lp-pill lp-pill--filled lp-pill--lg">Start now</Link>
                <a href="#contact" className="lp-pill lp-pill--outline lp-pill--lg">Book a demo</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="lp-section">
        <div className="lp-container lp-contact">
          <div className="lp-contact__left">
            <span className="lp-section-label">Contact</span>
            <h2 className="lp-section__h2">Design your next training cycle with us.</h2>
            <p className="lp-section__sub">
              Tell us about your program, the athletes you support, and the data you want to deliver every day.
            </p>
            <div className="lp-hero-light__meta">
              <div>
                <span className="lp-hero-light__meta-label">Response time</span>
                <span className="lp-hero-light__meta-value">Under 24 hours</span>
              </div>
              <div>
                <span className="lp-hero-light__meta-label">Coverage</span>
                <span className="lp-hero-light__meta-value">Global teams</span>
              </div>
            </div>
          </div>
          <form className="lp-contact__form-card" onSubmit={handleContactSubmit}>
            <div className="lp-form-field">
              <label className="lp-form-label">Name</label>
              <input
                className="lp-input"
                name="name"
                placeholder="Your name"
                value={contactForm.name}
                onChange={handleContactChange}
                required
              />
            </div>
            <div className="lp-form-field">
              <label className="lp-form-label">Email</label>
              <input
                className="lp-input"
                type="email"
                name="email"
                placeholder="you@email.com"
                value={contactForm.email}
                onChange={handleContactChange}
                required
              />
            </div>
            <div className="lp-form-field">
              <label className="lp-form-label">Organization</label>
              <input
                className="lp-input"
                name="organization"
                placeholder="Training studio or team"
                value={contactForm.organization}
                onChange={handleContactChange}
              />
            </div>
            <div className="lp-form-field">
              <label className="lp-form-label">Message</label>
              <textarea
                className="lp-input lp-textarea"
                rows="4"
                name="message"
                placeholder="How can FitMon help?"
                value={contactForm.message}
                onChange={handleContactChange}
                required
              />
            </div>
            {contactStatus && (
              <div
                className={`lp-form-status lp-form-status--${contactStatus.type}`}
                role="status"
                aria-live="polite"
              >
                {contactStatus.message}
              </div>
            )}
            <button type="submit" className="lp-pill lp-pill--filled" disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Send message'}
            </button>
          </form>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-container lp-footer__inner">
          <span className="lp-nav__brand">
            Fit<span className="lp-brand-dot">·</span>Mon
          </span>
          <span className="lp-footer__copy">© {new Date().getFullYear()} FitMon. All rights reserved.</span>
          <div className="lp-footer__links">
            <a href="#top" className="lp-nav__link">Home</a>
            <a href="#features" className="lp-nav__link">Platform</a>
            <a href="#contact" className="lp-nav__link">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function RotatingText({ words }) {
  const [index, setIndex] = useState(0);
  const maxLen = Math.max(...words.map((word) => word.length));

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, 2200);
    return () => clearInterval(timer);
  }, [words.length]);

  return (
    <span className="lp-rotator__wrap" style={{ minWidth: `${maxLen + 1}ch` }}>
      {words.map((word, idx) => (
        <span
          key={word}
          className={`lp-rotator__word ${idx === index ? 'lp-rotator__word--active' : ''}`}
        >
          {word}
        </span>
      ))}
    </span>
  );
}

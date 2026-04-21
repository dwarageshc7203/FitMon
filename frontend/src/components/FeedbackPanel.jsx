import { useEffect, useState } from 'react';
import { Gauge, Target, Zap, AlertTriangle, TrendingUp, Shield } from 'lucide-react';
import useSessionStore from '../stores/useSessionStore';
import { maybeSpeak } from '../services/voiceService';

export default function FeedbackPanel() {
  const repCount = useSessionStore((s) => s.repCount);
  const angle = useSessionStore((s) => s.angle);
  const postureScore = useSessionStore((s) => s.postureScore);
  const elbowStability = useSessionStore((s) => s.elbowStability);
  const smoothness = useSessionStore((s) => s.smoothness);
  const averageFsr = useSessionStore((s) => s.averageFsr);
  const engagementStatus = useSessionStore((s) => s.engagementStatus);
  const riskLevel = useSessionStore((s) => s.riskLevel);
  const fatigueLevel = useSessionStore((s) => s.fatigueLevel);
  const confidenceScore = useSessionStore((s) => s.confidenceScore);
  const feedbackMessages = useSessionStore((s) => s.feedbackMessages);
  const repState = useSessionStore((s) => s.repState);
  const sessionActive = useSessionStore((s) => s.sessionActive);

  const [displayedReps, setDisplayedReps] = useState(repCount);
  const [displayedPosture, setDisplayedPosture] = useState(postureScore);
  const [displayedPressure, setDisplayedPressure] = useState(averageFsr);
  const [displayedForm, setDisplayedForm] = useState(engagementStatus);

  useEffect(() => {
    if (repCount !== displayedReps) {
      const timer = setTimeout(() => setDisplayedReps(repCount), 300);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [displayedReps, repCount]);

  useEffect(() => {
    if (postureScore !== displayedPosture) {
      const timer = setTimeout(() => setDisplayedPosture(postureScore), 300);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [displayedPosture, postureScore]);

  useEffect(() => {
    if (averageFsr !== displayedPressure) {
      const timer = setTimeout(() => setDisplayedPressure(averageFsr), 300);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [averageFsr, displayedPressure]);

  useEffect(() => {
    if (engagementStatus !== displayedForm) {
      const timer = setTimeout(() => setDisplayedForm(engagementStatus), 300);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [displayedForm, engagementStatus]);


  const getRepStateLabel = () => {
    switch (repState) {
      case 'DOWN': return 'Ready';
      case 'UP': return 'Contracted';
      case 'READY': return 'Tracking';
      case 'CURLING': return 'Curling Up';
      case 'PEAK': return 'Peak';
      case 'EXTENDING': return 'Extending';
      default: return 'Ready';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-danger';
  };

  const getConfidenceColor = (score) => {
    if (score > 75) return 'text-success';
    if (score >= 40) return 'text-warning';
    return 'text-danger';
  };

  const getEngagementLabel = (status) => {
    switch (status) {
      case 'good': return { text: 'Strong', badgeClass: 'badge-success' };
      case 'low':
      case 'low_engagement':
        return { text: 'Low', badgeClass: 'badge-warning' };
      case 'risk':
      case 'injury_risk':
        return { text: 'Risk', badgeClass: 'badge-danger' };
      case 'weak_peak': return { text: 'Weak Peak', badgeClass: 'badge-warning' };
      case 'sensor_live': return { text: 'Connected', badgeClass: 'badge-blue' };
      case 'no_sensor': return { text: 'Not Ready', badgeClass: 'badge-blue' };
      default: return { text: 'Normal', badgeClass: 'badge-blue' };
    }
  };

  const getRiskBadge = (level) => {
    switch (level) {
      case 'high': return { text: 'High Risk', badgeClass: 'badge-danger' };
      case 'moderate': return { text: 'Moderate Risk', badgeClass: 'badge-warning' };
      default: return { text: 'Low Risk', badgeClass: 'badge-success' };
    }
  };

  const getFatigueBadge = (level) => {
    switch (level) {
      case 'high': return { text: 'Fatigue High', badgeClass: 'badge-warning' };
      case 'moderate': return { text: 'Fatigue Mod', badgeClass: 'badge-warning' };
      default: return { text: 'Fatigue None', badgeClass: 'badge-success' };
    }
  };

  const getPrimaryFeedback = () => {
    const latestMessage = feedbackMessages?.[0]?.text;

    if (engagementStatus === 'injury_risk' || riskLevel === 'high') {
      return latestMessage
        ? { text: latestMessage, tone: 'danger' }
        : { text: 'High force with poor form detected. Risk of injury. Stop immediately.', tone: 'danger' };
    }

    if (fatigueLevel === 'high') {
      return { text: 'You are getting fatigued. Stop or rest to avoid injury.', tone: 'warning' };
    }

    if (fatigueLevel === 'moderate') {
      return latestMessage
        ? { text: latestMessage, tone: 'warning' }
        : { text: 'Fatigue detected. Focus on controlled reps.', tone: 'warning' };
    }

    if (latestMessage) {
      return { text: latestMessage, tone: engagementStatus === 'good' ? 'success' : 'warning' };
    }

    return null;
  };

  const engagement = getEngagementLabel(displayedForm);
  const riskBadge = getRiskBadge(riskLevel);
  const fatigueBadge = getFatigueBadge(fatigueLevel);
  const repsUpdating = displayedReps !== repCount;
  const postureUpdating = displayedPosture !== postureScore;
  const pressureUpdating = displayedPressure !== averageFsr;
  const formUpdating = displayedForm !== engagementStatus;
  const primaryFeedback = getPrimaryFeedback();
  const feedbackToneClass = primaryFeedback
    ? (primaryFeedback.tone === 'danger'
      ? 'text-danger'
      : primaryFeedback.tone === 'success'
        ? 'text-success'
        : 'text-warning')
    : 'text-secondary';

  useEffect(() => {
    if (!sessionActive || !primaryFeedback?.text) return;
    maybeSpeak({
      message: primaryFeedback.text,
      riskLevel,
      fatigueLevel,
      engagementStatus,
    });
  }, [sessionActive, primaryFeedback?.text, riskLevel, fatigueLevel, engagementStatus]);

  return (
    <div className="feedback-panel">
      <div className="card feedback-hero">
        <p className="feedback-label">Reps</p>
        <p className={`feedback-count tabular-nums metric-value ${repsUpdating ? 'metric-updating' : ''}`}>
          {displayedReps}
        </p>
        <p className="feedback-state text-accent">{getRepStateLabel()}</p>
      </div>

      <div className="feedback-grid">
        <div className="card feedback-card">
          <div className="feedback-row">
            <Gauge className="icon-sm text-accent" />
            <span className="feedback-card-label">Angle</span>
          </div>
          <p className="feedback-value tabular-nums">{angle}°</p>
        </div>

        <div className="card feedback-card">
          <div className="feedback-row">
            <Target className="icon-sm text-accent" />
            <span className="feedback-card-label">Posture</span>
          </div>
          <p
            className={`feedback-value tabular-nums metric-value ${getScoreColor(displayedPosture)} ${postureUpdating ? 'metric-updating' : ''}`}
          >
            {displayedPosture}
          </p>
        </div>

        <div className="card feedback-card">
          <div className="feedback-row">
            <Shield className="icon-sm text-accent" />
            <span className="feedback-card-label">Stability</span>
          </div>
          <p className={`feedback-value tabular-nums ${getScoreColor(elbowStability)}`}>{elbowStability}%</p>
        </div>

        <div className="card feedback-card">
          <div className="feedback-row">
            <TrendingUp className="icon-sm text-accent" />
            <span className="feedback-card-label">Smooth</span>
          </div>
          <p className={`feedback-value tabular-nums ${getScoreColor(smoothness)}`}>{smoothness}</p>
        </div>
      </div>

      <div className="feedback-grid">
        <div className="card feedback-card">
          <div className="feedback-row">
            <Zap className="icon-sm text-accent" />
            <span className="feedback-card-label">Pressure</span>
          </div>
          <p className={`feedback-value tabular-nums metric-value ${pressureUpdating ? 'metric-updating' : ''}`}>
            {Math.round(displayedPressure || 0)}
          </p>
        </div>

        <div className="card feedback-card">
          <div className="feedback-row feedback-row-between">
            <div className="feedback-row">
              <Zap className="icon-sm text-accent" />
              <span className="feedback-card-label">Form Quality</span>
            </div>
            <span className={`feedback-status ${engagement.badgeClass} ${formUpdating ? 'metric-updating' : ''}`}>
              {engagement.text}
            </span>
          </div>
          <div className="feedback-row">
            <span className={`feedback-status ${riskBadge.badgeClass}`}>{riskBadge.text}</span>
            <span className={`feedback-status ${fatigueBadge.badgeClass}`}>{fatigueBadge.text}</span>
          </div>
        </div>

        <div className="card feedback-card">
          <div className="feedback-row">
            <Shield className="icon-sm text-accent" />
            <span className="feedback-card-label">System Confidence</span>
          </div>
          <p className={`feedback-value tabular-nums ${getConfidenceColor(confidenceScore)}`}>
            {Math.round(confidenceScore || 0)}
          </p>
        </div>
      </div>

      {primaryFeedback && (
        <div className="card feedback-warning">
          <div className="feedback-row">
            <AlertTriangle className={`icon-sm ${feedbackToneClass}`} />
            <span className="feedback-warning-label">Feedback</span>
          </div>
          <div className="feedback-messages">
            <p className={`${feedbackToneClass} fade-up`}>
              {primaryFeedback.text}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

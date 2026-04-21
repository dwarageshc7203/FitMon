let lastSpokenAt = 0;
let lastSpokenMessage = '';
let lastFatigueSpokenAt = 0;

function normalizeText(text) {
  if (!text) return '';
  return String(text).trim().toLowerCase().replace(/\s+/g, ' ');
}

export function speak(text, options = {}) {
  if (!text || typeof window === 'undefined' || !window.speechSynthesis) {
    return;
  }

  const normalized = normalizeText(text);
  const now = Date.now();
  const elapsed = now - lastSpokenAt;
  const isDifferent = normalized !== lastSpokenMessage;

  if (!options.force && !isDifferent && elapsed < 3000) {
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;
  window.speechSynthesis.speak(utterance);

  lastSpokenAt = now;
  lastSpokenMessage = normalized;
}

export function maybeSpeak({ message, riskLevel, fatigueLevel, engagementStatus }) {
  if (!message) return;

  const normalized = normalizeText(message);
  const now = Date.now();
  const elapsed = now - lastSpokenAt;
  const isDifferent = normalized !== lastSpokenMessage;
  const isInjuryRisk = engagementStatus === 'injury_risk' || riskLevel === 'high';
  const isFatigueHigh = fatigueLevel === 'high';
  const isSpeaking = typeof window !== 'undefined' && window.speechSynthesis?.speaking;

  if (isInjuryRisk) {
    speak(message, { force: true });
    return;
  }

  if (isFatigueHigh) {
    if (now - lastFatigueSpokenAt < 5000 && !isDifferent) {
      return;
    }

    if (!isDifferent && elapsed < 3000) {
      return;
    }

    lastFatigueSpokenAt = now;
    speak(message, { force: false });
    return;
  }

  if (isSpeaking) {
    return;
  }

  if (!isDifferent && elapsed < 3000) {
    return;
  }

  speak(message, { force: false });
}

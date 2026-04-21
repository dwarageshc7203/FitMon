package com.fitmon.services;

import com.fitmon.model.FsrReading;
import com.fitmon.model.RepData;
import com.fitmon.model.SessionState;
import com.fitmon.model.SessionSummary;
import com.fitmon.model.WarningEntry;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class SessionService {
  private static final int CALIBRATION_FRAME_TARGET = 20;
  private static final int CALIBRATION_FALLBACK_BASELINE = 50;
  private static final int CALIBRATION_FALLBACK_MAX = 700;
  private static final int REP_UP_THRESHOLD = 70;
  private static final int REP_DOWN_THRESHOLD = 140;
  private static final int REP_MIN_ROM = 60;
  private static final int REP_MIN_DELTA = 8;
  private static final long REP_MIN_INTERVAL_MS = 450;
  private static final int REP_GOOD_ROM = 65;
  private static final int REP_TARGET_ROM = 100;
  private static final long REP_MIN_TEMPO_MS = 550;
  private static final long REP_MAX_TEMPO_MS = 5000;
  private static final double REP_MAX_JITTER_STDDEV = 12.0;
  private static final int REP_MIN_FORM_SCORE = 60;
  private static final Logger logger = LoggerFactory.getLogger(SessionService.class);
  private final Map<String, SessionState> sessions = new ConcurrentHashMap<>();
  private final Map<String, String> socketToSessionId = new ConcurrentHashMap<>();

  public SessionState createSession(String socketId, String uid, String email) {
    SessionState session = new SessionState(
      UUID.randomUUID().toString(),
      socketId,
      uid,
      email,
      System.currentTimeMillis()
    );
    startFsrCalibration(session);
    logger.info("Session started: id={}, uid={}", session.getId(), session.getUid());

    sessions.put(session.getId(), session);
    socketToSessionId.put(socketId, session.getId());
    return session;
  }

  public SessionState getSessionBySocket(String socketId) {
    String sessionId = socketToSessionId.get(socketId);
    if (sessionId == null) {
      return null;
    }
    return sessions.get(sessionId);
  }

  public SessionState getSessionById(String sessionId) {
    return sessions.get(sessionId);
  }

  public Collection<SessionState> getAllSessions() {
    return sessions.values();
  }

  public void updateFrame(SessionState session, Integer postureScore) {
    session.setFrameCount(session.getFrameCount() + 1);
    int safePostureScore = postureScore == null ? 0 : postureScore;
    session.setPostureScoreSum(session.getPostureScoreSum() + safePostureScore);

    if (session.getPostureHistory() == null) {
      session.setPostureHistory(new ArrayList<>());
    }
    session.getPostureHistory().add(safePostureScore);
    if (session.getPostureHistory().size() > 20) {
      session.getPostureHistory().remove(0);
    }

    int averageFsr = (int) Math.round(getAverageFsr(session));
    if (session.getFsrHistory() == null) {
      session.setFsrHistory(new ArrayList<>());
    }
    session.getFsrHistory().add(averageFsr);
    if (session.getFsrHistory().size() > 20) {
      session.getFsrHistory().remove(0);
    }

    detectFatigue(session);

    if (session.getFrameCount() % 60 == 0) {
      logger.debug("Session update: id={}, frames={}, avgFsr={}",
        session.getId(),
        session.getFrameCount(),
        averageFsr);
    }
  }

  public void addWarning(SessionState session, String warning) {
    if (warning == null || warning.isBlank()) {
      return;
    }

    if (session.getWarnings() == null) {
      session.setWarnings(new ArrayList<>());
    }

    session.getWarnings().add(new WarningEntry(warning, System.currentTimeMillis(), session.getTotalReps()));
  }

  public void updateFSR(SessionState session, int value, long timestamp) {
    long normalizedTimestamp = timestamp > 0 ? timestamp : System.currentTimeMillis();
    session.setLatestFsr(new FsrReading(value, normalizedTimestamp));
    if (session.getFsrWindow() == null) {
      session.setFsrWindow(new ArrayList<>());
    }
    session.getFsrWindow().add(new FsrReading(value, normalizedTimestamp));

    long cutoff = normalizedTimestamp - 500;
    session.getFsrWindow().removeIf((reading) -> reading.getTimestamp() < cutoff);
  }

  public void captureCalibration(SessionState session, int rawValue) {
    if (!session.isCalibratingFsr()) {
      return;
    }

    if (session.getCalibrationValues() == null) {
      session.setCalibrationValues(new ArrayList<>());
    }
    session.getCalibrationValues().add(rawValue);
    session.setCalibrationFrames(session.getCalibrationFrames() + 1);

    if (session.getCalibrationFrames() >= CALIBRATION_FRAME_TARGET) {
      completeFsrCalibration(session);
    }
  }

  private void startFsrCalibration(SessionState session) {
    session.setCalibratingFsr(true);
    session.setCalibrationFrames(0);
    if (session.getCalibrationValues() == null) {
      session.setCalibrationValues(new ArrayList<>());
    } else {
      session.getCalibrationValues().clear();
    }
  }

  private void completeFsrCalibration(SessionState session) {
    List<Integer> values = session.getCalibrationValues();
    if (values == null || values.size() < 5) {
      session.setFsrBaseline(CALIBRATION_FALLBACK_BASELINE);
      session.setFsrMax(CALIBRATION_FALLBACK_MAX);
    } else {
      List<Integer> sorted = new ArrayList<>(values);
      sorted.sort(Integer::compareTo);

      int count = Math.max(1, (int) Math.ceil(sorted.size() * 0.3));
      double baselineSum = 0;
      double maxSum = 0;

      for (int i = 0; i < count; i++) {
        baselineSum += sorted.get(i);
        maxSum += sorted.get(sorted.size() - 1 - i);
      }

      session.setFsrBaseline(baselineSum / count);
      session.setFsrMax(maxSum / count);
    }

    session.setCalibratingFsr(false);
    session.setCalibrationFrames(0);
    session.getCalibrationValues().clear();
    logger.info("FSR calibrated: baseline={}, max={}",
      Math.round(session.getFsrBaseline()),
      Math.round(session.getFsrMax()));
  }

  public double getAverageFsr(SessionState session) {
    if (session.getFsrWindow() == null) {
      session.setFsrWindow(new ArrayList<>());
    }

    if (session.getFsrWindow().isEmpty()) {
      return 0;
    }

    int sum = 0;
    for (FsrReading reading : session.getFsrWindow()) {
      sum += reading.getValue();
    }

    return sum / (double) session.getFsrWindow().size();
  }

  public RepDetectionResult detectRep(SessionState session, Integer angle, long timestamp) {
    if (angle == null) {
      return new RepDetectionResult(false, session.getRepPhase(), session.getRepMinAngle(), session.getRepMaxAngle());
    }

    if (session.getRepStartedAt() == 0 && angle > REP_DOWN_THRESHOLD) {
      beginRepTracking(session, angle, timestamp);
    }

    Integer lastAngle = session.getLastAngle();
    if (lastAngle != null && session.getRepStartedAt() > 0) {
      double delta = Math.abs(angle - lastAngle);
      session.setRepDeltaSum(session.getRepDeltaSum() + delta);
      session.setRepDeltaSumSq(session.getRepDeltaSumSq() + (delta * delta));
      session.setRepDeltaSamples(session.getRepDeltaSamples() + 1);
    }
    if (lastAngle != null && Math.abs(angle - lastAngle) < REP_MIN_DELTA) {
      session.setLastAngle(angle);
      return new RepDetectionResult(false, session.getRepPhase(), session.getRepMinAngle(), session.getRepMaxAngle());
    }

    if (session.getRepMinAngle() == null || session.getRepMaxAngle() == null) {
      session.setRepMinAngle(angle);
      session.setRepMaxAngle(angle);
    } else {
      session.setRepMinAngle(Math.min(session.getRepMinAngle(), angle));
      session.setRepMaxAngle(Math.max(session.getRepMaxAngle(), angle));
    }

    String phase = session.getRepPhase();
    if (phase == null) {
      phase = angle > REP_DOWN_THRESHOLD ? "DOWN" : "UP";
    }

    boolean repCompleted = false;
    if ("DOWN".equals(phase) && angle < REP_UP_THRESHOLD) {
      int rom = session.getRepMaxAngle() - session.getRepMinAngle();
      long sinceLastRep = timestamp - session.getLastRepAt();
      if (rom >= REP_MIN_ROM && sinceLastRep >= REP_MIN_INTERVAL_MS) {
        repCompleted = true;
        session.setLastRepAt(timestamp);
        phase = "UP";
      }
    } else if ("UP".equals(phase) && angle > REP_DOWN_THRESHOLD) {
      phase = "DOWN";
      beginRepTracking(session, angle, timestamp);
    }

    session.setRepPhase(phase);
    session.setLastAngle(angle);

    return new RepDetectionResult(repCompleted, phase, session.getRepMinAngle(), session.getRepMaxAngle());
  }

  public record RepDetectionResult(boolean repCompleted, String repPhase, Integer minAngle, Integer maxAngle) {}

  public RepQualityResult evaluateRepQuality(SessionState session, RepDetectionResult repDetection, long timestamp) {
    int minAngle = repDetection.minAngle() != null ? repDetection.minAngle() : 180;
    int maxAngle = repDetection.maxAngle() != null ? repDetection.maxAngle() : 0;
    int rom = Math.max(0, maxAngle - minAngle);

    long repStart = session.getRepStartedAt();
    long duration = repStart > 0 ? Math.max(1, timestamp - repStart) : (REP_MAX_TEMPO_MS + 1);

    int romScore = (int) Math.round(Math.min(1.0, rom / (double) REP_TARGET_ROM) * 45);

    double jitterStdDev = computeJitterStdDev(session);
    int stabilityScore = jitterStdDev <= REP_MAX_JITTER_STDDEV
      ? 30
      : Math.max(10, (int) Math.round(30 - ((jitterStdDev - REP_MAX_JITTER_STDDEV) * 2)));

    int tempoScore;
    if (duration < REP_MIN_TEMPO_MS) {
      tempoScore = 18;
    } else if (duration > REP_MAX_TEMPO_MS) {
      tempoScore = 18;
    } else {
      tempoScore = 25;
    }

    int formScore = Math.max(0, Math.min(100, romScore + stabilityScore + tempoScore));
    boolean isCorrect = formScore >= REP_MIN_FORM_SCORE && rom >= REP_GOOD_ROM;

    List<String> reasons = new ArrayList<>();
    if (rom < REP_GOOD_ROM) {
      reasons.add("Increase range of motion on each rep.");
    }
    if (duration < REP_MIN_TEMPO_MS) {
      reasons.add("Slow down and control the tempo.");
    } else if (duration > REP_MAX_TEMPO_MS) {
      reasons.add("Speed up slightly to keep tempo consistent.");
    }
    if (jitterStdDev > REP_MAX_JITTER_STDDEV) {
      reasons.add("Reduce wobble and keep movement smooth.");
    }

    return new RepQualityResult(isCorrect, formScore, reasons, duration, rom);
  }

  public record RepQualityResult(boolean isCorrect, int formScore, List<String> feedback, long durationMs, int rom) {}

  public void finalizeRepTracking(SessionState session) {
    endRepTracking(session);
  }

  private void beginRepTracking(SessionState session, int angle, long timestamp) {
    session.setRepStartedAt(timestamp);
    session.setRepMinAngle(angle);
    session.setRepMaxAngle(angle);
    session.setRepDeltaSum(0);
    session.setRepDeltaSumSq(0);
    session.setRepDeltaSamples(0);
  }

  private void endRepTracking(SessionState session) {
    session.setRepStartedAt(0);
    session.setRepDeltaSum(0);
    session.setRepDeltaSumSq(0);
    session.setRepDeltaSamples(0);
  }

  private double computeJitterStdDev(SessionState session) {
    int samples = session.getRepDeltaSamples();
    if (samples <= 1) {
      return 0;
    }

    double mean = session.getRepDeltaSum() / samples;
    double variance = (session.getRepDeltaSumSq() / samples) - (mean * mean);
    return Math.sqrt(Math.max(0, variance));
  }

  private void detectFatigue(SessionState session) {
    int postureSize = session.getPostureHistory().size();
    int fsrSize = session.getFsrHistory().size();
    int minSize = Math.min(postureSize, fsrSize);

    if (minSize < 10) {
      session.setFatigueLevel("none");
      return;
    }

    int postureTrend = session.getPostureHistory().get(postureSize - 1) - session.getPostureHistory().get(0);
    int fsrTrend = session.getFsrHistory().get(fsrSize - 1) - session.getFsrHistory().get(0);

    if (postureTrend < -12 && fsrTrend < -12) {
      session.setFatigueLevel("high");
    } else if (postureTrend < -6 || fsrTrend < -6) {
      session.setFatigueLevel("moderate");
    } else {
      session.setFatigueLevel("none");
    }
  }

  public void recordRep(SessionState session, RepData repData, boolean repCorrect) {
    session.setTotalReps(session.getTotalReps() + 1);

    if (repCorrect) {
      session.setCorrectReps(session.getCorrectReps() + 1);
    } else {
      session.setIncorrectReps(session.getIncorrectReps() + 1);
    }

    repData.setRepNumber(session.getTotalReps());
    repData.setCorrect(repCorrect);
    session.getPerRepData().add(repData);
  }

  public SessionSummary summarizeSession(SessionState session) {
    int avgPostureScore = session.getFrameCount() > 0
      ? Math.round(session.getPostureScoreSum() / (float) session.getFrameCount())
      : 0;

    int accuracy = session.getTotalReps() > 0
      ? Math.round((session.getCorrectReps() / (float) session.getTotalReps()) * 100)
      : 0;

    int injuryRiskScore = session.getTotalReps() > 0
      ? Math.min(100, Math.round((session.getInjuryRiskEvents() / (float) session.getTotalReps()) * 100))
      : 0;

    SessionSummary summary = new SessionSummary();
    summary.setSessionId(session.getId());
    summary.setUid(session.getUid());
    summary.setEmail(session.getEmail());
    summary.setStartedAt(session.getStartedAt());
    summary.setEndedAt(System.currentTimeMillis());
    summary.setDuration(Math.round((summary.getEndedAt() - session.getStartedAt()) / 1000.0f));
    summary.setTotalReps(session.getTotalReps());
    summary.setCorrectReps(session.getCorrectReps());
    summary.setIncorrectReps(session.getIncorrectReps());
    summary.setAccuracy(accuracy);
    summary.setAvgPostureScore(avgPostureScore);
    summary.setIneffectiveReps(session.getIneffectiveReps());
    summary.setInjuryRiskScore(injuryRiskScore);
    summary.setWarnings(new ArrayList<>(session.getWarnings()));
    summary.setPerRepData(new ArrayList<>(session.getPerRepData()));
    logger.info("Session ended: id={}, totalReps={}, accuracy={}%, duration={}s",
      session.getId(),
      session.getTotalReps(),
      summary.getAccuracy(),
      summary.getDuration());
    return summary;
  }

  public void deleteSession(String sessionId) {
    SessionState session = sessions.remove(sessionId);
    if (session != null) {
      socketToSessionId.remove(session.getSocketId());
    }
  }
}

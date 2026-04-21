package com.fitmon.services;

import com.fitmon.model.FsrReading;
import com.fitmon.model.FusionResult;
import com.fitmon.model.SessionState;
import com.fitmon.socket.CvResultsPayload;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class FusionService {
  private final SessionService sessionService;

  public FusionService(SessionService sessionService) {
    this.sessionService = sessionService;
  }

  public FusionResult analyzeFusion(SessionState session, CvResultsPayload cvPayload) {
    int cvScore = Math.max(0, Math.min(100, Math.round(
      cvPayload.getPostureScore() != null ? cvPayload.getPostureScore() :
        (cvPayload.getFormScore() != null ? cvPayload.getFormScore() : 0)
    )));

    double averageFsr = sessionService.getAverageFsr(session);
    int fsrScore = computeFsrScore(averageFsr);
    double cvConfidence = computeCvConfidence(cvPayload);
    double fsrConfidence = computeFsrConfidence(session);
    double confidenceTotal = cvConfidence + fsrConfidence;
    double dynamicWeightCv = confidenceTotal > 0 ? cvConfidence / confidenceTotal : 0.5;
    double dynamicWeightFsr = confidenceTotal > 0 ? fsrConfidence / confidenceTotal : 0.5;
    double combinedConfidence = clamp((cvConfidence * dynamicWeightCv) + (fsrConfidence * dynamicWeightFsr), 0.0, 1.0);
    String engagementStatus = "normal";
    String fatigueLevel = session.getFatigueLevel();
    if (fatigueLevel == null || fatigueLevel.isBlank()) {
      fatigueLevel = "none";
    }
    var alerts = new ArrayList<String>();

    if (session.getFsrWindow().isEmpty()) {
      engagementStatus = "no_sensor";
    } else if (cvScore >= 70 && fsrScore < 30) {
      engagementStatus = "low_engagement";
      if (Boolean.TRUE.equals(cvPayload.getRepCompleted())) {
        session.setIneffectiveReps(session.getIneffectiveReps() + 1);
      }
      alerts.add("Good motion detected, but sensor engagement is low. Squeeze harder at peak contraction.");
    } else if (cvScore < 45 && fsrScore > 50) {
      engagementStatus = "injury_risk";
      session.setInjuryRiskEvents(session.getInjuryRiskEvents() + 1);
      alerts.add("High force with weak curl mechanics detected. Reduce load and stabilize the elbow.");
    } else if (cvScore >= 70 && fsrScore >= 60) {
      engagementStatus = "good";
    }

    if ("UP".equals(cvPayload.getRepState()) && !session.getFsrWindow().isEmpty() && averageFsr < 350) {
      alerts.add("Peak contraction looks soft. Hold and squeeze at the top of the curl.");
    }

    boolean injuryRisk = applyInjuryRisk(cvScore, fsrScore, session, alerts);
    if (injuryRisk) {
      engagementStatus = "injury_risk";
    }

    if (!injuryRisk) {
      applyFatigueFeedback(session, cvScore, alerts);

      if (cvScore < 60 || fsrScore < 20) {
        alerts.add("Your form or engagement is suboptimal. Adjust before continuing.");
      }
    }

    FusionResult result = new FusionResult();
    result.setCvScore(cvScore);
    result.setFsrScore(fsrScore);
    result.setEngagementStatus(engagementStatus);
    result.setAverageFsr((int) Math.round(averageFsr));
    result.setAlerts(alerts);
    // Confidence-weighted fusion reduces the impact of noisy sources.
    result.setFusionScore((int) Math.round((cvScore * dynamicWeightCv) + (fsrScore * dynamicWeightFsr)));
    result.setConfidenceScore((int) Math.round(combinedConfidence * 100));
    result.setFatigueLevel(fatigueLevel);
    result.setRiskLevel(resolveRiskLevel(injuryRisk, cvScore, fsrScore));
    return result;
  }

  private String resolveRiskLevel(boolean injuryRisk, int cvScore, int fsrScore) {
    if (injuryRisk) {
      return "high";
    }

    if (cvScore < 60 || fsrScore < 30) {
      return "moderate";
    }

    return "low";
  }

  private double computeCvConfidence(CvResultsPayload cvPayload) {
    if (cvPayload == null) {
      return 0.2;
    }

    Double visibilityScore = cvPayload.getVisibilityScore();
    if (visibilityScore != null) {
      return clamp(visibilityScore, 0.1, 1.0);
    }

    return cvPayload.isValid() ? 0.7 : 0.15;
  }

  private double computeFsrConfidence(SessionState session) {
    List<FsrReading> window = session.getFsrWindow();
    if (window == null || window.isEmpty()) {
      return 0.15;
    }

    if (window.size() < 3) {
      return 0.55;
    }

    double mean = 0;
    for (FsrReading reading : window) {
      mean += reading.getValue();
    }
    mean /= window.size();

    if (mean <= 0) {
      return 0.15;
    }

    double variance = 0;
    for (FsrReading reading : window) {
      double delta = reading.getValue() - mean;
      variance += delta * delta;
    }

    double stdDev = Math.sqrt(variance / window.size());
    double noiseRatio = stdDev / mean;
    double confidence = 1.0 - Math.min(1.0, noiseRatio);
    return clamp(confidence, 0.1, 1.0);
  }

  private double clamp(double value, double min, double max) {
    return Math.max(min, Math.min(max, value));
  }

  private int computeFsrScore(double averageFsr) {
    if (averageFsr <= 0) {
      return 0;
    }

    return Math.max(0, Math.min(100, (int) Math.round((averageFsr / 700.0) * 100)));
  }

  private boolean applyInjuryRisk(int cvScore, int fsrScore, SessionState session, List<String> alerts) {
    if (cvScore < 50 && fsrScore > 70) {
      session.setInjuryRiskEvents(session.getInjuryRiskEvents() + 1);
      alerts.clear();
      alerts.add("High force with poor form detected. Risk of injury. Stop immediately.");
      return true;
    }

    return false;
  }

  private void applyFatigueFeedback(SessionState session, int cvScore, List<String> alerts) {
    String fatigueLevel = session.getFatigueLevel();
    if (fatigueLevel == null || fatigueLevel.isBlank() || "none".equalsIgnoreCase(fatigueLevel)) {
      return;
    }

    if ("high".equalsIgnoreCase(fatigueLevel)) {
      alerts.clear();
      alerts.add("You are getting fatigued. Stop or rest to avoid injury.");
      if (cvScore < 60) {
        alerts.add("Fatigue is affecting your form. Stop before injury occurs.");
      }
      return;
    }

    if ("moderate".equalsIgnoreCase(fatigueLevel)) {
      alerts.add(0, "Fatigue detected. Focus on controlled reps.");
    }
  }
}

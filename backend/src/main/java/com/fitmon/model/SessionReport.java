package com.fitmon.model;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SessionReport {
  private String sessionId;
  private String uid;
  private String email;
  private long startedAt;
  private long endedAt;
  private long duration;
  private int totalReps;
  private int correctReps;
  private int incorrectReps;
  private int accuracy;
  private int avgPostureScore;
  private int ineffectiveReps;
  private int injuryRiskScore;
  private List<WarningEntry> warnings;
  private List<RepData> perRepData;
  private String firestoreId;
  private GeminiInsights insights;

  public SessionReport(SessionSummary summary) {
    this.sessionId = summary.getSessionId();
    this.uid = summary.getUid();
    this.email = summary.getEmail();
    this.startedAt = summary.getStartedAt();
    this.endedAt = summary.getEndedAt();
    this.duration = summary.getDuration();
    this.totalReps = summary.getTotalReps();
    this.correctReps = summary.getCorrectReps();
    this.incorrectReps = summary.getIncorrectReps();
    this.accuracy = summary.getAccuracy();
    this.avgPostureScore = summary.getAvgPostureScore();
    this.ineffectiveReps = summary.getIneffectiveReps();
    this.injuryRiskScore = summary.getInjuryRiskScore();
    this.warnings = summary.getWarnings();
    this.perRepData = summary.getPerRepData();
  }
}

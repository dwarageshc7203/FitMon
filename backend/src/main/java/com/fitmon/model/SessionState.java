package com.fitmon.model;

import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Builder.Default;
import lombok.Data;

@Data
@Builder
@AllArgsConstructor
public class SessionState {
  private String id;
  private String socketId;
  private String uid;
  private String email;
  private long startedAt;
  private int totalReps;
  private int correctReps;
  private int incorrectReps;
  private int postureScoreSum;
  private int frameCount;
  @Default
  private List<WarningEntry> warnings = new ArrayList<>();
  @Default
  private List<RepData> perRepData = new ArrayList<>();
  @Default
  private FsrReading latestFsr = new FsrReading(0, 0);
  @Default
  private List<FsrReading> fsrWindow = new ArrayList<>();
  @Default
  private List<Integer> postureHistory = new ArrayList<>();
  @Default
  private List<Integer> fsrHistory = new ArrayList<>();
  private int ineffectiveReps;
  private int injuryRiskEvents;
  private String fatigueLevel;
  private double fsrBaseline;
  private double fsrMax;
  private boolean calibratingFsr;
  private int calibrationFrames;
  @Default
  private List<Integer> calibrationValues = new ArrayList<>();
  private String repPhase;
  private Integer lastAngle;
  private Integer repMinAngle;
  private Integer repMaxAngle;
  private long lastRepAt;
  private long repStartedAt;
  private double repDeltaSum;
  private double repDeltaSumSq;
  private int repDeltaSamples;

  public SessionState() {
    this.warnings = new ArrayList<>();
    this.perRepData = new ArrayList<>();
    this.latestFsr = new FsrReading(0, 0);
    this.fsrWindow = new ArrayList<>();
    this.postureHistory = new ArrayList<>();
    this.fsrHistory = new ArrayList<>();
    this.calibrationValues = new ArrayList<>();
  }

  public SessionState(String id, String socketId, String uid, String email, long startedAt) {
    this();
    this.id = id;
    this.socketId = socketId;
    this.uid = uid;
    this.email = email;
    this.startedAt = startedAt;
  }

  public List<WarningEntry> getWarnings() {
    if (warnings == null) {
      warnings = new ArrayList<>();
    }
    return warnings;
  }

  public List<RepData> getPerRepData() {
    if (perRepData == null) {
      perRepData = new ArrayList<>();
    }
    return perRepData;
  }

  public List<FsrReading> getFsrWindow() {
    if (fsrWindow == null) {
      fsrWindow = new ArrayList<>();
    }
    return fsrWindow;
  }

  public List<Integer> getPostureHistory() {
    if (postureHistory == null) {
      postureHistory = new ArrayList<>();
    }
    return postureHistory;
  }

  public List<Integer> getFsrHistory() {
    if (fsrHistory == null) {
      fsrHistory = new ArrayList<>();
    }
    return fsrHistory;
  }

  public List<Integer> getCalibrationValues() {
    if (calibrationValues == null) {
      calibrationValues = new ArrayList<>();
    }
    return calibrationValues;
  }
}

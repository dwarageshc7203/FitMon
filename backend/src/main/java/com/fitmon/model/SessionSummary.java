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
public class SessionSummary {
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
}

package com.fitmon.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RepData {
  private int repNumber;
  private boolean correct;
  private Integer formScore;
  private Integer minAngle;
  private Integer maxAngle;
  private Integer peakFsr;
  private Integer avgFsr;
  private Integer fsrScore;
  private Integer fusionScore;
  private String engagementStatus;
  private long completedAt;
}

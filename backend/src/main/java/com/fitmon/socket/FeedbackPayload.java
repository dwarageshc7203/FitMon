package com.fitmon.socket;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeedbackPayload {
  private String type;
  private Integer angle;
  private Integer repCount;
  private String repState;
  private Boolean repCorrect;
  private String repQuality;
  private Integer postureScore;
  private Integer formScore;
  private Integer elbowStability;
  private Integer smoothness;
  private Integer cvScore;
  private Integer fsrScore;
  private Integer fusionScore;
  private Integer confidenceScore;
  private String engagementStatus;
  private String riskLevel;
  private String fatigueLevel;
  private List<String> feedback;
  private Integer averageFsr;
  private String message;
}

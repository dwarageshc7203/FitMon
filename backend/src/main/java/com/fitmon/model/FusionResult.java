package com.fitmon.model;

import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Builder.Default;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FusionResult {
  private int cvScore;
  private int fsrScore;
  private String engagementStatus;
  private int averageFsr;
  @Default
  private List<String> alerts = new ArrayList<>();
  private int fusionScore;
  private String riskLevel;
  private String fatigueLevel;
  private int confidenceScore;
}

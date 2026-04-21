package com.fitmon.socket;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class CvResultsPayload {
  private boolean valid;
  private Integer angle;
  private Integer repCount;
  private String repState;
  private Integer postureScore;
  private Integer formScore;
  private Integer elbowStability;
  private Integer smoothness;
  private Boolean repCompleted;
  private Boolean repCorrect;
  private Integer minAngle;
  private Integer maxAngle;
  private Double visibilityScore;
  private List<String> feedback;
}

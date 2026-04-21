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
public class GeminiInsights {
  private String summary;
  private String overallGrade;
  private List<String> improvements;
  private List<String> warnings;
  private List<String> positiveFeedback;
  private String injuryExplanation;
}

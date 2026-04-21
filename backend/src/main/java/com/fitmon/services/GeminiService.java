package com.fitmon.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitmon.config.FitMonProperties;
import com.fitmon.model.GeminiInsights;
import com.fitmon.model.SessionSummary;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

@Service
public class GeminiService {
  private final RestTemplate restTemplate;
  private final ObjectMapper objectMapper;
  private final FitMonProperties properties;

  public GeminiService(RestTemplateBuilder restTemplateBuilder, ObjectMapper objectMapper, FitMonProperties properties) {
    this.restTemplate = restTemplateBuilder.build();
    this.objectMapper = objectMapper;
    this.properties = properties;
  }

  public GeminiInsights generateSessionInsights(SessionSummary summary) {
    String apiKey = properties.getGemini().getApiKey();
    if (!StringUtils.hasText(apiKey)) {
      return defaultInsights(summary);
    }

    String model = StringUtils.hasText(properties.getGemini().getModel())
      ? properties.getGemini().getModel()
      : "gemini-2.0-flash";

    String prompt = String.join("\n",
      "You are FitMon, an expert strength coach.",
      "Create a JSON-only post-session report for a bicep curl workout.",
      "Focus on actionable suggestions, posture issues, and injury explanations.",
      "Session: " + safeJson(summary),
      "Respond with JSON containing keys: summary, overallGrade, improvements, warnings, positiveFeedback, injuryExplanation."
    );

    try {
      String url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + apiKey;
      Map<String, Object> payload = Map.of(
        "contents", List.of(
          Map.of(
            "role", "user",
            "parts", List.of(Map.of("text", prompt))
          )
        )
      );

      Map<?, ?> response = restTemplate.postForObject(url, payload, Map.class);
      String text = extractText(response);
      if (!StringUtils.hasText(text)) {
        return defaultInsights(summary);
      }

      GeminiInsights parsed = parseInsights(text);
      return parsed != null ? parsed : defaultInsights(summary);
    } catch (Exception error) {
      return defaultInsights(summary);
    }
  }

  private String extractText(Map<?, ?> response) {
    if (response == null) {
      return null;
    }

    Object candidatesObj = response.get("candidates");
    if (!(candidatesObj instanceof List<?> candidates) || candidates.isEmpty()) {
      return null;
    }

    Object candidate = candidates.get(0);
    if (!(candidate instanceof Map<?, ?> candidateMap)) {
      return null;
    }

    Object contentObj = candidateMap.get("content");
    if (!(contentObj instanceof Map<?, ?> contentMap)) {
      return null;
    }

    Object partsObj = contentMap.get("parts");
    if (!(partsObj instanceof List<?> parts) || parts.isEmpty()) {
      return null;
    }

    Object part = parts.get(0);
    if (!(part instanceof Map<?, ?> partMap)) {
      return null;
    }

    Object textObj = partMap.get("text");
    return textObj instanceof String ? (String) textObj : null;
  }

  private GeminiInsights parseInsights(String text) {
    try {
      String cleaned = stripJsonFence(text.trim());
      JsonNode node = objectMapper.readTree(cleaned);
      return objectMapper.treeToValue(node, GeminiInsights.class);
    } catch (Exception error) {
      return null;
    }
  }

  private String stripJsonFence(String text) {
    if (text.startsWith("```")) {
      int start = text.indexOf('\n');
      int end = text.lastIndexOf("```");
      if (start >= 0 && end > start) {
        return text.substring(start, end).trim();
      }
    }

    return text;
  }

  private String safeJson(SessionSummary summary) {
    try {
      return objectMapper.writeValueAsString(summary);
    } catch (Exception error) {
      return "{}";
    }
  }

  private GeminiInsights defaultInsights(SessionSummary summary) {
    GeminiInsights insights = new GeminiInsights();
    insights.setSummary(
      "You completed " + summary.getTotalReps() + " curls with " + summary.getAccuracy() +
        "% accuracy and an average posture score of " + summary.getAvgPostureScore() + "."
    );
    insights.setOverallGrade(calculateGrade(summary));

    List<String> improvements = new ArrayList<>();
    improvements.add(summary.getAvgPostureScore() < 70
      ? "Keep the elbow pinned and avoid swinging through the mid-range."
      : "Maintain the same controlled elbow path on every rep."
    );
    improvements.add(summary.getIneffectiveReps() > 0
      ? "Drive harder into peak contraction to improve engagement."
      : "Pause briefly at the top of each curl to reinforce control."
    );
    improvements.add("Aim for smooth tempo on both the concentric and eccentric phases.");
    insights.setImprovements(improvements);

    List<String> warnings = new ArrayList<>();
    if (summary.getInjuryRiskScore() > 25) {
      warnings.add("Force output exceeded movement quality on several reps. Reduce intensity and clean up mechanics.");
      insights.setInjuryExplanation("Elevated risk was triggered by strong sensor pressure arriving during low-quality movement patterns.");
    } else {
      insights.setInjuryExplanation("No major injury pattern was detected from the movement and sensor fusion data.");
    }
    insights.setWarnings(warnings);

    List<String> positives = new ArrayList<>();
    if (summary.getCorrectReps() > 0) {
      positives.add("You logged " + summary.getCorrectReps() + " technically solid reps.");
    } else {
      positives.add("You completed the full session and generated usable movement data.");
    }
    insights.setPositiveFeedback(positives);

    return insights;
  }

  private String calculateGrade(SessionSummary summary) {
    double score =
      (summary.getAccuracy() * 0.45) +
      (summary.getAvgPostureScore() * 0.35) +
      ((100 - summary.getInjuryRiskScore()) * 0.2);

    if (score >= 90) return "A";
    if (score >= 78) return "B";
    if (score >= 65) return "C";
    if (score >= 50) return "D";
    return "F";
  }
}

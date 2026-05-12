package com.fitmon.services;

import com.fitmon.model.GeminiInsights;
import com.fitmon.model.SessionReport;
import com.fitmon.model.SessionSummary;
import com.google.cloud.firestore.FieldValue;
import com.google.cloud.firestore.Firestore;
import java.util.Objects;
import org.springframework.stereotype.Service;

@Service
public class ReportService {
  private final Firestore firestore;
  private final GeminiService geminiService;
  private final UserService userService;

  public ReportService(Firestore firestore, GeminiService geminiService, UserService userService) {
    this.firestore = firestore;
    this.geminiService = geminiService;
    this.userService = userService;
  }

  public SessionReport buildSessionReport(SessionSummary summary) throws Exception {
    String firestoreId = saveSessionSummary(summary);
    userService.refreshUserStreak(summary.getUid(), summary.getEndedAt());
    GeminiInsights insights = geminiService.generateSessionInsights(summary);

    SessionReport report = new SessionReport(summary);
    report.setFirestoreId(firestoreId);
    report.setInsights(insights);
    return report;
  }

  private String saveSessionSummary(SessionSummary summary) throws Exception {
    String sessionId = Objects.requireNonNull(summary.getSessionId(), "sessionId");
    var sessionRef = firestore.collection("sessions").document(sessionId);
    var payload = new java.util.HashMap<String, Object>();
    payload.put("sessionId", summary.getSessionId());
    payload.put("uid", summary.getUid());
    payload.put("email", summary.getEmail());
    payload.put("coachUid", summary.getCoachUid());
    payload.put("coachSessionCode", summary.getCoachSessionCode());
    payload.put("startedAt", summary.getStartedAt());
    payload.put("endedAt", summary.getEndedAt());
    payload.put("duration", summary.getDuration());
    payload.put("totalReps", summary.getTotalReps());
    payload.put("correctReps", summary.getCorrectReps());
    payload.put("incorrectReps", summary.getIncorrectReps());
    payload.put("accuracy", summary.getAccuracy());
    payload.put("avgPostureScore", summary.getAvgPostureScore());
    payload.put("ineffectiveReps", summary.getIneffectiveReps());
    payload.put("injuryRiskScore", summary.getInjuryRiskScore());
    payload.put("warnings", summary.getWarnings());
    payload.put("perRepData", summary.getPerRepData());
    payload.put("createdAt", FieldValue.serverTimestamp());

    sessionRef.set(payload).get();
    return sessionRef.getId();
  }
}

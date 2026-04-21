package com.fitmon.socket;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitmon.model.FusionResult;
import com.fitmon.model.RepData;
import com.fitmon.model.SessionReport;
import com.fitmon.model.SessionState;
import com.fitmon.model.SessionSummary;
import com.fitmon.services.FusionService;
import com.fitmon.services.ReportService;
import com.fitmon.services.SessionService;
import com.google.firebase.auth.FirebaseToken;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Component
public class FitMonWebSocketHandler extends TextWebSocketHandler {
  private final ObjectMapper objectMapper;
  private final SessionService sessionService;
  private final FusionService fusionService;
  private final ReportService reportService;
  private final WebSocketSessionRegistry sessionRegistry;

  public FitMonWebSocketHandler(
    ObjectMapper objectMapper,
    SessionService sessionService,
    FusionService fusionService,
    ReportService reportService,
    WebSocketSessionRegistry sessionRegistry
  ) {
    this.objectMapper = objectMapper;
    this.sessionService = sessionService;
    this.fusionService = fusionService;
    this.reportService = reportService;
    this.sessionRegistry = sessionRegistry;
  }

  @Override
  public void afterConnectionEstablished(WebSocketSession session) {
    sessionRegistry.register(session);
  }

  @Override
  protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
    SocketEnvelope envelope = objectMapper.readValue(message.getPayload(), SocketEnvelope.class);
    if (envelope.getEvent() == null) {
      return;
    }

    switch (envelope.getEvent()) {
      case "start_session" -> handleStartSession(session);
      case "frame" -> handleFrameWarning(session);
      case "cv_results" -> handleCvResults(session, envelope);
      case "iot_data" -> handleIotData(session, envelope);
      case "end_session" -> handleEndSession(session);
      default -> {
        // Ignore unknown event
      }
    }
  }

  @Override
  public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
    SessionState existing = sessionService.getSessionBySocket(session.getId());
    if (existing != null) {
      sessionService.deleteSession(existing.getId());
    }
    sessionRegistry.remove(session);
  }

  private void handleStartSession(WebSocketSession session) throws IOException {
    SessionState existing = sessionService.getSessionBySocket(session.getId());
    if (existing != null) {
      sessionRegistry.send(session, "session_started", Map.of("sessionId", existing.getId()));
      return;
    }

    FirebaseToken token = (FirebaseToken) session.getAttributes().get("firebaseUser");
    if (token == null) {
      sendWarning(session, "Unauthorized: missing Firebase token.");
      return;
    }

    SessionState created = sessionService.createSession(
      session.getId(),
      token.getUid(),
      token.getEmail()
    );

    sessionRegistry.send(session, "session_started", Map.of("sessionId", created.getId()));
  }

  private void handleFrameWarning(WebSocketSession session) throws IOException {
    FeedbackPayload payload = new FeedbackPayload();
    payload.setType("warning");
    payload.setMessage("FitMon processes MediaPipe pose data on the client and expects cv_results events.");
    sessionRegistry.send(session, "feedback", payload);
  }

  private void handleCvResults(WebSocketSession session, SocketEnvelope envelope) throws IOException {
    CvResultsPayload payload = objectMapper.treeToValue(envelope.getData(), CvResultsPayload.class);
    SessionState state = sessionService.getSessionBySocket(session.getId());
    if (state == null || !payload.isValid()) {
      return;
    }

    sessionService.updateFrame(state, payload.getPostureScore());
    SessionService.RepDetectionResult repDetection = sessionService.detectRep(
      state,
      payload.getAngle(),
      System.currentTimeMillis()
    );
    FusionResult fusion = fusionService.analyzeFusion(state, payload);

    List<String> feedback = new ArrayList<>();
    if (payload.getFeedback() != null) {
      feedback.addAll(payload.getFeedback());
    }
    if (fusion.getAlerts() != null) {
      feedback.addAll(fusion.getAlerts());
    }

    feedback.forEach((warning) -> sessionService.addWarning(state, warning));

    boolean repCompleted = repDetection.repCompleted();
    SessionService.RepQualityResult repQuality = null;
    if (repCompleted) {
      repQuality = sessionService.evaluateRepQuality(state, repDetection, System.currentTimeMillis());
      RepData repData = new RepData();
      repData.setFormScore(repQuality != null ? repQuality.formScore() : payload.getPostureScore());
      repData.setMinAngle(payload.getMinAngle() != null ? payload.getMinAngle() : repDetection.minAngle());
      repData.setMaxAngle(payload.getMaxAngle() != null ? payload.getMaxAngle() : repDetection.maxAngle());
      repData.setAvgFsr(fusion.getAverageFsr());
      repData.setFsrScore(fusion.getFsrScore());
      repData.setFusionScore(fusion.getFusionScore());
      repData.setEngagementStatus(fusion.getEngagementStatus());
      repData.setPeakFsr(state.getLatestFsr() != null ? state.getLatestFsr().getValue() : null);
      repData.setCompletedAt(System.currentTimeMillis());

      boolean repCorrect = repQuality != null && repQuality.isCorrect();
      sessionService.recordRep(state, repData, repCorrect);
      sessionService.finalizeRepTracking(state);
      if (repQuality != null && !repQuality.isCorrect() && repQuality.feedback() != null) {
        feedback.addAll(repQuality.feedback());
      }
    }

    FeedbackPayload feedbackPayload = new FeedbackPayload();
    feedbackPayload.setType("update");
    feedbackPayload.setAngle(payload.getAngle());
    feedbackPayload.setRepCount(state.getTotalReps());
    feedbackPayload.setRepState(repDetection.repPhase() != null ? repDetection.repPhase() : payload.getRepState());
    feedbackPayload.setPostureScore(payload.getPostureScore());
    feedbackPayload.setFormScore(repQuality != null ? repQuality.formScore() : payload.getFormScore());
    feedbackPayload.setElbowStability(payload.getElbowStability());
    feedbackPayload.setSmoothness(payload.getSmoothness());
    feedbackPayload.setCvScore(fusion.getCvScore());
    feedbackPayload.setFsrScore(fusion.getFsrScore());
    feedbackPayload.setFusionScore(fusion.getFusionScore());
    feedbackPayload.setConfidenceScore(fusion.getConfidenceScore());
    feedbackPayload.setEngagementStatus(fusion.getEngagementStatus());
    feedbackPayload.setRiskLevel(fusion.getRiskLevel());
    feedbackPayload.setFatigueLevel(fusion.getFatigueLevel());
    if (repQuality != null) {
      feedbackPayload.setRepCorrect(repQuality.isCorrect());
      feedbackPayload.setRepQuality(repQuality.isCorrect() ? "GOOD" : "BAD");
    }
    feedbackPayload.setFeedback(feedback);
    feedbackPayload.setAverageFsr(fusion.getAverageFsr());

    sessionRegistry.send(session, "feedback", feedbackPayload);
  }

  private void handleIotData(WebSocketSession session, SocketEnvelope envelope) throws IOException {
    IotSocketPayload payload = objectMapper.treeToValue(envelope.getData(), IotSocketPayload.class);
    if (payload.getValue() == null) {
      return;
    }

    SessionState state = sessionService.getSessionBySocket(session.getId());
    if (state == null) {
      return;
    }

    long timestamp = payload.getTimestamp() != null ? payload.getTimestamp() : System.currentTimeMillis();
    sessionService.updateFSR(state, payload.getValue(), timestamp);
  }

  private void handleEndSession(WebSocketSession session) throws IOException {
    SessionState state = sessionService.getSessionBySocket(session.getId());
    if (state == null) {
      return;
    }

    try {
      SessionSummary summary = sessionService.summarizeSession(state);
      SessionReport report = reportService.buildSessionReport(summary);
      sessionRegistry.send(session, "session_summary", report);
    } catch (Exception error) {
      sendWarning(session, "Session ended, but report generation failed. Check backend configuration.");
    } finally {
      sessionService.deleteSession(state.getId());
    }
  }

  private void sendWarning(WebSocketSession session, String message) throws IOException {
    FeedbackPayload payload = new FeedbackPayload();
    payload.setType("warning");
    payload.setMessage(message);
    sessionRegistry.send(session, "feedback", payload);
  }
}

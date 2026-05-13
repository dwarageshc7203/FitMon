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
import com.fitmon.services.UserService;
import com.google.firebase.auth.FirebaseToken;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Component
public class FitMonWebSocketHandler extends TextWebSocketHandler {
  private static final String ROLE_COACH = "coach";
  private final ObjectMapper objectMapper;
  private final SessionService sessionService;
  private final FusionService fusionService;
  private final ReportService reportService;
  private final UserService userService;
  private final WebSocketSessionRegistry sessionRegistry;
  private final Map<String, CoachCodeEntry> coachCodeRegistry = new ConcurrentHashMap<>();
  private final Map<String, String> userSocketRegistry = new ConcurrentHashMap<>();

  public FitMonWebSocketHandler(
    ObjectMapper objectMapper,
    SessionService sessionService,
    FusionService fusionService,
    ReportService reportService,
    UserService userService,
    WebSocketSessionRegistry sessionRegistry
  ) {
    this.objectMapper = objectMapper;
    this.sessionService = sessionService;
    this.fusionService = fusionService;
    this.reportService = reportService;
    this.userService = userService;
    this.sessionRegistry = sessionRegistry;
  }

  @Override
  public void afterConnectionEstablished(WebSocketSession session) {
    sessionRegistry.register(session);
    FirebaseToken token = (FirebaseToken) session.getAttributes().get("firebaseUser");
    if (token != null && token.getUid() != null) {
      userSocketRegistry.put(token.getUid(), session.getId());
    }
  }

  @Override
  protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
    SocketEnvelope envelope = objectMapper.readValue(message.getPayload(), SocketEnvelope.class);
    if (envelope.getEvent() == null) {
      return;
    }

    switch (envelope.getEvent()) {
      case "start_session" -> handleStartSession(session, envelope);
      case "create_coach_session_code" -> handleCreateCoachSessionCode(session);
      case "validate_coach_code" -> handleValidateCoachCode(session, envelope);
      case "request_coach_code" -> handleRequestCoachCode(session, envelope);
      case "frame" -> handleFrameWarning(session);
      case "cv_results" -> handleCvResults(session, envelope);
      case "video_frame" -> handleVideoFrame(session, envelope);
      case "iot_data" -> handleIotData(session, envelope);
      case "chat_message" -> handleChatMessage(session, envelope);
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
    FirebaseToken token = (FirebaseToken) session.getAttributes().get("firebaseUser");
    if (token != null && token.getUid() != null) {
      String activeSessionId = userSocketRegistry.get(token.getUid());
      if (session.getId().equals(activeSessionId)) {
        userSocketRegistry.remove(token.getUid());
      }
    }
    coachCodeRegistry.entrySet().removeIf((entry) -> session.getId().equals(entry.getValue().coachSocketId()));
    sessionRegistry.remove(session);
  }

  private void handleStartSession(WebSocketSession session, SocketEnvelope envelope) throws Exception {
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

    StartSessionRequest request = envelope.getData() == null
      ? new StartSessionRequest()
      : objectMapper.treeToValue(envelope.getData(), StartSessionRequest.class);

    String mode = request.mode != null ? request.mode.trim().toLowerCase() : "solo";
    boolean coachedMode = mode.equals("coach") || mode.equals("with_coach");
    String coachUid = null;
    String coachCode = null;

    if (coachedMode) {
      coachCode = request.coachCode != null ? request.coachCode.trim().toUpperCase() : "";
      if (coachCode.isBlank()) {
        sendWarning(session, "Enter a valid coach session code to join with a coach.");
        return;
      }

      CoachCodeEntry coachCodeEntry = coachCodeRegistry.get(coachCode);
      if (coachCodeEntry == null) {
        sendWarning(session, "Coach session code is invalid or expired.");
        return;
      }

      coachUid = coachCodeEntry.coachUid();
      if (Objects.equals(coachUid, token.getUid())) {
        sendWarning(session, "Coach cannot join their own coached code as athlete.");
        return;
      }
    }

    SessionState created = sessionService.createSession(
      session.getId(),
      token.getUid(),
      token.getEmail(),
      coachUid,
      coachCode,
      coachedMode ? "with_coach" : "solo"
    );

    var sessionStartedPayload = new java.util.HashMap<String, Object>();
    sessionStartedPayload.put("sessionId", created.getId());
    sessionStartedPayload.put("mode", created.getSessionMode());
    if (created.getCoachUid() != null && !created.getCoachUid().isBlank()) {
      sessionStartedPayload.put("coachUid", created.getCoachUid());
      try {
        Map<String, Object> coachSummary = userService.getUserSummary(created.getCoachUid());
        sessionStartedPayload.put("coach", coachSummary);
      } catch (Exception ignored) {
        // coach summary is optional
      }
    }
    sessionRegistry.send(session, "session_started", sessionStartedPayload);

    if (created.getCoachUid() != null && !created.getCoachUid().isBlank()) {
      String coachSocketId = userSocketRegistry.get(created.getCoachUid());
      if (coachSocketId != null) {
        try {
          Map<String, Object> athleteSummary = userService.getUserSummary(token.getUid());
          Map<String, Object> payload = new java.util.HashMap<>();
          payload.put("sessionId", created.getId());
          payload.put("athleteUid", token.getUid());
          payload.put("athleteName", athleteSummary.getOrDefault("name", "Athlete"));
          payload.put("athleteEmail", athleteSummary.getOrDefault("email", ""));
          payload.put("athletePhotoURL", athleteSummary.getOrDefault("photoURL", ""));
          sessionRegistry.sendToSessionId(coachSocketId, "coach_session_joined", payload);
        } catch (Exception ignored) {
          // ignore summary errors
        }
      }
    }
  }

  private void handleCreateCoachSessionCode(WebSocketSession session) throws Exception {
    FirebaseToken token = (FirebaseToken) session.getAttributes().get("firebaseUser");
    if (token == null || token.getUid() == null) {
      sendWarning(session, "Unauthorized: missing Firebase token.");
      return;
    }

    String role = userService.getNormalizedUserRole(token.getUid());
    if (!ROLE_COACH.equals(role)) {
      sendWarning(session, "Only Coach accounts can generate coach session codes.");
      return;
    }

    coachCodeRegistry.entrySet().removeIf((entry) -> token.getUid().equals(entry.getValue().coachUid()));
    String code = generateCoachCode();
    coachCodeRegistry.put(
      code,
      new CoachCodeEntry(code, token.getUid(), token.getEmail(), session.getId(), System.currentTimeMillis())
    );

    sessionRegistry.send(session, "coach_session_code", Map.of("code", code));
  }

  private void handleValidateCoachCode(WebSocketSession session, SocketEnvelope envelope) throws IOException {
    CoachLookupPayload payload = envelope.getData() == null
      ? new CoachLookupPayload()
      : objectMapper.treeToValue(envelope.getData(), CoachLookupPayload.class);
    String code = payload != null && payload.code != null ? payload.code.trim().toUpperCase() : "";

    if (code.isBlank()) {
      sendCoachCodeStatus(session, code, false, "Enter a valid coach session code.", null);
      return;
    }

    CoachCodeEntry entry = coachCodeRegistry.get(code);
    if (entry == null) {
      sendCoachCodeStatus(session, code, false, "Coach session code is invalid or expired.", null);
      return;
    }

    sendCoachCodeStatus(session, code, true, null, entry);
  }

  private void handleRequestCoachCode(WebSocketSession session, SocketEnvelope envelope) throws IOException {
    CoachLookupPayload payload = envelope.getData() == null
      ? new CoachLookupPayload()
      : objectMapper.treeToValue(envelope.getData(), CoachLookupPayload.class);
    String coachUid = payload != null ? payload.coachUid : null;

    if (coachUid == null || coachUid.isBlank()) {
      sendCoachCodeStatus(session, "", false, "Missing coach selection.", null);
      return;
    }

    CoachCodeEntry entry = findCoachCodeByCoachUid(coachUid);
    if (entry == null) {
      sendCoachCodeStatus(session, "", false, "Coach has not shared a session code yet.", null);
      return;
    }

    sendCoachCodeStatus(session, entry.code(), true, null, entry);
  }

  private void handleChatMessage(WebSocketSession session, SocketEnvelope envelope) throws IOException {
    FirebaseToken token = (FirebaseToken) session.getAttributes().get("firebaseUser");
    if (token == null || token.getUid() == null) {
      sendWarning(session, "Unauthorized: missing Firebase token.");
      return;
    }

    ChatMessagePayload payload = envelope.getData() == null
      ? new ChatMessagePayload()
      : objectMapper.treeToValue(envelope.getData(), ChatMessagePayload.class);
    String toUid = payload != null ? payload.toUid : null;
    String message = payload != null ? payload.message : null;

    if (toUid == null || toUid.isBlank() || message == null) {
      sendWarning(session, "Missing chat recipient or message.");
      return;
    }

    String trimmed = message.trim();
    if (trimmed.isBlank()) {
      return;
    }

    if (trimmed.length() > 500) {
      trimmed = trimmed.substring(0, 500);
    }

    long timestamp = payload != null && payload.timestamp != null ? payload.timestamp : System.currentTimeMillis();
    Map<String, Object> relay = new java.util.HashMap<>();
    relay.put("fromUid", token.getUid());
    relay.put("toUid", toUid);
    relay.put("message", trimmed);
    relay.put("timestamp", timestamp);

    sessionRegistry.send(session, "chat_message", relay);
    String targetSocketId = userSocketRegistry.get(toUid);
    if (targetSocketId != null && !targetSocketId.equals(session.getId())) {
      sessionRegistry.sendToSessionId(targetSocketId, "chat_message", relay);
    }
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

  private void handleVideoFrame(WebSocketSession session, SocketEnvelope envelope) throws IOException {
    SessionState state = sessionService.getSessionBySocket(session.getId());
    if (state == null || state.getCoachUid() == null || state.getCoachUid().isBlank()) {
      return;
    }

    VideoFramePayload payload = objectMapper.treeToValue(envelope.getData(), VideoFramePayload.class);
    if (payload == null || payload.imageData == null || payload.imageData.isBlank()) {
      return;
    }

    String coachSocketId = userSocketRegistry.get(state.getCoachUid());
    if (coachSocketId == null || coachSocketId.isBlank()) {
      return;
    }

    var relay = new java.util.HashMap<String, Object>();
    relay.put("sessionId", state.getId());
    relay.put("athleteUid", state.getUid());
    relay.put("timestamp", payload.timestamp != null ? payload.timestamp : System.currentTimeMillis());
    relay.put("imageData", payload.imageData);
    sessionRegistry.sendToSessionId(coachSocketId, "athlete_video_frame", relay);
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
      if (report.getCoachUid() != null && !report.getCoachUid().isBlank()) {
        String coachSocketId = userSocketRegistry.get(report.getCoachUid());
        if (coachSocketId != null) {
          sessionRegistry.sendToSessionId(coachSocketId, "coached_session_report", report);
        }
      }
    } catch (Exception error) {
      sendWarning(session, "Session ended, but report generation failed. Check backend configuration.");
    } finally {
      sessionService.deleteSession(state.getId());
    }
  }

  private void sendCoachCodeStatus(
    WebSocketSession session,
    String code,
    boolean valid,
    String message,
    CoachCodeEntry entry
  ) throws IOException {
    Map<String, Object> payload = new java.util.HashMap<>();
    payload.put("valid", valid);
    payload.put("code", code);
    if (message != null) {
      payload.put("message", message);
    }

    if (entry != null) {
      payload.put("coachUid", entry.coachUid());
      payload.put("coachEmail", entry.coachEmail());
      try {
        Map<String, Object> coachSummary = userService.getUserSummary(entry.coachUid());
        payload.put("coachName", coachSummary.getOrDefault("name", entry.coachEmail()));
        payload.put("coachPhotoURL", coachSummary.getOrDefault("photoURL", ""));
      } catch (Exception ignored) {
        payload.put("coachName", entry.coachEmail());
        payload.put("coachPhotoURL", "");
      }
    }

    sessionRegistry.send(session, "coach_code_status", payload);
  }

  private CoachCodeEntry findCoachCodeByCoachUid(String coachUid) {
    if (coachUid == null || coachUid.isBlank()) {
      return null;
    }

    for (CoachCodeEntry entry : coachCodeRegistry.values()) {
      if (coachUid.equals(entry.coachUid())) {
        return entry;
      }
    }

    return null;
  }

  private String generateCoachCode() {
    String alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    String candidate;
    do {
      StringBuilder builder = new StringBuilder();
      for (int i = 0; i < 6; i++) {
        int index = ThreadLocalRandom.current().nextInt(alphabet.length());
        builder.append(alphabet.charAt(index));
      }
      candidate = builder.toString();
    } while (coachCodeRegistry.containsKey(candidate));
    return candidate;
  }

  private void sendWarning(WebSocketSession session, String message) throws IOException {
    FeedbackPayload payload = new FeedbackPayload();
    payload.setType("warning");
    payload.setMessage(message);
    sessionRegistry.send(session, "feedback", payload);
  }

  private static class StartSessionRequest {
    public String mode;
    public String coachCode;
  }

  private static class CoachLookupPayload {
    public String code;
    public String coachUid;
  }

  private static class ChatMessagePayload {
    public String toUid;
    public String message;
    public Long timestamp;
  }

  private static class VideoFramePayload {
    public String imageData;
    public Long timestamp;
  }

  private record CoachCodeEntry(
    String code,
    String coachUid,
    String coachEmail,
    String coachSocketId,
    long createdAt
  ) {}
}

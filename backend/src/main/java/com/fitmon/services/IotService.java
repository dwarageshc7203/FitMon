package com.fitmon.services;

import com.fitmon.config.FitMonProperties;
import com.fitmon.dto.IotReadingRequest;
import com.fitmon.model.SessionState;
import com.fitmon.socket.FeedbackPayload;
import com.fitmon.socket.WebSocketSessionRegistry;
import java.io.IOException;
import java.util.Collection;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

@Service
public class IotService {
  private final FitMonProperties properties;
  private final SessionService sessionService;
  private final WebSocketSessionRegistry sessionRegistry;

  public IotService(
    FitMonProperties properties,
    SessionService sessionService,
    WebSocketSessionRegistry sessionRegistry
  ) {
    this.properties = properties;
    this.sessionService = sessionService;
    this.sessionRegistry = sessionRegistry;
  }

  public ResponseEntity<?> handleReading(IotReadingRequest request, String apiKey) {
    String expectedKey = properties.getSensorApiKey();
    if (expectedKey == null) {
      expectedKey = "";
    }

    if (apiKey == null || !apiKey.equals(expectedKey)) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
        "success", false,
        "message", "Invalid API key"
      ));
    }

    if (request == null) {
      return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
        "success", false,
        "message", "A numeric value or sensor field is required"
      ));
    }

    Integer sensorValue = request.getValue() != null ? request.getValue() : request.getSensor();
    if (sensorValue == null) {
      return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
        "success", false,
        "message", "A numeric value or sensor field is required"
      ));
    }

    long timestamp = request.getTimestamp() != null ? request.getTimestamp() : System.currentTimeMillis();

    if (request.getSessionId() != null && !request.getSessionId().isBlank()) {
      SessionState session = sessionService.getSessionById(request.getSessionId());
      if (session == null) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
          "success", false,
          "message", "Session not found or already ended"
        ));
      }

      sessionService.captureCalibration(session, sensorValue);
      int normalizedValue = normalizeFsr(session, sensorValue);
      sessionService.updateFSR(session, normalizedValue, timestamp);
      emitSensorUpdate(session, normalizedValue);

      return ResponseEntity.ok(Map.of(
        "success", true,
        "message", "Sensor reading received",
        "mode", "session",
        "sessionId", request.getSessionId(),
        "timestamp", timestamp,
        "value", sensorValue
      ));
    }

    Collection<SessionState> activeSessions = sessionService.getAllSessions();
    if (activeSessions.isEmpty()) {
      return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
        "success", false,
        "message", "No active session found"
      ));
    }

    activeSessions.forEach((session) -> {
      sessionService.captureCalibration(session, sensorValue);
      int normalizedValue = normalizeFsr(session, sensorValue);
      sessionService.updateFSR(session, normalizedValue, timestamp);
      emitSensorUpdate(session, normalizedValue);
    });

    return ResponseEntity.ok(Map.of(
      "success", true,
      "message", "Sensor reading received",
      "mode", "broadcast_active_sessions",
      "activeSessions", activeSessions.size(),
      "timestamp", timestamp,
      "value", sensorValue
    ));
  }

  private void emitSensorUpdate(SessionState session, int value) {
    FeedbackPayload payload = new FeedbackPayload();
    payload.setType("sensor_update");
    payload.setAverageFsr(value);
    payload.setEngagementStatus("sensor_live");
    payload.setFeedback(java.util.List.of());

    try {
      sessionRegistry.sendToSessionId(session.getSocketId(), "feedback", payload);
    } catch (IOException ignored) {
      // ignore failed socket update
    }
  }

  private int normalizeFsr(SessionState session, int value) {
    double baseline = session.getFsrBaseline();
    double max = session.getFsrMax();

    if (max <= baseline) {
      double normalized = clamp(value / 1023.0, 0.0, 1.0);
      return (int) Math.round(normalized * 100);
    }

    if (value <= baseline) {
      return 0;
    }

    double normalized = (value - baseline) / (max - baseline);
    normalized = clamp(normalized, 0.0, 1.0);
    return (int) Math.round(normalized * 100);
  }

  private double clamp(double value, double min, double max) {
    return Math.max(min, Math.min(max, value));
  }
}

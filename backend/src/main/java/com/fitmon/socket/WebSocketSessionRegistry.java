package com.fitmon.socket;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

@Component
public class WebSocketSessionRegistry {
  private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
  private final ObjectMapper objectMapper;

  public WebSocketSessionRegistry(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  public void register(WebSocketSession session) {
    sessions.put(session.getId(), session);
  }

  public void remove(WebSocketSession session) {
    sessions.remove(session.getId());
  }

  public WebSocketSession getById(String id) {
    return sessions.get(id);
  }

  public void send(WebSocketSession session, String event, Object data) throws IOException {
    if (session == null || !session.isOpen()) {
      return;
    }

    Map<String, Object> payload = Map.of(
      "event", event,
      "data", data
    );

    String json = objectMapper.writeValueAsString(payload);
    session.sendMessage(new TextMessage(json));
  }

  public void sendToSessionId(String sessionId, String event, Object data) throws IOException {
    WebSocketSession session = sessions.get(sessionId);
    send(session, event, data);
  }
}

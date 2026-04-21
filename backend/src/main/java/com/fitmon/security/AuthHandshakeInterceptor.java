package com.fitmon.security;

import com.google.firebase.auth.FirebaseToken;
import java.net.URI;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class AuthHandshakeInterceptor implements HandshakeInterceptor {
  private final FirebaseTokenService tokenService;

  public AuthHandshakeInterceptor(FirebaseTokenService tokenService) {
    this.tokenService = tokenService;
  }

  @Override
  public boolean beforeHandshake(
    ServerHttpRequest request,
    ServerHttpResponse response,
    WebSocketHandler wsHandler,
    Map<String, Object> attributes
  ) {
    String token = extractToken(request);
    try {
      FirebaseToken decoded = tokenService.verifyToken(token);
      attributes.put("firebaseUser", decoded);
      return true;
    } catch (Exception error) {
      response.setStatusCode(HttpStatus.UNAUTHORIZED);
      return false;
    }
  }

  @Override
  public void afterHandshake(
    ServerHttpRequest request,
    ServerHttpResponse response,
    WebSocketHandler wsHandler,
    Exception exception
  ) {
    // no-op
  }

  private String extractToken(ServerHttpRequest request) {
    String authHeader = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
    String bearerToken = extractBearerToken(authHeader);
    if (bearerToken != null) {
      return bearerToken;
    }

    URI uri = request.getURI();
    String token = UriComponentsBuilder.fromUri(uri).build().getQueryParams().getFirst("token");
    return token;
  }

  private String extractBearerToken(String headerValue) {
    if (headerValue == null || headerValue.isBlank()) {
      return null;
    }

    String[] parts = headerValue.split(" ");
    if (parts.length != 2 || !"Bearer".equals(parts[0])) {
      return null;
    }

    return parts[1];
  }
}

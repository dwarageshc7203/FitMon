package com.fitmon.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.firebase.auth.FirebaseToken;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class FirebaseAuthenticationFilter extends OncePerRequestFilter {
  private final FirebaseTokenService tokenService;
  private final ObjectMapper objectMapper;

  public FirebaseAuthenticationFilter(FirebaseTokenService tokenService, ObjectMapper objectMapper) {
    this.tokenService = tokenService;
    this.objectMapper = objectMapper;
  }

  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) {
    String uri = request.getRequestURI();
    return !(
      uri.startsWith("/api/auth/") ||
      uri.startsWith("/api/users/") ||
      uri.startsWith("/api/workout/")
    );
  }

  @Override
  protected void doFilterInternal(
    HttpServletRequest request,
    HttpServletResponse response,
    FilterChain filterChain
  ) throws ServletException, IOException {
    try {
      String token = extractBearerToken(request.getHeader(HttpHeaders.AUTHORIZATION));
      FirebaseToken decodedToken = tokenService.verifyToken(token);
      UsernamePasswordAuthenticationToken authentication =
        new UsernamePasswordAuthenticationToken(decodedToken, null, null);
      SecurityContextHolder.getContext().setAuthentication(authentication);
      filterChain.doFilter(request, response);
    } catch (Exception error) {
      respondUnauthorized(response, error.getMessage());
    }
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

  private void respondUnauthorized(HttpServletResponse response, String message) throws IOException {
    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);

    Map<String, String> payload = new HashMap<>();
    payload.put("message", "Unauthorized");
    payload.put("details", message);

    response.getWriter().write(objectMapper.writeValueAsString(payload));
  }
}

package com.fitmon.controllers;

import com.fitmon.services.UserService;
import com.google.firebase.auth.FirebaseToken;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
  private final UserService userService;

  public AuthController(UserService userService) {
    this.userService = userService;
  }

  @PostMapping("/session")
  public ResponseEntity<?> createSession(Authentication authentication) {
    return handleSession(authentication);
  }

  @GetMapping("/me")
  public ResponseEntity<?> getMe(Authentication authentication) {
    return handleSession(authentication);
  }

  private ResponseEntity<?> handleSession(Authentication authentication) {
    try {
      FirebaseToken token = (FirebaseToken) authentication.getPrincipal();
      Map<String, Object> user = userService.ensureUserProfile(token);
      return ResponseEntity.ok(Map.of("user", user));
    } catch (Exception error) {
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
        "message", "Failed to initialize user profile",
        "details", error.getMessage()
      ));
    }
  }
}

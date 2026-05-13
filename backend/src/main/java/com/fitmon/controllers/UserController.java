package com.fitmon.controllers;

import com.fitmon.services.UserService;
import com.google.firebase.auth.FirebaseToken;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UserController {
  private final UserService userService;

  public UserController(UserService userService) {
    this.userService = userService;
  }

  @PatchMapping("/role")
  public ResponseEntity<?> changeRole(Authentication authentication, @RequestBody Map<String, Object> payload) {
    try {
      FirebaseToken token = (FirebaseToken) authentication.getPrincipal();
      String uid = token.getUid();
      String role = payload != null && payload.get("role") instanceof String ? (String) payload.get("role") : null;
      if (role == null) {
        return ResponseEntity.badRequest().body(Map.of("message", "Missing role"));
      }
      userService.updateUserRole(uid, role);
      return ResponseEntity.ok(Map.of("message", "role updated"));
    } catch (Exception e) {
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "failed to update role", "details", e.getMessage()));
    }
  }

  @GetMapping("/coaches")
  public ResponseEntity<?> listCoaches(Authentication authentication) {
    try {
      return ResponseEntity.ok(Map.of("coaches", userService.getCoaches()));
    } catch (Exception e) {
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(Map.of("message", "failed to load coaches", "details", e.getMessage()));
    }
  }

  @PostMapping("/refresh-streak")
  public ResponseEntity<?> refreshStreakForDay(Authentication authentication, @RequestBody Map<String, Object> payload) {
    try {
      FirebaseToken token = (FirebaseToken) authentication.getPrincipal();
      String uid = token.getUid();
      String dateKey = payload != null && payload.get("dateKey") instanceof String ? (String) payload.get("dateKey") : null;
      if (dateKey == null) {
        return ResponseEntity.badRequest().body(Map.of("message", "Missing dateKey"));
      }
      userService.refreshUserStreakForDate(uid, dateKey);
      return ResponseEntity.ok(Map.of("message", "streak refreshed"));
    } catch (Exception e) {
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "failed to refresh streak", "details", e.getMessage()));
    }
  }
}

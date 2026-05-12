package com.fitmon.controllers;

import com.fitmon.services.UserService;
import com.google.firebase.auth.FirebaseToken;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/workout")
public class WorkoutController {
  private final UserService userService;

  public WorkoutController(UserService userService) {
    this.userService = userService;
  }

  @GetMapping("/day")
  public ResponseEntity<?> getDay(Authentication authentication, @RequestParam String dateKey) {
    try {
      FirebaseToken token = (FirebaseToken) authentication.getPrincipal();
      String uid = token.getUid();
      Map<String, Object> day = userService.getWorkoutDay(uid, dateKey);
      return ResponseEntity.ok(Map.of("day", day));
    } catch (Exception e) {
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
        "message", "failed to fetch workout day",
        "details", e.getMessage()
      ));
    }
  }

  @PostMapping("/day")
  public ResponseEntity<?> saveDay(Authentication authentication, @RequestBody Map<String, Object> payload) {
    try {
      FirebaseToken token = (FirebaseToken) authentication.getPrincipal();
      String uid = token.getUid();
      String dateKey = payload != null && payload.get("dateKey") instanceof String ? (String) payload.get("dateKey") : null;
      if (dateKey == null || dateKey.isBlank()) {
        return ResponseEntity.badRequest().body(Map.of("message", "Missing dateKey"));
      }
      Map<String, Object> day = userService.saveWorkoutDay(uid, dateKey, payload);
      return ResponseEntity.ok(Map.of("day", day));
    } catch (Exception e) {
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
        "message", "failed to save workout day",
        "details", e.getMessage()
      ));
    }
  }
}

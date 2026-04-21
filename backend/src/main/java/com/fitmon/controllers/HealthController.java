package com.fitmon.controllers;

import java.lang.management.ManagementFactory;
import java.time.Instant;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {
  @GetMapping("/api/health")
  public Map<String, Object> health() {
    long uptimeSeconds = ManagementFactory.getRuntimeMXBean().getUptime() / 1000;
    return Map.of(
      "status", "ok",
      "timestamp", Instant.now().toString(),
      "uptime", uptimeSeconds
    );
  }
}

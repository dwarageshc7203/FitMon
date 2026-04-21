package com.fitmon.controllers;

import com.fitmon.dto.IotReadingRequest;
import com.fitmon.services.IotService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/iot")
public class IotController {
  private final IotService iotService;

  public IotController(IotService iotService) {
    this.iotService = iotService;
  }

  @PostMapping("/reading")
  public ResponseEntity<?> receiveReading(
    @RequestBody(required = false) IotReadingRequest request,
    @org.springframework.web.bind.annotation.RequestHeader(value = "x-api-key", required = false) String apiKey
  ) {
    return iotService.handleReading(request, apiKey);
  }
}

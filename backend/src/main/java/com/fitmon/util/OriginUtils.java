package com.fitmon.util;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

public final class OriginUtils {
  private OriginUtils() {}

  public static List<String> parseOrigins(String origins) {
    if (origins == null || origins.trim().isEmpty()) {
      return List.of();
    }

    return Arrays.stream(origins.split(","))
      .map(String::trim)
      .filter((origin) -> !origin.isEmpty())
      .collect(Collectors.toList());
  }
}

package com.fitmon.services;

import com.google.cloud.firestore.FieldValue;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.SetOptions;
import com.google.firebase.auth.FirebaseToken;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.ArrayList;
import org.springframework.stereotype.Service;

@Service
public class UserService {
  private static final String ROLE_FITNESS_ENTHUSIAST = "fitness_enthusiast";
  private static final String ROLE_COACH = "coach";
  private final Firestore firestore;

  public UserService(Firestore firestore) {
    this.firestore = firestore;
  }

  public Map<String, Object> ensureUserProfile(FirebaseToken token, String requestedRole) throws Exception {
    String uid = Objects.requireNonNull(token.getUid(), "uid");
    var userRef = firestore.collection("users").document(uid);
    var snapshot = userRef.get().get();

    String email = token.getEmail() != null ? token.getEmail() : "";
    String name = token.getName();
    if (name == null || name.isBlank()) {
      if (!email.isBlank()) {
        name = email.split("@")[0];
      } else {
        name = "FitMon User";
      }
    }

    String normalizedRequestedRole = normalizeRole(requestedRole);

    Map<String, Object> defaultProfile = new HashMap<>();
    defaultProfile.put("name", name);
    defaultProfile.put("email", email);
    defaultProfile.put("role", normalizedRequestedRole != null ? normalizedRequestedRole : ROLE_FITNESS_ENTHUSIAST);
    defaultProfile.put("streak", 0);
    defaultProfile.put("streakLastDay", "");
    defaultProfile.put("goals", List.of());
    Map<String, Object> preferences = new HashMap<>();
    preferences.put("dominantArm", "right");
    preferences.put("units", "metric");
    defaultProfile.put("preferences", preferences);

    if (!snapshot.exists()) {
      Map<String, Object> newProfile = new HashMap<>(defaultProfile);
      newProfile.put("photoURL", token.getPicture() != null ? token.getPicture() : "");
      newProfile.put("createdAt", FieldValue.serverTimestamp());
      newProfile.put("updatedAt", FieldValue.serverTimestamp());
      userRef.set(newProfile).get();
    } else {
      String existingRole = normalizeRole(snapshot.getString("role"));
      if (existingRole == null) {
        existingRole = ROLE_FITNESS_ENTHUSIAST;
      }

      Map<String, Object> updates = new HashMap<>();
      updates.put("name", name);
      updates.put("email", email);
      updates.put("photoURL", token.getPicture() != null ? token.getPicture() : "");
      updates.put("role", existingRole);
      updates.put("streak", snapshot.contains("streak") ? snapshot.getLong("streak") : 0L);
      updates.put("streakLastDay", snapshot.contains("streakLastDay") ? snapshot.getString("streakLastDay") : "");
      updates.put("updatedAt", FieldValue.serverTimestamp());
      userRef.set(updates, SetOptions.merge()).get();
    }

    var refreshed = userRef.get().get();
    Map<String, Object> data = refreshed.getData() == null ? new HashMap<>() : new HashMap<>(refreshed.getData());
    data.put("uid", uid);
    return data;
  }

  private String normalizeRole(String role) {
    if (role == null) {
      return null;
    }

    String value = role.trim().toLowerCase();
    if (value.equals("coach") || value.equals("mentor")) {
      return ROLE_COACH;
    }

    if (
      value.equals("fitness_enthusiast") ||
      value.equals("fitness enthusiast") ||
      value.equals("trainee")
    ) {
      return ROLE_FITNESS_ENTHUSIAST;
    }

    return null;
  }

  public void refreshUserStreak(String uid, long sessionEndedAt) throws Exception {
    if (uid == null || uid.isBlank()) {
      return;
    }

    var userRef = firestore.collection("users").document(uid);
    firestore.runTransaction((transaction) -> {
      var snapshot = transaction.get(userRef).get();
      long currentStreak = 0;
      String lastDay = null;

      if (snapshot.exists()) {
        Long streakValue = snapshot.getLong("streak");
        currentStreak = streakValue != null ? streakValue : 0;
        lastDay = snapshot.getString("streakLastDay");
      }

      LocalDate sessionDay = Instant.ofEpochMilli(sessionEndedAt).atZone(ZoneOffset.UTC).toLocalDate();
      String sessionDayKey = sessionDay.toString();

      if (sessionDayKey.equals(lastDay)) {
        Map<String, Object> updates = new HashMap<>();
        updates.put("lastSessionAt", sessionEndedAt);
        updates.put("updatedAt", FieldValue.serverTimestamp());
        transaction.set(userRef, updates, SetOptions.merge());
        return null;
      }

      long nextStreak = 1;
      if (lastDay != null && !lastDay.isBlank()) {
        LocalDate previousDay = LocalDate.parse(lastDay);
        if (sessionDay.minusDays(1).isEqual(previousDay)) {
          nextStreak = currentStreak + 1;
        }
      }

      Map<String, Object> updates = new HashMap<>();
      updates.put("streak", nextStreak);
      updates.put("streakLastDay", sessionDayKey);
      updates.put("lastSessionAt", sessionEndedAt);
      updates.put("updatedAt", FieldValue.serverTimestamp());
      transaction.set(userRef, updates, SetOptions.merge());
      return null;
    }).get();
  }

  public void updateUserRole(String uid, String newRole) throws Exception {
    if (uid == null || uid.isBlank()) return;
    String normalized = normalizeRole(newRole);
    if (normalized == null) {
      throw new IllegalArgumentException("Invalid role");
    }
    var userRef = firestore.collection("users").document(uid);
    Map<String, Object> updates = new HashMap<>();
    updates.put("role", normalized);
    updates.put("updatedAt", FieldValue.serverTimestamp());
    userRef.set(updates, SetOptions.merge()).get();
  }

  public void refreshUserStreakForDate(String uid, String dateKey) throws Exception {
    if (uid == null || uid.isBlank() || dateKey == null || dateKey.isBlank()) return;
    var userRef = firestore.collection("users").document(uid);
    var dayRef = userRef.collection("workoutDays").document(dateKey);
    var daySnap = dayRef.get().get();
    boolean hasActivity = false;
    if (daySnap.exists()) {
      Object cardio = daySnap.get("cardioMinutes");
      Object tracker = daySnap.get("workoutTracker");
      if ((cardio instanceof Number && ((Number) cardio).doubleValue() > 0) || (tracker instanceof List && !((List<?>) tracker).isEmpty())) {
        hasActivity = true;
      }
    }
    if (!hasActivity) {
      // check sessions for same day
      LocalDate day = LocalDate.parse(dateKey);
      long startMillis = day.atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli();
      long endMillis = day.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli() - 1;
      var sessionsQuery = firestore.collection("sessions").whereEqualTo("uid", uid).whereGreaterThanOrEqualTo("endedAt", startMillis).whereLessThanOrEqualTo("endedAt", endMillis);
      var sessions = sessionsQuery.get().get();
      if (!sessions.isEmpty()) {
        hasActivity = true;
      }
    }
    if (!hasActivity) return;
    // Parse dateKey (YYYY-MM-DD) to epoch millis at start of day UTC
    LocalDate dayFor = LocalDate.parse(dateKey);
    long epochMillis = dayFor.atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli();
    // Reuse existing logic by delegating to refreshUserStreak
    refreshUserStreak(uid, epochMillis);
  }

  public Map<String, Object> getWorkoutDay(String uid, String dateKey) throws Exception {
    var userRef = firestore.collection("users").document(uid);
    var dayRef = userRef.collection("workoutDays").document(dateKey);
    var daySnap = dayRef.get().get();
    Map<String, Object> data = daySnap.exists() && daySnap.getData() != null ? new HashMap<>(daySnap.getData()) : new HashMap<>();
    data.putIfAbsent("dateKey", dateKey);
    data.putIfAbsent("workoutTracker", List.of());
    data.putIfAbsent("selectedMuscleGroups", List.of());
    data.putIfAbsent("cardioMinutes", 0);
    data.putIfAbsent("caloriesBurned", 0);
    return data;
  }

  public Map<String, Object> saveWorkoutDay(String uid, String dateKey, Map<String, Object> payload) throws Exception {
    var userRef = firestore.collection("users").document(uid);
    var dayRef = userRef.collection("workoutDays").document(dateKey);

    Map<String, Object> updates = new HashMap<>();
    updates.put("dateKey", dateKey);
    updates.put("updatedAt", FieldValue.serverTimestamp());

    if (payload != null) {
      if (payload.get("cardioMinutes") instanceof Number cardio) {
        updates.put("cardioMinutes", Math.max(0, cardio.doubleValue()));
      }
      if (payload.get("caloriesBurned") instanceof Number calories) {
        updates.put("caloriesBurned", Math.max(0, calories.doubleValue()));
      }
      if (payload.get("workoutTracker") instanceof List<?> tracker) {
        List<String> names = new ArrayList<>();
        for (Object item : tracker) {
          if (item != null) {
            String value = String.valueOf(item).trim();
            if (!value.isBlank()) {
              names.add(value);
            }
          }
        }
        updates.put("workoutTracker", names);
      }
      if (payload.get("selectedMuscleGroups") instanceof List<?> muscles) {
        List<String> selected = new ArrayList<>();
        for (Object item : muscles) {
          if (item != null) {
            String value = String.valueOf(item).trim();
            if (!value.isBlank()) {
              selected.add(value);
            }
          }
        }
        updates.put("selectedMuscleGroups", selected);
      }
    }

    dayRef.set(updates, SetOptions.merge()).get();
    refreshUserStreakForDate(uid, dateKey);
    return getWorkoutDay(uid, dateKey);
  }

  public String getNormalizedUserRole(String uid) throws Exception {
    if (uid == null || uid.isBlank()) {
      return ROLE_FITNESS_ENTHUSIAST;
    }

    var snapshot = firestore.collection("users").document(uid).get().get();
    if (!snapshot.exists()) {
      return ROLE_FITNESS_ENTHUSIAST;
    }

    String normalized = normalizeRole(snapshot.getString("role"));
    return normalized != null ? normalized : ROLE_FITNESS_ENTHUSIAST;
  }
}

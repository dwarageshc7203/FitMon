package com.fitmon.services;

import com.google.cloud.firestore.FieldValue;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.auth.FirebaseToken;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.stereotype.Service;

@Service
public class UserService {
  private final Firestore firestore;

  public UserService(Firestore firestore) {
    this.firestore = firestore;
  }

  public Map<String, Object> ensureUserProfile(FirebaseToken token) throws Exception {
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

    Map<String, Object> defaultProfile = new HashMap<>();
    defaultProfile.put("name", name);
    defaultProfile.put("email", email);
    defaultProfile.put("role", "trainee");
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
      Map<String, Object> updates = new HashMap<>();
      updates.put("name", name);
      updates.put("email", email);
      updates.put("photoURL", token.getPicture() != null ? token.getPicture() : "");
      updates.put("updatedAt", FieldValue.serverTimestamp());
      userRef.set(updates, com.google.cloud.firestore.SetOptions.merge()).get();
    }

    var refreshed = userRef.get().get();
    Map<String, Object> data = refreshed.getData() == null ? new HashMap<>() : new HashMap<>(refreshed.getData());
    data.put("uid", uid);
    return data;
  }
}

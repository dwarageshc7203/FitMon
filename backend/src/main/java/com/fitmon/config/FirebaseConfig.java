package com.fitmon.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.cloud.FirestoreClient;
import com.google.cloud.firestore.Firestore;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Objects;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class FirebaseConfig {
  private static final Logger log = LoggerFactory.getLogger(FirebaseConfig.class);
  private final FitMonProperties properties;

  public FirebaseConfig(FitMonProperties properties) {
    this.properties = properties;
  }

  @Bean
  public FirebaseApp firebaseApp() throws IOException {
    GoogleCredentials credentials = loadCredentials();

    FirebaseOptions options = FirebaseOptions.builder()
      .setCredentials(credentials)
      .build();

    String databaseUrl = properties.getFirebase().getDatabaseUrl();
    if (databaseUrl != null && !databaseUrl.isBlank()) {
      options = FirebaseOptions.builder()
        .setCredentials(credentials)
        .setDatabaseUrl(databaseUrl)
        .build();
    }

    if (FirebaseApp.getApps().isEmpty()) {
      return FirebaseApp.initializeApp(options);
    }

    return FirebaseApp.getInstance();
  }

  @Bean
  public Firestore firestore(FirebaseApp firebaseApp) {
    return FirestoreClient.getFirestore(firebaseApp);
  }

  @Bean
  public FirebaseAuth firebaseAuth(FirebaseApp firebaseApp) {
    return FirebaseAuth.getInstance(firebaseApp);
  }

  private GoogleCredentials loadCredentials() throws IOException {
    String serviceAccountPath = properties.getFirebase().getServiceAccountPath();
    if (hasText(serviceAccountPath)) {
      File configuredFile = new File(serviceAccountPath);
      return loadCredentialsFromFile(configuredFile, "FIREBASE_SERVICE_ACCOUNT_PATH");
    }

    String projectId = properties.getFirebase().getProjectId();
    String clientEmail = properties.getFirebase().getClientEmail();
    String privateKey = properties.getFirebase().getPrivateKey();

    if (hasText(projectId) && hasText(clientEmail) && hasText(privateKey)) {
      String privateKeyId = Objects.toString(properties.getFirebase().getPrivateKeyId(), "");
      String clientId = Objects.toString(properties.getFirebase().getClientId(), "");
      String sanitizedKey = privateKey.replace("\\n", "\n");

      String json = "{"
        + "\"type\":\"service_account\"," 
        + "\"project_id\":\"" + escapeJson(projectId) + "\"," 
        + "\"private_key_id\":\"" + escapeJson(privateKeyId) + "\"," 
        + "\"private_key\":\"" + escapeJson(sanitizedKey) + "\"," 
        + "\"client_email\":\"" + escapeJson(clientEmail) + "\"," 
        + "\"client_id\":\"" + escapeJson(clientId) + "\""
        + "}";

      return GoogleCredentials.fromStream(
        new ByteArrayInputStream(json.getBytes(StandardCharsets.UTF_8))
      );
    }

    File defaultServiceAccount = new File("firebase-service-account.json");
    if (defaultServiceAccount.exists() && defaultServiceAccount.isFile()) {
      log.info("Using fallback Firebase service account file at {}", defaultServiceAccount.getAbsolutePath());
      return loadCredentialsFromFile(defaultServiceAccount, "firebase-service-account.json");
    }

    throw new IllegalStateException(
      "Firebase Admin credentials are missing. Set FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY.");
  }

  private boolean hasText(String value) {
    return value != null && !value.isBlank();
  }

  private GoogleCredentials loadCredentialsFromFile(File file, String sourceName) throws IOException {
    if (!file.exists() || !file.isFile()) {
      throw new IllegalStateException("Firebase credentials file from " + sourceName + " was not found: " + file.getAbsolutePath());
    }
    if (!file.canRead()) {
      throw new IllegalStateException("Firebase credentials file from " + sourceName + " is not readable: " + file.getAbsolutePath());
    }
    if (file.length() == 0L) {
      throw new IllegalStateException("Firebase credentials file from " + sourceName + " is empty: " + file.getAbsolutePath());
    }

    try (InputStream inputStream = new FileInputStream(file)) {
      return GoogleCredentials.fromStream(inputStream);
    }
  }

  private String escapeJson(String value) {
    if (value == null) {
      return "";
    }
    return value
      .replace("\\", "\\\\")
      .replace("\"", "\\\"")
      .replace("\n", "\\n")
      .replace("\r", "\\r");
  }
}

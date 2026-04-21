package com.fitmon.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "fitmon")
public class FitMonProperties {
  private String clientOrigins;
  private String sensorApiKey;
  private GeminiProperties gemini = new GeminiProperties();
  private FirebaseProperties firebase = new FirebaseProperties();

  public String getClientOrigins() {
    return clientOrigins;
  }

  public void setClientOrigins(String clientOrigins) {
    this.clientOrigins = clientOrigins;
  }

  public String getSensorApiKey() {
    return sensorApiKey;
  }

  public void setSensorApiKey(String sensorApiKey) {
    this.sensorApiKey = sensorApiKey;
  }

  public GeminiProperties getGemini() {
    return gemini;
  }

  public void setGemini(GeminiProperties gemini) {
    this.gemini = gemini;
  }

  public FirebaseProperties getFirebase() {
    return firebase;
  }

  public void setFirebase(FirebaseProperties firebase) {
    this.firebase = firebase;
  }

  public static class GeminiProperties {
    private String apiKey;
    private String model;

    public String getApiKey() {
      return apiKey;
    }

    public void setApiKey(String apiKey) {
      this.apiKey = apiKey;
    }

    public String getModel() {
      return model;
    }

    public void setModel(String model) {
      this.model = model;
    }
  }

  public static class FirebaseProperties {
    private String serviceAccountPath;
    private String projectId;
    private String clientEmail;
    private String privateKey;
    private String privateKeyId;
    private String clientId;
    private String databaseUrl;

    public String getServiceAccountPath() {
      return serviceAccountPath;
    }

    public void setServiceAccountPath(String serviceAccountPath) {
      this.serviceAccountPath = serviceAccountPath;
    }

    public String getProjectId() {
      return projectId;
    }

    public void setProjectId(String projectId) {
      this.projectId = projectId;
    }

    public String getClientEmail() {
      return clientEmail;
    }

    public void setClientEmail(String clientEmail) {
      this.clientEmail = clientEmail;
    }

    public String getPrivateKey() {
      return privateKey;
    }

    public void setPrivateKey(String privateKey) {
      this.privateKey = privateKey;
    }

    public String getPrivateKeyId() {
      return privateKeyId;
    }

    public void setPrivateKeyId(String privateKeyId) {
      this.privateKeyId = privateKeyId;
    }

    public String getClientId() {
      return clientId;
    }

    public void setClientId(String clientId) {
      this.clientId = clientId;
    }

    public String getDatabaseUrl() {
      return databaseUrl;
    }

    public void setDatabaseUrl(String databaseUrl) {
      this.databaseUrl = databaseUrl;
    }
  }
}

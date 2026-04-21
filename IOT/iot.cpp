#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>

const char* WIFI_SSID = "moto edge 50 neo_3260";
const char* WIFI_PASSWORD = "dwarageshdc";

const char* SERVER_IP = "10.84.125.133";
const int SERVER_PORT = 3001;

const char* API_KEY = "changeme123";

const int FSR_PIN = A0;
const int SEND_INTERVAL = 1000;

unsigned long lastSendTime = 0;

WiFiClient client;
HTTPClient http;

void connectToWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi Connected");
  Serial.print("ESP IP: ");
  Serial.println(WiFi.localIP());
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  pinMode(FSR_PIN, INPUT);
  connectToWiFi();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectToWiFi();
  }

  unsigned long currentTime = millis();
  if (currentTime - lastSendTime >= SEND_INTERVAL) {
    sendSensorReading();
    lastSendTime = currentTime;
  }

  delay(10);
}

void sendSensorReading() {
  if (WiFi.status() != WL_CONNECTED) return;

  int rawValue = analogRead(FSR_PIN);

  String jsonPayload = "{";
  jsonPayload += "\"value\":" + String(rawValue);
  jsonPayload += "}";

  String fullURL = "http://" + String(SERVER_IP) + ":" + String(SERVER_PORT) + "/api/iot/reading";

  Serial.println("POST -> " + fullURL);
  Serial.println("Payload -> " + jsonPayload);

  http.begin(client, fullURL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", API_KEY);
  http.setTimeout(5000);

  int httpResponseCode = http.POST(jsonPayload);

  Serial.print("HTTP Code: ");
  Serial.println(httpResponseCode);

  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("Response: " + response);
  } else {
    Serial.print("HTTP Error: ");
    Serial.println(http.errorToString(httpResponseCode));
  }

  http.end();
}

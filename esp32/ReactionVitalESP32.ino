#include <WiFi.h>
#include <WebSocketsClient.h>

// =========================
// Configuration
// =========================

// Set to true to test the full backend flow without the physical circuit.
// When false, the original LED/button game is executed.
static const bool SIMULATION_MODE = true;

// WiFi credentials
static const char* WIFI_SSID = "Red_Software";
static const char* WIFI_PASSWORD = "S0ft2026t$c.";

// Railway / backend public URL, without trailing slash.
// Example: "https://your-backend.up.railway.app"
static const char* SOCKET_HOST = "piensaa-production.up.railway.app";
static const uint16_t SOCKET_PORT = 443;
static const char* SOCKET_ENDPOINT = "/socket.io/?EIO=4&transport=websocket";
static const char* SOCKET_NAMESPACE = "/device";

// Game hardware pins
static const uint8_t LED_PINS[3] = {16, 17, 18};
static const uint8_t BUTTON_PINS[3] = {32, 33, 25};

// Debounce and timing
static const unsigned long BUTTON_DEBOUNCE_MS = 35;
static const unsigned long SOCKET_RECONNECT_MS = 5000;
static const unsigned long WIFI_RECONNECT_MS = 5000;
static const unsigned long IDLE_POLL_MS = 10;

struct TestContext {
  String patientId;
  int selectedLevel = 1; // 1=Fácil, 2=Medio, 3=Difícil, 4=Frenético
  bool active = false;
  bool timeout = false;
  bool success = false;
  int correctButton = -1;
  int pressedButton = -1;
  unsigned long startedAt = 0;
  unsigned long expectedTimeoutMs = 0;
  unsigned long reactionTimeMs = 0;
};

WebSocketsClient socketIO;
TestContext currentTest;

bool wifiReady = false;
bool socketReady = false;
unsigned long lastWifiAttempt = 0;
unsigned long lastSocketAttempt = 0;
unsigned long lastPoll = 0;

// =========================
// Forward declarations
// =========================

void connectWifi();
void connectSocket();
void reconnect();
void waitForTest();
void runRealGame();
void runSimulation();
void sendResult();
void handleWebSocketEvent(WStype_t type, uint8_t* payload, size_t length);
void sendSocketPacket(String packet);
void applyLevel(int level);
void resetGameOutputs();
void showLed(uint8_t ledIndex, bool on);
int readPressedButton();
int pickRandomLed();
unsigned long levelTimeoutMs(int level);
unsigned long simulationDelayMs(int level);

// =========================
// Helpers
// =========================

static String trimJsonPayload(const uint8_t* payload, size_t length) {
  String data;
  data.reserve(length + 1);
  for (size_t i = 0; i < length; ++i) {
    data += static_cast<char>(payload[i]);
  }
  return data;
}

static String extractJsonString(const String& json, const String& key) {
  const String needle = "\"" + key + "\"";
  int start = json.indexOf(needle);
  if (start < 0) return "";
  start = json.indexOf(':', start);
  if (start < 0) return "";
  int firstQuote = json.indexOf('"', start + 1);
  if (firstQuote < 0) return "";
  int secondQuote = json.indexOf('"', firstQuote + 1);
  if (secondQuote < 0) return "";
  return json.substring(firstQuote + 1, secondQuote);
}

static int extractJsonInt(const String& json, const String& key, int defaultValue = 0) {
  const String needle = "\"" + key + "\"";
  int start = json.indexOf(needle);
  if (start < 0) return defaultValue;
  start = json.indexOf(':', start);
  if (start < 0) return defaultValue;
  int end = start + 1;
  while (end < static_cast<int>(json.length()) &&
         (json[end] == ' ' || json[end] == '\t' || json[end] == '"')) {
    ++end;
  }
  int stop = end;
  while (stop < static_cast<int>(json.length()) &&
         (isDigit(json[stop]) || json[stop] == '-')) {
    ++stop;
  }
  if (stop <= end) return defaultValue;
  return json.substring(end, stop).toInt();
}

static bool extractJsonBool(const String& json, const String& key, bool defaultValue = false) {
  const String needle = "\"" + key + "\"";
  int start = json.indexOf(needle);
  if (start < 0) return defaultValue;
  start = json.indexOf(':', start);
  if (start < 0) return defaultValue;
  String tail = json.substring(start + 1);
  tail.trim();
  if (tail.startsWith("true")) return true;
  if (tail.startsWith("false")) return false;
  return defaultValue;
}

// =========================
// Setup / Loop
// =========================

void setup() {
  Serial.begin(115200);
  delay(300);

  randomSeed(esp_random());

  for (uint8_t i = 0; i < 3; ++i) {
    pinMode(LED_PINS[i], OUTPUT);
    digitalWrite(LED_PINS[i], LOW);
    pinMode(BUTTON_PINS[i], INPUT_PULLUP);
  }

  connectWifi();
  connectSocket();
  resetGameOutputs();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    wifiReady = false;
    reconnect();
    delay(IDLE_POLL_MS);
    return;
  }

  if (!socketIO.isConnected()) {
    socketReady = false;
    reconnect();
  }

  socketIO.loop();

  if (currentTest.active) {
    if (SIMULATION_MODE) {
      runSimulation();
    } else {
      runRealGame();
    }
  } else {
    waitForTest();
  }

  delay(IDLE_POLL_MS);
}

// =========================
// Connection management
// =========================

void connectWifi() {
  if (WiFi.status() == WL_CONNECTED) {
    wifiReady = true;
    return;
  }

  Serial.printf("Connecting WiFi to %s\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 20000) {
    delay(500);
    Serial.print('.');
  }
  Serial.println();

  wifiReady = WiFi.status() == WL_CONNECTED;
  if (wifiReady) {
    Serial.print("WiFi connected, IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("WiFi connection failed");
  }
}

void connectSocket() {
  if (!wifiReady) return;

  if (socketIO.isConnected()) {
    return;
  }

  socketIO.beginSocketIOSSL(SOCKET_HOST, SOCKET_PORT, "/socket.io/?EIO=4");
  socketIO.onEvent(handleWebSocketEvent);
  socketIO.setReconnectInterval(5000);
  socketIO.enableHeartbeat(15000, 3000, 2);
}

void reconnect() {
  unsigned long now = millis();

  if (!wifiReady && now - lastWifiAttempt >= WIFI_RECONNECT_MS) {
    lastWifiAttempt = now;
    connectWifi();
    if (wifiReady) {
      connectSocket();
    }
  }

  if (wifiReady && !socketIO.isConnected() && now - lastSocketAttempt >= SOCKET_RECONNECT_MS) {
    lastSocketAttempt = now;
    connectSocket();
  }
}

// =========================
// WebSocket + Socket.IO handling
// =========================

void handleWebSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED:
      socketReady = false;
      Serial.println("Socket disconnected");
      break;

    case WStype_ERROR:
      socketReady = false;
      Serial.println("Socket error");
      break;

    case WStype_CONNECTED: {
      socketReady = true;
      Serial.println("Socket connected");
      // Socket.IO namespace handshake for /device.
      sendSocketPacket(String("40") + SOCKET_NAMESPACE + ",");
      break;
    }

    case WStype_TEXT: {
      String event = trimJsonPayload(payload, length);
      Serial.print("Socket message: ");
      Serial.println(event);

      if (event.startsWith("0")) {
        Serial.println("Engine.IO open packet received");
        break;
      }

      if (event.startsWith(String("40") + SOCKET_NAMESPACE)) {
        Serial.println("Socket.IO namespace /device connected");
        // Namespace connected, notify backend about ESP32 presence.
        sendSocketPacket(String("42") + SOCKET_NAMESPACE + ",[\"deviceConnected\"]");
        break;
      }

      if (event == "40") {
        Serial.println("Socket.IO root namespace connected");
        break;
      }

      // Expected payload:
      // 42/device,["startTest",{"patientId":"...","level":1}]
      if (event.indexOf("\"startTest\"") >= 0) {
        String patientId = extractJsonString(event, "patientId");
        int level = extractJsonInt(event, "level", 1);

        currentTest.patientId = patientId;
        currentTest.selectedLevel = constrain(level, 1, 4);
        currentTest.active = true;
        currentTest.timeout = false;
        currentTest.success = false;
        currentTest.pressedButton = -1;
        currentTest.correctButton = -1;
        currentTest.reactionTimeMs = 0;
        currentTest.startedAt = millis();
        currentTest.expectedTimeoutMs = levelTimeoutMs(currentTest.selectedLevel);

        Serial.printf("startTest received: patientId=%s level=%d\n",
                      currentTest.patientId.c_str(),
                      currentTest.selectedLevel);
      }
      break;
    }

    default:
      break;
  }
}

void sendSocketPacket(String packet) {
  socketIO.sendTXT(packet);
}

// =========================
// Game flow
// =========================

void waitForTest() {
  // Idle state. Nothing to do while waiting for backend startTest.
}

void runRealGame() {
  if (!currentTest.active) return;

  applyLevel(currentTest.selectedLevel);

  if (currentTest.startedAt == 0) {
    currentTest.startedAt = millis();
  }

  if (currentTest.correctButton < 0) {
    currentTest.correctButton = pickRandomLed();
    showLed(currentTest.correctButton, true);
    Serial.printf("LED %d ON\n", currentTest.correctButton);
  }

  unsigned long elapsed = millis() - currentTest.startedAt;
  if (elapsed > currentTest.expectedTimeoutMs) {
    currentTest.timeout = true;
    currentTest.success = false;
    currentTest.reactionTimeMs = currentTest.expectedTimeoutMs;
    currentTest.pressedButton = -1;
    sendResult();
    return;
  }

  int pressedButton = readPressedButton();
  if (pressedButton < 0) return;

  currentTest.pressedButton = pressedButton;
  currentTest.reactionTimeMs = elapsed;
  currentTest.success = (pressedButton == currentTest.correctButton);

  if (!currentTest.success) {
    Serial.printf("Wrong button pressed: %d expected %d\n", pressedButton, currentTest.correctButton);
    currentTest.timeout = false;
    sendResult();
    return;
  }

  // Keep the original game idea: correct press resolves the round.
  // We do not alter the randomization or timing logic.
  sendResult();
}

void runSimulation() {
  if (!currentTest.active) return;

  // Simulated timing keeps the same level-dependent timeout behavior.
  if (currentTest.startedAt == 0) {
    currentTest.startedAt = millis();
    currentTest.correctButton = random(0, 3);
    currentTest.pressedButton = currentTest.correctButton;
  }

  unsigned long elapsed = millis() - currentTest.startedAt;
  unsigned long target = simulationDelayMs(currentTest.selectedLevel);
  if (elapsed < target) return;

  currentTest.reactionTimeMs = target;
  currentTest.timeout = false;
  currentTest.success = true;
  sendResult();
}

void sendResult() {
  if (!socketReady) {
    Serial.println("Socket not ready, cannot send result");
    currentTest.active = false;
    resetGameOutputs();
    return;
  }

  unsigned long timestamp = millis();

  String payload = "{";
  payload += "\"patientId\":\"" + currentTest.patientId + "\",";
  payload += "\"reactionTime\":" + String(currentTest.reactionTimeMs) + ",";
  payload += "\"selectedLevel\":" + String(currentTest.selectedLevel) + ",";
  payload += "\"success\":" + String(currentTest.success ? "true" : "false") + ",";
  payload += "\"correctButton\":" + String(currentTest.correctButton) + ",";
  payload += "\"pressedButton\":" + String(currentTest.pressedButton) + ",";
  payload += "\"timeout\":" + String(currentTest.timeout ? "true" : "false") + ",";
  payload += "\"timestamp\":" + String(timestamp);
  payload += "}";

  String packet = String("42") + SOCKET_NAMESPACE + ",[\"testFinished\"," + payload + "]";
  sendSocketPacket(packet);

  Serial.print("Result sent: ");
  Serial.println(packet);

  currentTest.active = false;
  currentTest.startedAt = 0;
  currentTest.correctButton = -1;
  currentTest.pressedButton = -1;
  currentTest.reactionTimeMs = 0;
  resetGameOutputs();
}

// =========================
// Hardware abstraction
// =========================

void applyLevel(int level) {
  currentTest.selectedLevel = constrain(level, 1, 4);
  currentTest.expectedTimeoutMs = levelTimeoutMs(currentTest.selectedLevel);
}

void resetGameOutputs() {
  for (uint8_t i = 0; i < 3; ++i) {
    digitalWrite(LED_PINS[i], LOW);
  }
}

void showLed(uint8_t ledIndex, bool on) {
  if (ledIndex > 2) return;
  digitalWrite(LED_PINS[ledIndex], on ? HIGH : LOW);
}

int readPressedButton() {
  static unsigned long lastPressAt[3] = {0, 0, 0};
  for (uint8_t i = 0; i < 3; ++i) {
    if (digitalRead(BUTTON_PINS[i]) == LOW) {
      unsigned long now = millis();
      if (now - lastPressAt[i] > BUTTON_DEBOUNCE_MS) {
        lastPressAt[i] = now;
        return i;
      }
    }
  }
  return -1;
}

int pickRandomLed() {
  return random(0, 3);
}

unsigned long levelTimeoutMs(int level) {
  switch (constrain(level, 1, 4)) {
    case 1: return 6000;  // Fácil
    case 2: return 4500;  // Medio
    case 3: return 3000;  // Difícil
    case 4: return 1800;  // Frenético
    default: return 6000;
  }
}

unsigned long simulationDelayMs(int level) {
  switch (constrain(level, 1, 4)) {
    case 1: return random(650, 1600);
    case 2: return random(450, 1300);
    case 3: return random(300, 950);
    case 4: return random(180, 700);
    default: return random(650, 1600);
  }
}

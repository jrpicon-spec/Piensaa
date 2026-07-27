#include <WiFi.h>
#include <WebSocketsClient.h>

// =====================================================
// CONFIGURACIÓN GENERAL
// =====================================================

// false = utilizar LEDs y botones físicos.
// true = generar automáticamente un resultado de prueba.
static const bool SIMULATION_MODE = false;

// Red WiFi.
// El ESP32 y la computadora deben estar en la misma red.
static const char* WIFI_SSID = "Red_Software";
static const char* WIFI_PASSWORD = "S0ft2026t$c.";

// IP local de la computadora que ejecuta NestJS.
static const char* SOCKET_HOST = "192.168.20.234";

// Puerto del backend NestJS.
static const uint16_t SOCKET_PORT = 3000;

// Ruta directa WebSocket de Socket.IO / Engine.IO.
static const char* SOCKET_PATH =
  "/socket.io/?EIO=4&transport=websocket&clientType=esp32";

// Namespace configurado en NestJS.
static const char* SOCKET_NAMESPACE = "/device";

// Identificador fijo del dispositivo.
static const char* DEVICE_ID = "esp32-reaccion-01";
static const char* DEVICE_TYPE = "esp32";

// =====================================================
// PINES DEL CIRCUITO
// =====================================================

static const uint8_t LED_PINS[3] = {
  5,
  18,
  19
};

static const uint8_t BUTTON_PINS[3] = {
  4,
  16,
  17
};

// =====================================================
// TIEMPOS
// =====================================================

static const unsigned long BUTTON_DEBOUNCE_MS = 35;
static const unsigned long SOCKET_RECONNECT_MS = 5000;

static const unsigned long MIN_PREPARATION_MS = 500;
static const unsigned long MAX_PREPARATION_MS = 1500;

// =====================================================
// ESTADO DE LA PRUEBA
// =====================================================

struct TestContext {
  String patientId;

  int selectedLevel = 1;

  bool active = false;
  bool preparing = false;
  bool ledActivated = false;

  bool timeout = false;
  bool success = false;

  int correctButton = -1;
  int pressedButton = -1;

  unsigned long preparationStartedAt = 0;
  unsigned long preparationDelayMs = 0;

  unsigned long startedAt = 0;
  unsigned long expectedTimeoutMs = 0;
  unsigned long reactionTimeMs = 0;

  unsigned long simulationTargetMs = 0;
};

WebSocketsClient webSocket;
TestContext currentTest;

// =====================================================
// ESTADO DE CONEXIÓN
// =====================================================

bool engineConnected = false;
bool namespaceRequested = false;
bool namespaceConnected = false;

unsigned long lastWifiReconnectAttempt = 0;

// =====================================================
// DECLARACIONES
// =====================================================

void connectWiFi();
void connectWebSocket();
void reconnectWiFi();

void webSocketEvent(
  WStype_t type,
  uint8_t* payload,
  size_t length
);

void sendPacket(String packet);
void sendDevicePresence();

void processSocketMessage(const String& message);
void processStartTest(const String& message);

void prepareNewTest();
void runRealGame();
void runSimulation();

void sendResult();
void finishTest();

void resetGameOutputs();
void resetTestContext();

void showLed(uint8_t ledIndex, bool state);

bool anyButtonPressed();
int readPressedButton();
int pickRandomLed();

unsigned long levelTimeoutMs(int level);
unsigned long simulationDelayMs(int level);

String payloadToString(
  uint8_t* payload,
  size_t length
);

String extractJsonString(
  const String& json,
  const String& key
);

int extractJsonInt(
  const String& json,
  const String& key,
  int defaultValue
);

// =====================================================
// SETUP
// =====================================================

void setup() {
  Serial.begin(115200);
  delay(1500);

  Serial.println();
  Serial.println("======================================");
  Serial.println("   SISTEMA DE PRUEBA DE REACCION");
  Serial.println("======================================");

  randomSeed(esp_random());

  for (uint8_t i = 0; i < 3; i++) {
    pinMode(LED_PINS[i], OUTPUT);
    digitalWrite(LED_PINS[i], LOW);

    pinMode(BUTTON_PINS[i], INPUT_PULLUP);
  }

  resetTestContext();
  resetGameOutputs();

  connectWiFi();

  if (WiFi.status() == WL_CONNECTED) {
    connectWebSocket();
  }

  if (SIMULATION_MODE) {
    Serial.println("Modo de simulacion ACTIVADO.");
  } else {
    Serial.println("Modo de circuito real ACTIVADO.");
  }
}

// =====================================================
// LOOP
// =====================================================

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    reconnectWiFi();
    delay(10);
    return;
  }

  // Mantener activa la conexión WebSocket.
  webSocket.loop();

  // Ejecutar la prueba si el backend envió startTest.
  if (currentTest.active) {
    if (SIMULATION_MODE) {
      runSimulation();
    } else {
      runRealGame();
    }
  }

  delay(1);
}

// =====================================================
// WIFI
// =====================================================

void connectWiFi() {
  Serial.println();
  Serial.print("Conectando a WiFi: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);

  WiFi.begin(
    WIFI_SSID,
    WIFI_PASSWORD
  );

  unsigned long startedAt = millis();

  while (
    WiFi.status() != WL_CONNECTED &&
    millis() - startedAt < 20000
  ) {
    Serial.print(".");
    delay(500);
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("WiFi conectado.");

    Serial.print("IP ESP32: ");
    Serial.println(WiFi.localIP());

    Serial.print("Gateway: ");
    Serial.println(WiFi.gatewayIP());

    Serial.print("RSSI: ");
    Serial.println(WiFi.RSSI());

    Serial.print("Backend: ws://");
    Serial.print(SOCKET_HOST);
    Serial.print(":");
    Serial.println(SOCKET_PORT);
  } else {
    Serial.println("No se pudo conectar al WiFi.");
  }
}

void reconnectWiFi() {
  unsigned long now = millis();

  if (now - lastWifiReconnectAttempt < 5000) {
    return;
  }

  lastWifiReconnectAttempt = now;

  Serial.println("WiFi desconectado. Reconectando...");

  engineConnected = false;
  namespaceRequested = false;
  namespaceConnected = false;

  WiFi.disconnect();
  WiFi.begin(
    WIFI_SSID,
    WIFI_PASSWORD
  );
}

// =====================================================
// WEBSOCKET DIRECTO
// =====================================================

void connectWebSocket() {
  Serial.println();
  Serial.print("Conectando a ws://");
  Serial.print(SOCKET_HOST);
  Serial.print(":");
  Serial.print(SOCKET_PORT);
  Serial.println(SOCKET_PATH);

  /*
   * IMPORTANTE:
   *
   * Se utiliza begin(), no beginSocketIO().
   * Esto fuerza transport=websocket directamente.
   */
  webSocket.begin(
    SOCKET_HOST,
    SOCKET_PORT,
    SOCKET_PATH
  );

  webSocket.onEvent(webSocketEvent);

  webSocket.setReconnectInterval(
    SOCKET_RECONNECT_MS
  );

  /*
   * No usamos enableHeartbeat().
   *
   * Engine.IO realiza su propio ping/pong:
   *
   * servidor -> "2"
   * ESP32    -> "3"
   */
}

// =====================================================
// EVENTOS DEL WEBSOCKET
// =====================================================

void webSocketEvent(
  WStype_t type,
  uint8_t* payload,
  size_t length
) {
  switch (type) {
    case WStype_DISCONNECTED:
      engineConnected = false;
      namespaceRequested = false;
      namespaceConnected = false;

      Serial.println("[SOCKET] Desconectado.");
      break;

    case WStype_CONNECTED:
      engineConnected = false;
      namespaceRequested = false;
      namespaceConnected = false;

      Serial.println("[SOCKET] WebSocket conectado.");
      Serial.println(
        "[SOCKET] Esperando apertura de Engine.IO..."
      );
      break;

    case WStype_TEXT: {
      String message = payloadToString(
        payload,
        length
      );

      Serial.print("[RECIBIDO] ");
      Serial.println(message);

      processSocketMessage(message);
      break;
    }

    case WStype_ERROR:
      Serial.println("[SOCKET] Error de WebSocket.");
      break;

    case WStype_PING:
      Serial.println(
        "[WEBSOCKET] Ping de control recibido."
      );
      break;

    case WStype_PONG:
      Serial.println(
        "[WEBSOCKET] Pong de control recibido."
      );
      break;

    default:
      break;
  }
}

// =====================================================
// PROCESAR ENGINE.IO Y SOCKET.IO
// =====================================================

void processSocketMessage(const String& message) {
  /*
   * Apertura de Engine.IO.
   *
   * Ejemplo:
   * 0{"sid":"...","pingInterval":25000,...}
   */
  if (message.startsWith("0")) {
    engineConnected = true;

    Serial.println(
      "[ENGINE.IO] Sesion abierta correctamente."
    );

    if (!namespaceRequested) {
      String namespacePacket =
        String("40") +
        SOCKET_NAMESPACE +
        ",";

      sendPacket(namespacePacket);

      namespaceRequested = true;

      Serial.println(
        "[SOCKET.IO] Solicitando namespace /device..."
      );
    }

    return;
  }

  /*
   * Ping de Engine.IO.
   *
   * El servidor envía "2".
   * El ESP32 debe responder "3".
   */
  if (message == "2") {
    Serial.println(
      "[ENGINE.IO] Ping recibido."
    );

    sendPacket("3");
    return;
  }

  /*
   * Confirmación de conexión al namespace.
   *
   * Ejemplo:
   * 40/device,{"sid":"..."}
   */
  if (
    message.startsWith(
      String("40") + SOCKET_NAMESPACE
    )
  ) {
    namespaceConnected = true;

    Serial.println(
      "[SOCKET.IO] Namespace /device conectado."
    );

    sendDevicePresence();
    return;
  }

  /*
   * Error del namespace.
   */
  if (
    message.startsWith(
      String("44") + SOCKET_NAMESPACE
    )
  ) {
    namespaceConnected = false;

    Serial.println(
      "[ERROR] El backend rechazo el namespace /device."
    );

    return;
  }

  /*
   * Evento startTest.
   */
  if (
    message.indexOf("\"startTest\"") >= 0
  ) {
    processStartTest(message);
    return;
  }

  /*
   * Evento de confirmación opcional.
   */
  if (
    message.indexOf("\"deviceReady\"") >= 0
  ) {
    Serial.println(
      "[EVENTO] Backend confirmo que el dispositivo esta listo."
    );

    return;
  }

  /*
   * Confirmación opcional del resultado.
   */
  if (
    message.indexOf("\"testResultSaved\"") >= 0
  ) {
    Serial.println(
      "[EVENTO] Resultado guardado correctamente."
    );

    return;
  }
}

// =====================================================
// ENVIAR PAQUETES
// =====================================================

void sendPacket(String packet) {
  if (!webSocket.isConnected()) {
    Serial.println(
      "[ERROR] No se puede enviar: WebSocket desconectado."
    );

    return;
  }

  Serial.print("[ENVIANDO] ");
  Serial.println(packet);

  webSocket.sendTXT(packet);
}

void sendDevicePresence() {
  String packet =
    String("42") +
    SOCKET_NAMESPACE +
    ",[\"deviceConnected\",{" +
    "\"deviceId\":\"" +
    DEVICE_ID +
    "\"," +
    "\"deviceType\":\"" +
    DEVICE_TYPE +
    "\"," +
    "\"ipAddress\":\"" +
    WiFi.localIP().toString() +
    "\"," +
    "\"rssi\":" +
    String(WiFi.RSSI()) +
    "}]";

  sendPacket(packet);

  Serial.println(
    "[DISPOSITIVO] Presencia enviada al backend."
  );
}

// =====================================================
// RECIBIR START TEST
// =====================================================

void processStartTest(const String& message) {
  if (!namespaceConnected) {
    Serial.println(
      "[ERROR] startTest recibido sin namespace conectado."
    );

    return;
  }

  if (currentTest.active) {
    Serial.println(
      "[AVISO] Ya existe una prueba activa."
    );

    return;
  }

  String patientId = extractJsonString(
    message,
    "patientId"
  );

  int level = extractJsonInt(
    message,
    "level",
    1
  );

  if (patientId.length() == 0) {
    Serial.println(
      "[ERROR] startTest no contiene patientId."
    );

    return;
  }

  currentTest.patientId = patientId;

  currentTest.selectedLevel = constrain(
    level,
    1,
    4
  );

  prepareNewTest();

  Serial.println();
  Serial.println("======================================");
  Serial.println("NUEVA PRUEBA RECIBIDA");
  Serial.println("======================================");

  Serial.print("Paciente: ");
  Serial.println(currentTest.patientId);

  Serial.print("Nivel seleccionado: ");
  Serial.println(currentTest.selectedLevel);

  Serial.print("Tiempo limite: ");
  Serial.print(currentTest.expectedTimeoutMs);
  Serial.println(" ms");

  Serial.println(
    "Preparado... espere que se encienda un LED."
  );
}

// =====================================================
// PREPARAR PRUEBA
// =====================================================

void prepareNewTest() {
  resetGameOutputs();

  currentTest.active = true;
  currentTest.preparing = true;
  currentTest.ledActivated = false;

  currentTest.timeout = false;
  currentTest.success = false;

  currentTest.correctButton = -1;
  currentTest.pressedButton = -1;

  currentTest.startedAt = 0;
  currentTest.reactionTimeMs = 0;
  currentTest.simulationTargetMs = 0;

  currentTest.expectedTimeoutMs =
    levelTimeoutMs(
      currentTest.selectedLevel
    );

  currentTest.preparationStartedAt = millis();

  currentTest.preparationDelayMs = random(
    MIN_PREPARATION_MS,
    MAX_PREPARATION_MS + 1
  );
}

// =====================================================
// JUEGO FÍSICO
// =====================================================

void runRealGame() {
  if (!currentTest.active) {
    return;
  }

  /*
   * Fase de preparación.
   */
  if (currentTest.preparing) {
    /*
     * No iniciar si algún botón está presionado.
     */
    if (anyButtonPressed()) {
      currentTest.preparationStartedAt = millis();
      return;
    }

    unsigned long preparationElapsed =
      millis() -
      currentTest.preparationStartedAt;

    if (
      preparationElapsed <
      currentTest.preparationDelayMs
    ) {
      return;
    }

    currentTest.correctButton =
      pickRandomLed();

    showLed(
      currentTest.correctButton,
      true
    );

    /*
     * El cronómetro comienza exactamente cuando
     * se enciende el LED.
     */
    currentTest.startedAt = millis();

    currentTest.preparing = false;
    currentTest.ledActivated = true;

    Serial.print("[JUEGO] LED encendido: ");
    Serial.println(
      currentTest.correctButton + 1
    );

    return;
  }

  if (!currentTest.ledActivated) {
    return;
  }

  unsigned long elapsed =
    millis() - currentTest.startedAt;

  /*
   * Tiempo agotado.
   */
  if (
    elapsed >=
    currentTest.expectedTimeoutMs
  ) {
    currentTest.timeout = true;
    currentTest.success = false;

    currentTest.reactionTimeMs =
      currentTest.expectedTimeoutMs;

    currentTest.pressedButton = -1;

    Serial.println(
      "[JUEGO] Tiempo agotado."
    );

    sendResult();
    return;
  }

  /*
   * Leer botón presionado.
   */
  int pressedButton = readPressedButton();

  if (pressedButton < 0) {
    return;
  }

  currentTest.pressedButton =
    pressedButton;

  currentTest.reactionTimeMs =
    elapsed;

  currentTest.success =
    pressedButton ==
    currentTest.correctButton;

  currentTest.timeout = false;

  if (currentTest.success) {
    Serial.print(
      "[JUEGO] Correcto. Tiempo: "
    );

    Serial.print(
      currentTest.reactionTimeMs
    );

    Serial.println(" ms");
  } else {
    Serial.print(
      "[JUEGO] Incorrecto. Presionaste: "
    );

    Serial.print(
      currentTest.pressedButton + 1
    );

    Serial.print(
      " | Debias presionar: "
    );

    Serial.println(
      currentTest.correctButton + 1
    );
  }

  sendResult();
}

// =====================================================
// SIMULACIÓN
// =====================================================

void runSimulation() {
  if (!currentTest.active) {
    return;
  }

  if (currentTest.preparing) {
    currentTest.correctButton =
      random(0, 3);

    currentTest.pressedButton =
      currentTest.correctButton;

    currentTest.startedAt = millis();

    currentTest.simulationTargetMs =
      simulationDelayMs(
        currentTest.selectedLevel
      );

    currentTest.preparing = false;
    currentTest.ledActivated = true;

    Serial.print(
      "[SIMULACION] Tiempo objetivo: "
    );

    Serial.print(
      currentTest.simulationTargetMs
    );

    Serial.println(" ms");

    return;
  }

  unsigned long elapsed =
    millis() - currentTest.startedAt;

  if (
    elapsed <
    currentTest.simulationTargetMs
  ) {
    return;
  }

  currentTest.reactionTimeMs =
    currentTest.simulationTargetMs;

  currentTest.timeout = false;
  currentTest.success = true;

  sendResult();
}

// =====================================================
// ENVIAR RESULTADO
// =====================================================

void sendResult() {
  resetGameOutputs();

  if (
    !webSocket.isConnected() ||
    !namespaceConnected
  ) {
    Serial.println(
      "[ERROR] No se pudo enviar el resultado."
    );

    finishTest();
    return;
  }

  String jsonPayload = "{";

  jsonPayload += "\"deviceId\":\"";
  jsonPayload += DEVICE_ID;
  jsonPayload += "\",";

  jsonPayload += "\"patientId\":\"";
  jsonPayload += currentTest.patientId;
  jsonPayload += "\",";

  jsonPayload += "\"reactionTime\":";
  jsonPayload += String(
    currentTest.reactionTimeMs
  );
  jsonPayload += ",";

  jsonPayload += "\"selectedLevel\":";
  jsonPayload += String(
    currentTest.selectedLevel
  );
  jsonPayload += ",";

  jsonPayload += "\"success\":";
  jsonPayload += (
    currentTest.success
      ? "true"
      : "false"
  );
  jsonPayload += ",";

  jsonPayload += "\"correctButton\":";
  jsonPayload += String(
    currentTest.correctButton
  );
  jsonPayload += ",";

  jsonPayload += "\"pressedButton\":";
  jsonPayload += String(
    currentTest.pressedButton
  );
  jsonPayload += ",";

  jsonPayload += "\"timeout\":";
  jsonPayload += (
    currentTest.timeout
      ? "true"
      : "false"
  );
  jsonPayload += ",";

  jsonPayload += "\"timestamp\":";
  jsonPayload += String(millis());

  jsonPayload += "}";

  String packet =
    String("42") +
    SOCKET_NAMESPACE +
    ",[\"testFinished\"," +
    jsonPayload +
    "]";

  sendPacket(packet);

  Serial.println();
  Serial.println(
    "[JUEGO] Resultado enviado al backend."
  );

  Serial.println(jsonPayload);

  finishTest();
}

// =====================================================
// FINALIZAR PRUEBA
// =====================================================

void finishTest() {
  currentTest.active = false;
  currentTest.preparing = false;
  currentTest.ledActivated = false;

  currentTest.timeout = false;
  currentTest.success = false;

  currentTest.correctButton = -1;
  currentTest.pressedButton = -1;

  currentTest.preparationStartedAt = 0;
  currentTest.preparationDelayMs = 0;

  currentTest.startedAt = 0;
  currentTest.reactionTimeMs = 0;
  currentTest.simulationTargetMs = 0;

  resetGameOutputs();

  Serial.println(
    "[JUEGO] Esperando otra prueba desde el backend..."
  );
}

// =====================================================
// NIVELES
// =====================================================

unsigned long levelTimeoutMs(int level) {
  switch (constrain(level, 1, 4)) {
    case 1:
      return 1500; // Fácil

    case 2:
      return 1000; // Medio

    case 3:
      return 500; // Difícil

    case 4:
      return 250; // Frenético

    default:
      return 1500;
  }
}

unsigned long simulationDelayMs(int level) {
  switch (constrain(level, 1, 4)) {
    case 1:
      return random(650, 1200);

    case 2:
      return random(450, 850);

    case 3:
      return random(250, 450);

    case 4:
      return random(120, 230);

    default:
      return random(650, 1200);
  }
}

// =====================================================
// HARDWARE
// =====================================================

void resetGameOutputs() {
  for (uint8_t i = 0; i < 3; i++) {
    digitalWrite(
      LED_PINS[i],
      LOW
    );
  }
}

void resetTestContext() {
  currentTest.patientId = "";
  currentTest.selectedLevel = 1;

  currentTest.active = false;
  currentTest.preparing = false;
  currentTest.ledActivated = false;

  currentTest.timeout = false;
  currentTest.success = false;

  currentTest.correctButton = -1;
  currentTest.pressedButton = -1;

  currentTest.preparationStartedAt = 0;
  currentTest.preparationDelayMs = 0;

  currentTest.startedAt = 0;
  currentTest.expectedTimeoutMs = 0;
  currentTest.reactionTimeMs = 0;

  currentTest.simulationTargetMs = 0;
}

void showLed(
  uint8_t ledIndex,
  bool state
) {
  if (ledIndex >= 3) {
    return;
  }

  digitalWrite(
    LED_PINS[ledIndex],
    state ? HIGH : LOW
  );
}

bool anyButtonPressed() {
  for (uint8_t i = 0; i < 3; i++) {
    if (
      digitalRead(BUTTON_PINS[i]) == LOW
    ) {
      return true;
    }
  }

  return false;
}

int readPressedButton() {
  static bool previousState[3] = {
    HIGH,
    HIGH,
    HIGH
  };

  static unsigned long lastChangeAt[3] = {
    0,
    0,
    0
  };

  unsigned long now = millis();

  for (uint8_t i = 0; i < 3; i++) {
    bool currentState =
      digitalRead(BUTTON_PINS[i]);

    /*
     * Detectar transición HIGH -> LOW.
     */
    if (
      previousState[i] == HIGH &&
      currentState == LOW &&
      now - lastChangeAt[i] >=
        BUTTON_DEBOUNCE_MS
    ) {
      previousState[i] =
        currentState;

      lastChangeAt[i] = now;

      return i;
    }

    if (
      previousState[i] !=
      currentState
    ) {
      previousState[i] =
        currentState;

      lastChangeAt[i] = now;
    }
  }

  return -1;
}

int pickRandomLed() {
  return random(0, 3);
}

// =====================================================
// UTILIDADES
// =====================================================

String payloadToString(
  uint8_t* payload,
  size_t length
) {
  String message;
  message.reserve(length + 1);

  for (size_t i = 0; i < length; i++) {
    message += static_cast<char>(
      payload[i]
    );
  }

  return message;
}

String extractJsonString(
  const String& json,
  const String& key
) {
  String needle =
    "\"" + key + "\"";

  int start =
    json.indexOf(needle);

  if (start < 0) {
    return "";
  }

  start =
    json.indexOf(':', start);

  if (start < 0) {
    return "";
  }

  int firstQuote =
    json.indexOf('"', start + 1);

  if (firstQuote < 0) {
    return "";
  }

  int secondQuote =
    json.indexOf('"', firstQuote + 1);

  if (secondQuote < 0) {
    return "";
  }

  return json.substring(
    firstQuote + 1,
    secondQuote
  );
}

int extractJsonInt(
  const String& json,
  const String& key,
  int defaultValue
) {
  String needle =
    "\"" + key + "\"";

  int start =
    json.indexOf(needle);

  if (start < 0) {
    return defaultValue;
  }

  start =
    json.indexOf(':', start);

  if (start < 0) {
    return defaultValue;
  }

  int numberStart =
    start + 1;

  while (
    numberStart < json.length() &&
    (
      json[numberStart] == ' ' ||
      json[numberStart] == '\t' ||
      json[numberStart] == '"'
    )
  ) {
    numberStart++;
  }

  int numberEnd =
    numberStart;

  while (
    numberEnd < json.length() &&
    (
      isDigit(json[numberEnd]) ||
      json[numberEnd] == '-'
    )
  ) {
    numberEnd++;
  }

  if (numberEnd <= numberStart) {
    return defaultValue;
  }

  return json.substring(
    numberStart,
    numberEnd
  ).toInt();
}
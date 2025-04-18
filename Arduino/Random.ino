// Arduino sketch to simulate 30 sensors and send values via Serial in JSON format
// No start/stop commands - sends data continuously

void setup() {
    // Initialize serial communication at 9600 baud rate
    Serial.begin(9600);
    
    // Wait for serial port to connect
    while (!Serial) {
      ; // Wait for serial port to connect. Needed for native USB port only
    }
    
    // Use analog pin 0 to seed the random number generator
    randomSeed(analogRead(0));
    
    // Send ready message
    Serial.println("{\"status\":\"ready\"}");
  }
  
  void loop() {
    // Send sensor data as JSON
    String jsonData = "{";
    
    // Generate random values for 30 sensors
    for (int i = 1; i <= 30; i++) {
      // Add sensor key and random value
      jsonData += "\"sensor_" + String(i) + "\":" + String(random(101));
      
      // Add comma for all but last element
      if (i < 30) {
        jsonData += ",";
      }
    }
    
    // End JSON string
    jsonData += "}";
    
    // Send JSON string over serial
    Serial.println(jsonData);
    
    // Wait for a second before sending new values
    delay(1000);
  }
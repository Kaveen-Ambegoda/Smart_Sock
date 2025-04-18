// Arduino sketch to simulate 30 sensors and send real values for sensors 1 and 16

int smoothedReading;
int smoothingArrA[5] = {0, 0, 0, 0, 0}; // For sensor 1 (pin 11)
int smoothingArrB[5] = {0, 0, 0, 0, 0}; // For sensor 16 (pin 7)

int smooth(int pressureReading, int line) {
  int sum = 0;
  
  if (line == 1) {
    for (int i = 0; i < 4; i++) {
      smoothingArrA[i] = smoothingArrA[i+1];
      sum += smoothingArrA[i];
    }
    smoothingArrA[4] = pressureReading;
  }
  
  if (line == 0) {
    for (int i = 0; i < 4; i++) {
      smoothingArrB[i] = smoothingArrB[i+1];
      sum += smoothingArrB[i];
    }
    smoothingArrB[4] = pressureReading;
  }
  
  sum += pressureReading; 
  return sum / 5;         
}

void setup() {
  // Initialize serial communication at 9600 baud rate
  Serial.begin(9600);
  
  // Wait for serial port to connect
  while (!Serial) {
    ; // Wait for serial port to connect. Needed for native USB port only
  }
  
  randomSeed(66);
  
  // Send ready message
  Serial.println("{\"status\":\"ready\"}");
}

void loop() {
  // Read and smooth the real sensor values (map from 0-1023 to 0-100)
  int sensor1Value = map(smooth(analogRead(11), 1), 0, 1023, 0, 100);
  int sensor16Value = map(smooth(analogRead(7), 0), 0, 1023, 0, 100);
  
  // Start building JSON data string
  String jsonData = "{";
  
  // Generate values for all 30 sensors (mix of real and random)
  for (int i = 1; i <= 30; i++) {
    jsonData += "\"sensor_" + String(i) + "\":";
    
    // Use real values for sensors 1 and 16, random for others
    if (i == 1) {
      jsonData += String(sensor1Value);
    } 
    else if (i == 16) {
      jsonData += String(sensor16Value);
    } 
    else {
      jsonData += String(random(101)); // Random value between 0-100
    }
    
    // Add comma for all but last element
    if (i < 30) {
      jsonData += ",";
    }
  }
  
  // End JSON string
  jsonData += "}";
  
  // Send JSON string over serial
  Serial.println(jsonData);
}
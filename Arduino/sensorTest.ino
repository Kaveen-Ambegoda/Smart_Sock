int smoothedReading;
int smoothingArrA[5] = {0, 0, 0, 0, 0};
int smoothingArrB[5] = {0, 0, 0, 0, 0};

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
  Serial.begin(57600);
}

void loop() {
  smoothedReading = smooth(analogRead(11), 1);
  Serial.print("Sensor A: ");
  Serial.println(smoothedReading);
  delay(5); 

  smoothedReading = smooth(analogRead(7), 0);
  Serial.print("Sensor B: ");
  Serial.println(smoothedReading);
  delay(5); 
}

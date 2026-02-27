# Completed Work - Smart Sock Simulation + Classification

Date: 2026-02-07

This document captures the full set of changes made during this chat, why each change was made, and how the system now works end-to-end.

---

## 1) What you asked for

You wanted a system that could:
- Simulate foot pressure patterns for testing (not just random values).
- Provide explicit classifications for four patterns:
  1) Foot on ground (all sensors maxed / red).
  2) Foot in air (all sensors zero / white).
  3) Heel touch (sensors 1-3 maxed, rest zero).
  4) Toe touch (sensors 21-30 maxed, rest zero).
- Allow selecting these patterns from the dropdown.
- Later, replace multiple simulation choices with a single timed sequence mode.
- Add real Arduino hardware reading from COM ports with the same classification logic.
- Display classification in the UI, and use thresholds for real-world noisy sensor readings.
- Produce a detailed explanation of what changed and why.

---

## 2) Final behavior (how the system works now)

### Data sources
- **Simulation**: A single profile named **Simulation - Timed Sequence** cycles through: random, ground, air, heel, toe every 10 seconds.
- **Hardware**: Selecting a COM port connects to the Arduino and reads serial JSON data at 9600 baud.

### Classification rules (now used for both simulation and hardware)
Classification is calculated on every update, using thresholds for real sensor noise:
- **Foot On Ground**: all sensors >= 90
- **Foot In Air**: all sensors <= 5
- **Heel Touch**: sensors 1-3 >= 90, sensors 4-30 <= 5
- **Toe Touch**: sensors 21-30 >= 90, sensors 1-20 <= 5
- **Unclassified**: any other pattern

### UI output
- Sensor values update live via WebSocket.
- Classification is displayed in the header and as a badge on the foot diagram.

---

## 3) Backend changes (Flask)

### File: [flask-server/server.py](flask-server/server.py)

#### 3.1 Added classification state
**What:** Track the latest classification.

Code:
```python
current_classification = "Normal"
```

**Why:** The UI needs a stable, shared value that always reflects the latest detected posture.

---

#### 3.2 Added classification logic with thresholds
**What:** A function that classifies sensor values using realistic thresholds.

Code:
```python
def classify_sensor_state(values):
    """Classify foot contact state based on sensor values with thresholds.

    Thresholds:
    - Values >= 90 are treated as "maximum pressure" (sensor active)
    - Values <= 5 are treated as "zero pressure" (sensor inactive)
    - This handles realistic noisy sensor data from hardware
    """
    MAX_THRESHOLD = 90
    MIN_THRESHOLD = 5

    all_values = [values.get(f"sensor_{i}", 0) for i in range(1, 31)]

    if all(v >= MAX_THRESHOLD for v in all_values):
        return "Foot On Ground"
    if all(v <= MIN_THRESHOLD for v in all_values):
        return "Foot In Air"

    heel_max = all(values.get(f"sensor_{i}", 0) >= MAX_THRESHOLD for i in range(1, 4))
    heel_rest_zero = all(values.get(f"sensor_{i}", 0) <= MIN_THRESHOLD for i in range(4, 31))
    if heel_max and heel_rest_zero:
        return "Heel Touch"

    toe_max = all(values.get(f"sensor_{i}", 0) >= MAX_THRESHOLD for i in range(21, 31))
    toe_rest_zero = all(values.get(f"sensor_{i}", 0) <= MIN_THRESHOLD for i in range(1, 21))
    if toe_max and toe_rest_zero:
        return "Toe Touch"

    return "Unclassified"
```

**Why:** Real sensors are noisy, so exact 0/100 matching is unreliable. Thresholds make classification realistic for hardware use.

---

#### 3.3 Timed sequence simulation (single dropdown entry)
**What:** Replaced multiple simulation options with one timed sequence profile.

Code: 
```python
SIMULATION_PROFILES = {
    "sequence": {
        "label": "Simulation - Timed Sequence",
        "description": "Cycles random, ground, air, heel, toe every 10 seconds"
    }
}
```

**Why:** You wanted one simulation mode that automatically cycles through the five test patterns instead of separate dropdown choices.

---

#### 3.4 Timed cycle logic inside simulation thread
**What:** Simulation now cycles every 10 seconds and updates status based on the active sub-profile.

Code:
```python
sequence_profiles = ["random", "ground", "air", "heel", "toe"]
sequence_interval_seconds = 10
sequence_index = 0
last_switch_time = time.time()

# inside loop:
if mode == "sequence":
    now = time.time()
    if (now - last_switch_time) >= sequence_interval_seconds:
        sequence_index = (sequence_index + 1) % len(sequence_profiles)
        last_switch_time = now
    active_profile = sequence_profiles[sequence_index]
```

**Why:** This automatically simulates realistic motion across all posture patterns for demos without hardware.

---

#### 3.5 Simulation emits classification
**What:** After generating simulated sensor data, the backend classifies it and emits the classification to the UI.

Code:
```python
current_classification = classify_sensor_state(sensor_data)
socketio.emit('classification_update', current_classification)
```

**Why:** Keeps the UI in sync with the current simulated posture and lets you see the state without guessing.

---

#### 3.6 Arduino hardware updates also classify
**What:** When real sensor data arrives, it is classified and broadcast just like simulation.

Code:
```python
current_classification = classify_sensor_state(sensor_data)
socketio.emit('classification_update', current_classification)
```

**Why:** Guarantees that classification works on real data and not only simulation.

---

#### 3.7 API response includes classification
**What:** The initial API payload includes the current classification.

Code:
```python
return jsonify({
    "sensor_data": sensor_data,
    "arduino_status": connection_status,
    "classification": current_classification
})
```

**Why:** So the UI can show classification immediately on page load, even before the first WebSocket update arrives.

---

## 4) Frontend changes (React)

### File: [client/src/App.js](client/src/App.js)

#### 4.1 Added classification state in React
**What:** Store classification in React state.

Code:
```javascript
const [classification, setClassification] = useState('Normal');
```

**Why:** The UI needs to render and update classification when new data arrives.

---

#### 4.2 Listen for classification updates via WebSocket
**What:** React listens for classification updates from the backend.

Code:
```javascript
socket.on('classification_update', (data) => {
  setClassification(data || 'Unknown');
});
```

**Why:** Enables real-time UI updates with no refresh needed.

---

#### 4.3 Load classification on initial API request
**What:** The initial /api/sensors response now sets classification.

Code:
```javascript
setClassification(data.classification || 'Normal');
```

**Why:** Ensures the UI shows the current posture immediately after page load.

---

#### 4.4 Pass classification into the foot diagram
**What:** Dashboard passes the classification to the diagram component.

Code:
```javascript
<FootDiagram sensorValues={sensorValues} classification={classification} />
```

**Why:** The diagram needs classification to render the badge.

---

### File: [client/src/components/FootDiagram.js](client/src/components/FootDiagram.js)

#### 4.5 Accept classification prop
**What:** Component signature updated.

Code:
```javascript
const FootDiagram = ({ sensorValues, classification }) => {
```

**Why:** Receives classification for display.

---

#### 4.6 Added classification badge above diagram
**What:** Shows the current classification above the feet.

Code:
```javascript
{classification && classification !== 'Unknown' && (
  <div className="classification-badge">
    <strong>Current State:</strong> {classification}
  </div>
)}
```

**Why:** Adds immediate visual feedback so users know the detected posture.

---

### File: [client/src/components/FootDiagram.css](client/src/components/FootDiagram.css)

#### 4.7 Styling for classification badge
**What:** Added CSS to style and animate the badge.

Code:
```css
.classification-badge {
  position: absolute;
  top: -50px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #0fc508 0%, #0fc508 100%);
  color: white;
  padding: 12px 24px;
  border-radius: 25px;
  font-size: 1.1rem;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  z-index: 100;
  white-space: nowrap;
  animation: fadeInScale 0.3s ease;
}
```

**Why:** Makes classification stand out clearly while staying aligned with the layout.

---

## 5) Hardware integration (Arduino)

### Hardware setup reference
- **FSR sensor 1** -> **Analog pin 11**
- **FSR sensor 16** -> **Analog pin 7**
- Use **10k ohm voltage dividers**
- Upload [Arduino/SensorsWithRandomValues.ino](Arduino/SensorsWithRandomValues.ino)

### How the port is chosen
When you select a COM port (ex: COM3, COM4), the backend opens that port using:
```python
ser = serial.Serial(port, baud_rate, timeout=1)
```

If the port is not a simulation port, the system treats it as real hardware.

---

## 6) How real-time updates are delivered

**Flow:**
1. Arduino or simulation generates sensor data.
2. Backend updates `sensor_data` and `current_classification`.
3. Backend emits `sensor_update` and `classification_update` via WebSocket.
4. React receives updates and refreshes UI instantly.

This is why you see live sensor colors and the classification badge updating without refresh.

---

## 7) Summary of all files touched

- [flask-server/server.py](flask-server/server.py)
  - Added classification logic with thresholds.
  - Added timed sequence simulation.
  - Added classification emission on both hardware and simulation.
  - Added classification in API response.

- [client/src/App.js](client/src/App.js)
  - Added classification state.
  - Subscribed to classification WebSocket events.
  - Passed classification to diagram.

- [client/src/components/FootDiagram.js](client/src/components/FootDiagram.js)
  - Added classification prop and display badge.

- [client/src/components/FootDiagram.css](client/src/components/FootDiagram.css)
  - Added badge styling and animation.

---

## 8) How to run the system

### Backend
```bash
cd flask-server
python server.py
```

### Frontend
```bash
cd client
npm start
```

### Using simulation
1. Select **Simulation - Timed Sequence**
2. Click **Start Simulation**
3. Watch classifications update every 10 seconds

### Using Arduino
1. Plug in Arduino
2. Refresh ports
3. Choose COM port (COM3/COM4)
4. Click **Connect to Arduino**
5. Watch live classification update based on real sensor pressure

---

## 9) Notes for future improvements
- Make the sequence interval configurable from the UI.
- Add a history chart of classifications over time.
- Support additional custom foot patterns.
- Add an option to export live sensor logs.

---

End of completed work.

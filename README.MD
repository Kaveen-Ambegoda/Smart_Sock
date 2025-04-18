# Smart Socks Pressure Monitoring System

## Overview
The Smart Socks Pressure Monitoring System is a prototype that demonstrates real-time pressure mapping using Force-Sensing Resistor (FSR) sensors. The system consists of:

- A Python Flask backend for data processing and WebSocket communication
- A React-based frontend dashboard for real-time visualization
- Arduino-based sensor data acquisition
  - Currently using 2 physical FSR sensors (sensor_1 and sensor_16)
  - Simulating the remaining 28 sensors with random values

This repository contains all the necessary code to run the system and visualize foot pressure data in real-time.

## System Architecture

### Components
1. **Arduino Hardware**
   - Microcontroller with 2 FSR sensors connected to pins 11 (sensor_1) and 7 (sensor_16)
   - Serial communication over USB to the backend server

2. **Backend Server (Python/Flask)**
   - Manages serial communication with Arduino
   - Processes and broadcasts sensor data via WebSockets
   - Provides RESTful API endpoints for system status and control

3. **Frontend Dashboard (React)**
   - Interactive foot pressure visualization
   - Real-time updates via WebSocket connection
   - System status monitoring and control interface

## Prerequisites

### Hardware Requirements
- Arduino board 
- 2 Force-Sensing Resistor (FSR) sensors
- Resistors for voltage divider circuits 
- Breadboard and jumper wires
- USB cable for Arduino-to-computer connection

### Software Requirements
- Python 3.7+ with pip
- Node.js and npm
- Arduino IDE

## Installation Instructions

### 1. Arduino Setup
1. Connect the FSR sensors to the Arduino board:
   - FSR sensor 1 to analog pin 11
   - FSR sensor 16 to analog pin 7
   - Use voltage divider circuits with 10kΩ resistors for each sensor

2. Open the Arduino IDE and upload the `SensorsWithRandomValues.ino` sketch to your Arduino board.

### 2. Backend Setup
1. Clone this repository:
   ```bash
   git clone https://github.com/PankajaBalasooriya/Smart-Sock-project
   cd Smart-Sock-project
   ```

2. Create and activate a virtual environment:
   ```bash
   # For Windows
   python -m venv sockenv
   sockenv\Scripts\activate
   
   # For macOS/Linux
   python3 -m venv sockenv
   source sockenv/bin/activate
   ```

3. Install the required Python packages:
   ```bash
   pip install flask flask-socketio flask-cors pyserial python-socketio eventlet
   ```

### 3. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd client
   ```

2. Install the required Node.js packages:
   ```bash
   npm install
   ```

3. Build the frontend (or use development mode):
   ```bash
   # For production build
   npm run build
   
   # For development mode
   npm start
   ```

## Running the System

### Starting the Backend Server
1. Make sure your virtual environment is activated.
2. Run the Flask server:
   ```bash
   # From the project root directory
   python server.py
   ```
   The server will start at http://localhost:5000

### Starting the Frontend (Development Mode)
If you're running the frontend in development mode:
1. In a separate terminal, navigate to the frontend directory
2. Start the React development server:
   ```bash
   npm start
   ```
   The frontend will be available at http://localhost:3000

### Starting the Frontend (Production Mode)
If you've built the frontend for production, it will be served by the Flask backend at http://localhost:5000

### Connecting to Arduino
1. Open the web interface in your browser
2. In the "Select Arduino Port" dropdown, choose the correct port for your Arduino
   - If your Arduino doesn't appear, click "Refresh Ports"
3. Click "Connect" to establish connection with the Arduino
4. The system status indicators should show "Connected" for both Server and Arduino

## Usage Guide
- Once connected, the system will display real-time pressure data from both feet
- Sensors are visualized with color gradients:
  - Green: Low pressure
  - Yellow - Orange: Medium pressure
  - Red: High pressure
- Sensor 1 and Sensor 16 display real values from the physical FSR sensors
- The remaining sensors display randomly generated values for demonstration purposes

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/sensors` | GET | Retrieves latest sensor values and Arduino status |
| `/api/status` | GET | Checks Arduino connectivity status |
| `/api/ports` | GET | Lists available serial ports |
| `/api/connect` | POST | Connects to specified Arduino port |
| `/api/disconnect` | POST | Disconnects from current Arduino port |

## WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `sensor_update` | Server → Client | Real-time updates of sensor values |
| `arduino_status` | Server → Client | Arduino connection status updates |

## Project Structure
```
SMART-SOCKS/
├── Arduino/
│   ├── Random.ino
│   ├── SensorsWithRandomValues.ino  # Use this Arduino sketch
│   └── sensorTest.ino
├── client/                         # React frontend
│   ├── node_modules/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── App.css
│   │   ├── App.js
│   │   ├── index.css
│   │   ├── index.js
│   │   ├── reportWebVitals.js
│   │   └── setupTests.js
│   ├── .gitignore
│   ├── package-lock.json
│   ├── package.json
│   └── README.md
└── flask-server/                   # Flask backend
    ├── sockenv/                    # Virtual environment
    ├── server.py                   # Main server file
    └── README.MD
```


## Contact
Pankaja Balasooriya

pankajabalasooriya566@gmail.com

+94 70 138 0990
# server.py
from flask import Flask, jsonify, request, send_from_directory
from flask_socketio import SocketIO
from flask_cors import CORS
import threading
import time
import random
import json
import serial
import serial.tools.list_ports

app = Flask(__name__, static_folder='../client/build', static_url_path='')
CORS(app) 
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading', ping_timeout=10, ping_interval=5)

# Initialize sensor data
sensor_data = {
    f"sensor_{i}": 0 for i in range(1, 31)  # 30 sensors total (15 per foot)
}

# Track connection status (supports both Arduino and Simulation)
connection_status = {
    "connected": False,
    "message": "Not connected",
    "port": "",
    "mode": "none"  # "arduino", "simulation", or "none"
}

# Global variables for threads and connections
arduino_thread = None
simulation_thread = None
ser = None
stop_arduino = False
stop_simulation = False
simulation_mode = "sequence"  # Default simulation profile
current_classification = "Normal"

# Predefined simulation profiles exposed to the UI
SIMULATION_PROFILES = {
    "sequence": {
        "label": "Simulation - Timed Sequence",
        "description": "Cycles random, ground, air, heel, toe every 10 seconds"
    }
}

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

    # Check if all sensors show maximum pressure (foot planted)
    if all(v >= MAX_THRESHOLD for v in all_values):
        return "Foot On Ground"
    
    # Check if all sensors show zero pressure (foot lifted)
    if all(v <= MIN_THRESHOLD for v in all_values):
        return "Foot In Air"

    # Check for heel touch: sensors 16-18 active, rest inactive
    heel_max = all(values.get(f"sensor_{i}", 0) >= MAX_THRESHOLD for i in range(16, 19))
    heel_rest_zero = all(values.get(f"sensor_{i}", 0) <= MIN_THRESHOLD for i in list(range(1, 16)) + list(range(19, 31)))
    if heel_max and heel_rest_zero:
        return "Heel Touch"

    # Check for toe touch: sensors 21-30 active, rest inactive
    toe_max = all(values.get(f"sensor_{i}", 0) >= MAX_THRESHOLD for i in range(21, 31))
    toe_rest_zero = all(values.get(f"sensor_{i}", 0) <= MIN_THRESHOLD for i in range(1, 21))
    if toe_max and toe_rest_zero:
        return "Toe Touch"

    return "Unclassified"

def get_available_ports():
    """Get list of available serial ports"""
    ports = []
    try:
        for port in serial.tools.list_ports.comports():
            ports.append({
                "device": port.device,
                "description": port.description
            })
    except Exception as e:
        print(f"Error listing ports: {e}")
    return ports

# Function to read serial data from Arduino
def read_arduino_data(port, baud_rate=9600):
    global sensor_data, connection_status, ser, stop_arduino, current_classification
    
    try:
        # Try to connect to Arduino
        ser = serial.Serial(port, baud_rate, timeout=1)
        print(f"Connected to Arduino on {port}")
        
        # Update connection status
        connection_status = {
            "connected": True,
            "message": f"Connected to Arduino on {port}",
            "port": port,
            "mode": "arduino"
        }
        socketio.emit('arduino_status', connection_status)
        
        time.sleep(2)  # Wait for Arduino to initialize
        
        # Main reading loop when connected
        while not stop_arduino:
            try:
                if ser.in_waiting > 0:
                    # Read line from serial port
                    line = ser.readline().decode('utf-8').strip()
                    
                    # Try to parse as JSON
                    try:
                        arduino_data = json.loads(line)
                        
                        # Update sensor data
                        for key, value in arduino_data.items():
                            if key in sensor_data:
                                sensor_data[key] = value
                        
                        # Emit the updated data to all connected clients
                        socketio.emit('sensor_update', sensor_data)

                        # Update and emit classification from live sensor data
                        current_classification = classify_sensor_state(sensor_data)
                        socketio.emit('classification_update', current_classification)
                    except json.JSONDecodeError:
                        print(f"Could not parse JSON from Arduino: {line}")
                
                time.sleep(0.1)
                
            except Exception as e:
                print(f"Error reading from serial port: {e}")
                break
                
    except serial.SerialException as e:
        # Update connection status to indicate Arduino is not connected
        connection_status = {
            "connected": False,
            "message": f"Arduino connection failed: {str(e)}",
            "port": port,
            "mode": "none"
        }
        socketio.emit('arduino_status', connection_status)
        print(f"Failed to connect to Arduino: {e}")
    
    finally:
        # Clean up
        if ser and ser.is_open:
            ser.close()
        
        # Update status
        connection_status = {
            "connected": False,
            "message": "Arduino disconnected",
            "port": "",
            "mode": "none"
        }
        socketio.emit('arduino_status', connection_status)

# Function to simulate sensor data (mimics Arduino behavior)
def simulate_sensor_data(mode="sequence"):
    """
    Simulates Arduino sensor readings:
    - Reads analog values (0-1023) and maps them to 0-100 pressure scale
    - Uses smoothing similar to Arduino code
    - Supports fixed profiles for quick posture classification
    """
    global sensor_data, connection_status, stop_simulation, simulation_mode, current_classification

    simulation_mode = mode
    
    # Smoothing arrays for each sensor (similar to Arduino code)
    smoothing_arrays = {f"sensor_{i}": [0] * 5 for i in range(1, 31)}
    
    print("Starting sensor data simulation...")
    update_count = 0
    last_log_time = time.time()
    
    # Sequence configuration
    sequence_profiles = ["random", "ground", "air", "heel", "toe"]
    sequence_labels = {
        "random": "Random",
        "ground": "Foot On Ground",
        "air": "Foot In Air",
        "heel": "Heel Touch",
        "toe": "Toe Touch"
    }
    sequence_interval_seconds = 10
    sequence_index = 0
    last_switch_time = time.time()
    last_profile = None

    while not stop_simulation:
        try:
            active_profile = mode
            if mode == "sequence":
                now = time.time()
                if (now - last_switch_time) >= sequence_interval_seconds:
                    sequence_index = (sequence_index + 1) % len(sequence_profiles)
                    last_switch_time = now
                active_profile = sequence_profiles[sequence_index]

            if mode == "sequence" and active_profile != last_profile:
                # Update status with the currently active sub-profile
                connection_status = {
                    "connected": True,
                    "message": f"{SIMULATION_PROFILES['sequence']['label']} (active: {sequence_labels.get(active_profile, active_profile)})",
                    "port": "Simulated:sequence",
                    "mode": "simulation"
                }
                socketio.emit('arduino_status', connection_status)
                last_profile = active_profile

            if active_profile == "random":
                # Simulate reading for each sensor with smoothing
                for i in range(1, 31):
                    sensor_key = f"sensor_{i}"
                    base_value = random.randint(0, 1023)
                    smoothing_arr = smoothing_arrays[sensor_key]
                    for j in range(4):
                        smoothing_arr[j] = smoothing_arr[j + 1]
                    smoothing_arr[4] = base_value
                    smoothed_value = sum(smoothing_arr) // 5
                    mapped_value = int((smoothed_value / 1023) * 100)
                    sensor_data[sensor_key] = mapped_value
            elif active_profile == "ground":
                # All sensors at maximum (foot planted)
                for i in range(1, 31):
                    sensor_data[f"sensor_{i}"] = 100
            elif active_profile == "air":
                # All sensors off (foot lifted)
                for i in range(1, 31):
                    sensor_data[f"sensor_{i}"] = 0
            elif active_profile == "heel":
                # Heel contact: sensors 1-3 only
                for i in range(1, 31):
                    sensor_key = f"sensor_{i}"
                    sensor_data[sensor_key] = 100 if 16 <= i <= 18 else 0
            elif active_profile == "toe":
                # Toe contact: sensors 21-30 only
                for i in range(1, 31):
                    sensor_key = f"sensor_{i}"
                    sensor_data[sensor_key] = 100 if 21 <= i <= 30 else 0
            else:
                # Fallback to random to stay resilient
                for i in range(1, 31):
                    sensor_data[f"sensor_{i}"] = random.randint(0, 100)
            
            # Emit the updated data to all connected clients
            socketio.emit('sensor_update', sensor_data)

            # Update and emit classification for the current simulated state
            current_classification = classify_sensor_state(sensor_data)
            socketio.emit('classification_update', current_classification)
            
            # Log update rate every 50 updates (every 5 seconds at 10 Hz)
            update_count += 1
            if update_count % 50 == 0:
                current_time = time.time()
                elapsed = current_time - last_log_time
                actual_rate = 50 / elapsed
                print(f"Sensor updates: {update_count} | Rate: {actual_rate:.2f} Hz (target: 10 Hz)")
                last_log_time = current_time
            
            # Small delay to simulate reading time
            # Adjust this value to control update speed:
            # 0.01 = 100 Hz (100 updates/sec) - Very fast
            # 0.05 = 20 Hz (20 updates/sec) - Fast
            # 0.1 = 10 Hz (10 updates/sec) - Default
            # 0.2 = 5 Hz (5 updates/sec) - Slow
            # 0.5 = 2 Hz (2 updates/sec) - Very slow
            # 1.0 = 1 Hz (1 update/sec) - Extremely slow
            # Lower frequency for static profiles to reduce noise; keep faster for random
            time.sleep(0.2 if active_profile == "random" else 0.5)
            
        except Exception as e:
            print(f"Error in simulation: {e}")
            break

@app.route('/api/ports', methods=['GET'])
def list_ports():
    """API endpoint to list available serial ports"""
    ports = get_available_ports()
    # Add simulation options (multiple profiles)
    for key, profile in SIMULATION_PROFILES.items():
        ports.append({
            "device": f"Simulated:{key}",
            "description": profile["description"],
            "label": profile["label"]
        })
    return jsonify(ports)

@app.route('/api/connect', methods=['POST'])
def connect_to_port():
    """API endpoint to connect to Arduino or start simulation"""
    global arduino_thread, simulation_thread, stop_arduino, stop_simulation, connection_status, simulation_mode
    
    data = request.json
    port = data.get('port', '')
    
    # Disconnect any existing connection first
    disconnect_from_port()
    
    if port.startswith("Simulated") or not port:
        # Choose simulation profile from port string
        mode_key = "sequence"
        if ":" in port:
            mode_key = port.split(":", 1)[1] or "sequence"
        if mode_key not in SIMULATION_PROFILES:
            mode_key = "sequence"

        stop_simulation = False
        simulation_thread = threading.Thread(target=simulate_sensor_data, args=(mode_key,), daemon=True)
        simulation_thread.start()
        simulation_mode = mode_key
        profile_label = SIMULATION_PROFILES.get(mode_key, {}).get("label", "Simulation - Timed Sequence")
        
        connection_status = {
            "connected": True,
            "message": f"{profile_label} active",
            "port": f"Simulated:{mode_key}",
            "mode": "simulation"
        }
        socketio.emit('arduino_status', connection_status)
        
        return jsonify({"success": True, "message": f"Simulation '{mode_key}' started"})
    else:
        # Try to connect to Arduino
        stop_arduino = False
        arduino_thread = threading.Thread(target=read_arduino_data, args=(port,), daemon=True)
        arduino_thread.start()
        
        # Give it a moment to try connecting
        time.sleep(0.5)
        
        return jsonify({
            "success": True, 
            "message": f"Attempting to connect to {port}..."
        })

@app.route('/api/disconnect', methods=['POST'])
def disconnect_from_port():
    """API endpoint to disconnect from Arduino or stop simulation"""
    global ser, arduino_thread, simulation_thread, stop_arduino, stop_simulation, connection_status
    
    # Stop Arduino connection
    stop_arduino = True
    
    # Close serial connection
    if ser and ser.is_open:
        ser.close()
        ser = None
    
    # Wait for Arduino thread to end
    if arduino_thread and arduino_thread.is_alive():
        arduino_thread.join(timeout=1.0)
    
    # Stop simulation
    stop_simulation = True
    
    # Wait for simulation thread to end
    if simulation_thread and simulation_thread.is_alive():
        simulation_thread.join(timeout=1.0)
    
    # Update status
    connection_status = {
        "connected": False,
        "message": "Disconnected",
        "port": "",
        "mode": "none"
    }
    socketio.emit('arduino_status', connection_status)
    
    return jsonify({"success": True, "message": "Disconnected"})

@app.route('/api/sensors', methods=['GET'])
def get_sensors():
    return jsonify({
        "sensor_data": sensor_data,
        "arduino_status": connection_status,
        "classification": current_classification
    })

@app.route('/api/status', methods=['GET'])
def get_status():
    return jsonify(connection_status)

@app.route('/', methods=['GET'])
def serve():
    return send_from_directory(app.static_folder, 'index.html')

@socketio.on('connect')
def handle_connect():
    global simulation_thread, stop_simulation, connection_status, simulation_mode, current_classification
    print('Client connected')
    # Send current sensor data and status to newly connected client
    socketio.emit('sensor_update', sensor_data, to=request.sid)
    socketio.emit('arduino_status', connection_status, to=request.sid)
    socketio.emit('classification_update', current_classification, to=request.sid)
    
    # Start simulation if nothing is connected
    if connection_status["mode"] == "none":
        if not simulation_thread or not simulation_thread.is_alive():
            stop_simulation = False
            simulation_thread = threading.Thread(target=simulate_sensor_data, args=(simulation_mode,), daemon=True)
            simulation_thread.start()
            
            connection_status = {
                "connected": True,
                "message": f"{SIMULATION_PROFILES.get(simulation_mode, {}).get('label', 'Simulation - Timed Sequence')} (auto-started)",
                "port": f"Simulated:{simulation_mode}",
                "mode": "simulation"
            }
            socketio.emit('arduino_status', connection_status)

if __name__ == '__main__':
    # Start simulation automatically if no Arduino is connected
    stop_simulation = False
    simulation_thread = threading.Thread(target=simulate_sensor_data, args=(simulation_mode,), daemon=True)
    simulation_thread.start()
    
    connection_status = {
        "connected": True,
        "message": f"{SIMULATION_PROFILES.get(simulation_mode, {}).get('label', 'Simulation - Timed Sequence')} (auto-started)",
        "port": f"Simulated:{simulation_mode}",
        "mode": "simulation"
    }
    
    # Use socketio.run instead of app.run
    socketio.run(app, debug=True, port=5000)
# backend/app.py
from flask import Flask, jsonify, request, send_from_directory
from flask_socketio import SocketIO
from flask_cors import CORS
import threading
import time
import serial
import json
import serial.tools.list_ports

app = Flask(__name__, static_folder='../frontend/build', static_url_path='')
CORS(app)  # Enable CORS for all routes
socketio = SocketIO(app, cors_allowed_origins="*")

# Initialize sensor data
sensor_data = {
    f"sensor_{i}": 0 for i in range(1, 31)  # 30 sensors total (15 per foot)
}

# Track Arduino connection status
arduino_status = {
    "connected": False,
    "message": "Arduino not connected",
    "port": ""
}

# Global variable for serial connection
ser = None
read_thread = None
stop_thread = False

def get_available_ports():
    """Get list of available serial ports"""
    ports = []
    for port in serial.tools.list_ports.comports():
        ports.append({
            "device": port.device,
            "description": port.description
        })
    return ports

# Function to read serial data from Arduino and emit via WebSockets
def read_arduino_data(port, baud_rate=9600):
    global sensor_data, arduino_status, ser, stop_thread
    
    try:
        # Try to connect to Arduino
        ser = serial.Serial(port, baud_rate, timeout=1)
        print(f"Connected to Arduino on {port}")
        
        # Update connection status
        arduino_status = {
            "connected": True,
            "message": f"Connected to Arduino on {port}",
            "port": port
        }
        socketio.emit('arduino_status', arduino_status)
        
        # Allow Arduino to reset after connection (Arduino resets when serial connection is established)
        time.sleep(2)
        
        # Main reading loop when connected
        while not stop_thread:
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
                    except json.JSONDecodeError:
                        print(f"Could not parse JSON from Arduino: {line}")
                
                time.sleep(0.1)
                
            except Exception as e:
                print(f"Error reading from serial port: {e}")
                break
                
    except serial.SerialException as e:
        # Update connection status to indicate Arduino is not connected
        arduino_status = {
            "connected": False,
            "message": f"Arduino not connected: {str(e)}",
            "port": port
        }
        socketio.emit('arduino_status', arduino_status)
        
        print(f"Failed to connect to Arduino: {e}")
    
    finally:
        # Clean up
        if ser and ser.is_open:
            ser.close()
        
        # Update status
        arduino_status["connected"] = False
        arduino_status["message"] = "Arduino disconnected"
        socketio.emit('arduino_status', arduino_status)

@app.route('/api/ports', methods=['GET'])
def list_ports():
    """API endpoint to list available serial ports"""
    return jsonify(get_available_ports())

@app.route('/api/connect', methods=['POST'])
def connect_to_port():
    """API endpoint to connect to a specific port"""
    global read_thread, stop_thread
    
    data = request.json
    port = data.get('port')
    
    if not port:
        return jsonify({"success": False, "message": "No port specified"}), 400
    
    # Stop any existing thread
    disconnect_from_port()
    
    # Start new thread
    stop_thread = False
    read_thread = threading.Thread(target=read_arduino_data, args=(port,), daemon=True)
    read_thread.start()
    
    return jsonify({"success": True, "message": f"Connecting to {port}..."})

@app.route('/api/disconnect', methods=['POST'])
def disconnect_from_port():
    """API endpoint to disconnect from current port"""
    global ser, read_thread, stop_thread, arduino_status
    
    # Signal thread to stop
    stop_thread = True
    
    # Close serial connection
    if ser and ser.is_open:
        ser.close()
    
    # Wait for thread to end
    if read_thread and read_thread.is_alive():
        read_thread.join(timeout=1.0)
    
    # Update status
    arduino_status = {
        "connected": False,
        "message": "Disconnected",
        "port": ""
    }
    socketio.emit('arduino_status', arduino_status)
    
    return jsonify({"success": True, "message": "Disconnected"})

@app.route('/api/sensors', methods=['GET'])
def get_sensors():
    return jsonify({
        "sensor_data": sensor_data,
        "arduino_status": arduino_status
    })

@app.route('/api/status', methods=['GET'])
def get_status():
    return jsonify(arduino_status)

@app.route('/', methods=['GET'])
def serve():
    return send_from_directory(app.static_folder, 'index.html')

@socketio.on('connect')
def handle_connect():
    print('Client connected')
    # Send current sensor data and status to newly connected client
    socketio.emit('sensor_update', sensor_data, to=request.sid)
    socketio.emit('arduino_status', arduino_status, to=request.sid)

if __name__ == '__main__':
    # Use socketio.run instead of app.run
    socketio.run(app, debug=True, port=5000)
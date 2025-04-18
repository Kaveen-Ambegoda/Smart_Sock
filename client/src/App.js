// src/App.js
import React, { useState, useEffect } from 'react';
import './App.css';
import FootDiagram from './components/FootDiagram';
import io from 'socket.io-client';

function App() {
  const [sensorValues, setSensorValues] = useState({});
  const [socketStatus, setSocketStatus] = useState('Connecting...');
  const [arduinoStatus, setArduinoStatus] = useState({
    connected: false,
    message: 'Arduino not connected',
    port: ''
  });
  const [availablePorts, setAvailablePorts] = useState([]);
  const [selectedPort, setSelectedPort] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Function to fetch available ports
  const fetchPorts = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/ports');
      if (response.ok) {
        const ports = await response.json();
        setAvailablePorts(ports);
        
        // If we have ports and none is selected, select the first one
        if (ports.length > 0 && !selectedPort) {
          setSelectedPort(ports[0].device);
        }
      }
    } catch (error) {
      console.error('Error fetching ports:', error);
    }
  };

  // Function to connect to selected port
  const connectToPort = async () => {
    if (!selectedPort) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ port: selectedPort })
      });
      
      const result = await response.json();
      console.log(result);
    } catch (error) {
      console.error('Error connecting to port:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to disconnect
  const disconnectPort = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/disconnect', {
        method: 'POST'
      });
      
      const result = await response.json();
      console.log(result);
    } catch (error) {
      console.error('Error disconnecting:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh ports
  const handleRefreshPorts = () => {
    fetchPorts();
  };

  useEffect(() => {
    // Initialize all 30 sensors with default values
    const initialValues = {};
    for (let i = 1; i <= 30; i++) {
      initialValues[`sensor_${i}`] = 0;
    }
    setSensorValues(initialValues);

    // Fetch available ports initially
    fetchPorts();

    // WebSocket connection for real-time updates
    const socket = io('http://localhost:5000');
    
    socket.on('connect', () => {
      console.log('WebSocket connected');
      setSocketStatus('Connected');
    });
    
    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setSocketStatus('Disconnected');
    });
    
    socket.on('sensor_update', (data) => {
      setSensorValues(data);
    });
    
    socket.on('arduino_status', (status) => {
      console.log('Received Arduino status:', status);
      setArduinoStatus(status);
    });
    
    // Initial HTTP request to get data and status 
    const fetchInitialData = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/sensors');
        if (response.ok) {
          const data = await response.json();
          setSensorValues(data.sensor_data);
          setArduinoStatus(data.arduino_status);
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
    };
    
    fetchInitialData();
    
    // Cleanup on component unmount
    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Smart Socks Pressure Visualization</h1>
        <div className="status-container">
          <span className={`status-indicator ${socketStatus === 'Connected' ? 'connected' : 'disconnected'}`}>
            Server: {socketStatus}
          </span>
          <span className={`status-indicator ${arduinoStatus.connected ? 'connected' : 'disconnected'}`}>
            Arduino: {arduinoStatus.connected ? 'Connected' : 'Disconnected'}
          </span>
          {arduinoStatus.connected && (
            <span className="status-indicator streaming">
              Receiving Data...
            </span>
          )}
        </div>
      </header>
      
      <div className="control-panel">
        <div className="port-selector">
          <label htmlFor="port-select">Select Arduino Port:</label>
          <select 
            id="port-select"
            value={selectedPort}
            onChange={(e) => setSelectedPort(e.target.value)}
            disabled={arduinoStatus.connected || isLoading}
          >
            <option value="">Select a port</option>
            {availablePorts.map((port, index) => (
              <option key={index} value={port.device}>
                {port.device} - {port.description}
              </option>
            ))}
          </select>
          <button 
            onClick={handleRefreshPorts} 
            disabled={isLoading || arduinoStatus.connected}
            className="button refresh"
          >
            Refresh Ports
          </button>
        </div>
        
        <div className="connection-controls">
          {!arduinoStatus.connected ? (
            <button 
              onClick={connectToPort} 
              disabled={!selectedPort || isLoading}
              className="button connect"
            >
              Connect
            </button>
          ) : (
            <button 
              onClick={disconnectPort} 
              disabled={isLoading}
              className="button disconnect"
            >
              Disconnect
            </button>
          )}
        </div>
      </div>

      {!arduinoStatus.connected && (
        <div className="arduino-error">
          <p>⚠️ Arduino is not connected</p>
          <p className="error-message">{arduinoStatus.message}</p>
          <p>Please select a port and click Connect.</p>
        </div>
      )}
      
      <div className="main-content centered">
        <div className="visualization-container">
          <FootDiagram sensorValues={sensorValues} />
        </div>
      </div>
    </div>
  );
}

export default App;
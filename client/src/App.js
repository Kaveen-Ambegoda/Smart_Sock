// src/App.js
import React, { useState, useEffect } from 'react';
import './App.css';
import FootDiagram from './components/FootDiagram';
import SensorButtons from './components/SensorButtons';
import io from 'socket.io-client';

function App() {
  const [sensorValues, setSensorValues] = useState({});
  const [socketStatus, setSocketStatus] = useState('Connecting...');
  const [arduinoStatus, setArduinoStatus] = useState({
    connected: false,
    message: 'Not connected',
    port: '',
    mode: 'none'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  const [availablePorts, setAvailablePorts] = useState([]);
  const [selectedPort, setSelectedPort] = useState('');

  // Function to fetch available ports
  const fetchPorts = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/ports');
      if (response.ok) {
        const ports = await response.json();
        setAvailablePorts(ports);
        
        // Auto-select simulation if available
        const simulatedPort = ports.find(p => p.device === 'Simulated');
        if (simulatedPort && !selectedPort) {
          setSelectedPort('Simulated');
        }
      }
    } catch (error) {
      console.error('Error fetching ports:', error);
    }
  };

  // Function to connect to selected port (Arduino or Simulation)
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
      console.error('Error connecting:', error);
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


  useEffect(() => {
    // Initialize all 30 sensors with default values
    const initialValues = {};
    for (let i = 1; i <= 30; i++) {
      initialValues[`sensor_${i}`] = 0;
    }
    setSensorValues(initialValues);

    // Fetch available ports
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
            {arduinoStatus.mode === 'arduino' 
              ? `Arduino: ${arduinoStatus.port || 'Connected'}` 
              : arduinoStatus.mode === 'simulation' 
              ? 'Simulation: Active' 
              : 'Not Connected'}
          </span>
          {arduinoStatus.connected && (
            <span className="status-indicator streaming">
              Receiving Data...
            </span>
          )}
        </div>
      </header>
      
      <div className="control-panel">
        <div className="connection-controls-wrapper">
        <div className="port-selector">
            <label htmlFor="port-select">
              <strong>Select Connection:</strong>
            </label>
          <select 
            id="port-select"
            value={selectedPort}
            onChange={(e) => setSelectedPort(e.target.value)}
            disabled={arduinoStatus.connected || isLoading}
          >
              <option value="">Select a port...</option>
            {availablePorts.map((port, index) => (
              <option key={index} value={port.device}>
                  {port.device === 'Simulated' 
                    ? '🔹 Simulation Mode' 
                    : `${port.device} - ${port.description}`}
              </option>
            ))}
          </select>
          <button 
              onClick={fetchPorts} 
            disabled={isLoading || arduinoStatus.connected}
            className="button refresh"
              title="Refresh available ports"
          >
              🔄 Refresh
          </button>
        </div>
        
          <div className="connection-buttons">
          {!arduinoStatus.connected ? (
            <button 
              onClick={connectToPort} 
              disabled={!selectedPort || isLoading}
              className="button connect"
            >
                {selectedPort === 'Simulated' ? 'Start Simulation' : 'Connect to Arduino'}
            </button>
          ) : (
              <>
            <button 
              onClick={disconnectPort} 
              disabled={isLoading}
              className="button disconnect"
            >
              Disconnect
            </button>
                <span className="connection-mode-info">
                  {arduinoStatus.mode === 'arduino' 
                    ? `📡 Connected to Arduino on ${arduinoStatus.port}` 
                    : '🔹 Simulation Mode Active'}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="main-layout">
        {/* Left Panel - Navigation (30%) */}
        <div className="left-panel">
          <nav className="navigation-menu">
            <h2>Navigation</h2>
            <button 
              className={`nav-button ${activeView === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveView('dashboard')}
            >
              Dashboard
            </button>
            <button 
              className={`nav-button ${activeView === 'live-data' ? 'active' : ''}`}
              onClick={() => setActiveView('live-data')}
            >
              Live Data
            </button>
            <button 
              className={`nav-button ${activeView === 'alerts' ? 'active' : ''}`}
              onClick={() => setActiveView('alerts')}
            >
              Alerts
            </button>
            <button 
              className={`nav-button ${activeView === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveView('analytics')}
            >
              Analytics
            </button>
          </nav>
        </div>

        {/* Right Panel - Content (70%) */}
        <div className="right-panel">
          {activeView === 'dashboard' && (
            <div className="dashboard-view">
              <SensorButtons sensorValues={sensorValues} />
              <div className="foot-diagram-section">
                <FootDiagram sensorValues={sensorValues} />
              </div>
            </div>
          )}
          
          {activeView === 'live-data' && (
            <div className="live-data-view">
              <SensorButtons sensorValues={sensorValues} />
            </div>
          )}
          
          {activeView === 'alerts' && (
            <div className="alerts-view">
              <h2>Alerts</h2>
              <p>Alert system coming soon...</p>
        </div>
      )}
      
          {activeView === 'analytics' && (
            <div className="analytics-view">
              <h2>Analytics</h2>
              <p>Analytics dashboard coming soon...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
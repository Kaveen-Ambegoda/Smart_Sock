// src/components/SensorButtons.js
import React from 'react';
import './SensorButtons.css';

const SensorButtons = ({ sensorValues }) => {
  // Function to get color based on sensor value
  const getSensorColor = (value) => {
    if (value === 0) return "white";
    if (value <= 30) return "green";
    if (value <= 70) return "yellow";
    return "red";
  };

  // Function to get text color based on background
  const getTextColor = (value) => {
    if (value === 0) return "black";
    if (value <= 30) return "white";
    if (value <= 70) return "black";
    return "white";
  };

  return (
    <div className="sensor-buttons-container">
      <h2>Sensor Readings</h2>
      <div className="sensor-buttons-grid">
        {Object.keys(sensorValues)
          .sort((a, b) => {
            const numA = parseInt(a.replace('sensor_', ''));
            const numB = parseInt(b.replace('sensor_', ''));
            return numA - numB;
          })
          .map(sensorId => {
            const value = sensorValues[sensorId] || 0;
            const sensorNum = sensorId.replace('sensor_', '');
            const bgColor = getSensorColor(value);
            const textColor = getTextColor(value);
            
            return (
              <button
                key={sensorId}
                className="sensor-button"
                style={{
                  backgroundColor: bgColor,
                  color: textColor,
                  border: `2px solid ${bgColor === 'white' ? '#ccc' : bgColor}`
                }}
              >
                <div className="sensor-button-label">Sensor {sensorNum}</div>
                <div className="sensor-button-value">{value}</div>
              </button>
            );
          })}
      </div>
    </div>
  );
};

export default SensorButtons;


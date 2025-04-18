// src/components/SensorSliders.js
import React from 'react';
import './SensorSliders.css';

const SensorSliders = ({ sensorValues, onChange }) => {
  return (
    <div className="sensor-sliders">
      <h2>Pressure Sensor Controls</h2>
      <div className="sliders-container">
        {Object.keys(sensorValues).sort().map(sensorId => (
          <div key={sensorId} className="slider-group">
            <label htmlFor={sensorId}>
              Sensor {sensorId.replace('sensor_', '')}:
              <span className="value-display">{sensorValues[sensorId]}</span>
            </label>
            <input
              type="range"
              id={sensorId}
              min="0"
              max="100"
              value={sensorValues[sensorId] || 0}
              onChange={(e) => onChange(sensorId, parseInt(e.target.value, 10))}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default SensorSliders;
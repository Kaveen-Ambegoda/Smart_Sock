// src/components/FootDiagram.js
import React from 'react';
import './FootDiagram.css';
import leftFootImage from '../assets/left-foot.jpg';
import rightFootImage from '../assets/right-foot.jpg';

const FootDiagram = ({ sensorValues }) => {
  // Sensor positions for left foot - you'll need to adjust these values
  const leftFootSensorPositions = {
    sensor_1: { top: '85%', left: '50%' },
    sensor_2: { top: '75%', left: '40%' },
    sensor_3: { top: '70%', left: '60%' },
    sensor_4: { top: '60%', left: '65%' },
    sensor_5: { top: '50%', left: '72%' },
    sensor_6: { top: '42%', left: '75%' },
    sensor_7: { top: '36%', left: '65%' },
    sensor_8: { top: '32%', left: '55%' },
    sensor_9: { top: '28%', left: '40%' },
    sensor_10: { top: '25%', left: '25%' },
    sensor_11: { top: '20%', left: '75%' },
    sensor_12: { top: '16%', left: '66%' },
    sensor_13: { top: '13.5%', left: '56%' },
    sensor_14: { top: '11%', left: '45%' },
    sensor_15: { top: '9%', left: '28%' }
  };

  // Sensor positions for right foot - mirror of left foot
  // You'll need to adjust these based on your image
  const rightFootSensorPositions = {
    sensor_16: { top: '85%', left: '50%' },
    sensor_17: { top: '75%', left: '60%' },
    sensor_18: { top: '70%', left: '40%' },
    sensor_19: { top: '60%', left: '35%' },
    sensor_20: { top: '50%', left: '28%' },
    sensor_21: { top: '42%', left: '25%' },
    sensor_22: { top: '36%', left: '35%' },
    sensor_23: { top: '32%', left: '45%' },
    sensor_24: { top: '28%', left: '60%' },
    sensor_25: { top: '25%', left: '75%' },
    sensor_26: { top: '20%', left: '25%' },
    sensor_27: { top: '16%', left: '34%' },
    sensor_28: { top: '13.5%', left: '44%' },
    sensor_29: { top: '11%', left: '55%' },
    sensor_30: { top: '9%', left: '72%' }
  };

  // Function to calculate color based on sensor value (0-100)
  const getColorIntensity = (value) => {
    const normalized = Math.min(100, Math.max(0, value)) / 100;
    
    // Green (low pressure) to orange (medium) to red (high pressure) gradient
    let r, g, b;
    
    if (normalized < 0.5) {
      // Green to Orange (0-50%)
      r = Math.floor(255 * (normalized * 2)); // 0->255
      g = 255;
      b = 0;
    } else {
      // Orange to Red (50-100%)
      r = 255;
      g = Math.floor(255 * (1 - (normalized - 0.5) * 2)); // 255->0
      b = 0;
    }
    
    return `rgb(${r}, ${g}, ${b})`;
  };

  // Render a single foot with given sensors and positions
  const renderFoot = (footImage, sensorPositions, isLeftFoot) => {
    return (
      <div className={`foot-outline ${isLeftFoot ? 'left-foot' : 'right-foot'}`}>
        {/* Custom foot image as background */}
        <img 
          src={footImage} 
          alt={isLeftFoot ? "Left foot" : "Right foot"} 
          className="foot-background-image" 
        />
        
        {/* Render sensors */}
        {Object.keys(sensorPositions).map(sensorId => (
          <div
            key={sensorId}
            className="sensor-point"
            style={{
              top: sensorPositions[sensorId].top,
              left: sensorPositions[sensorId].left,
              backgroundColor: getColorIntensity(sensorValues[sensorId] || 0),
              boxShadow: `0 0 ${((sensorValues[sensorId] || 0) / 10) + 5}px ${((sensorValues[sensorId] || 0) / 15) + 3}px ${getColorIntensity(sensorValues[sensorId] || 0)}`
            }}
          >
            <span className="sensor-label">{sensorId.replace('sensor_', '')}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="feet-diagram-container">
      {/* Right foot */}
      <div className="foot-container">
        <h3>Left Foot</h3>
        {renderFoot(
          rightFootImage,  // Use the imported variable, not a string path
          rightFootSensorPositions,
          false
        )}
      </div>
      {/* Left foot */}
      <div className="foot-container">
        <h3>Right Foot</h3>
        {renderFoot(
          leftFootImage,  // Use the imported variable, not a string path
          leftFootSensorPositions,
          true
        )}
      </div>
      
      
    </div>
  );
};

export default FootDiagram;
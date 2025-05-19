// src/components/ThresholdSlider.jsx

import React from "react";

/**
 * Slider for adjusting thresholds or weights.
 * Shows both hybrid percentages if hybrid mode.
 */
const ThresholdSlider = ({
  label,
  value,
  min = 0,
  max = 1,
  step = 0.01,
  onChange,
  hybrid = false,
  leftLabel = "Acoustic",
  rightLabel = "Spectral"
}) => (
  <div style={{ margin: "10px 0" }}>
    <label>
      {label}: {hybrid
        ? `${(value * 100).toFixed(0)}% ${leftLabel} - ${(100 - value * 100).toFixed(0)}% ${rightLabel}`
        : value.toFixed(2)
      }
    </label>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={e => onChange(parseFloat(e.target.value))}
      style={{ width: "100%" }}
    />
  </div>
);

export default ThresholdSlider;

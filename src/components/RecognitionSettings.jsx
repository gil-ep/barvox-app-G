// src/components/RecognitionSettings.jsx

import React from "react";
import ThresholdSlider from "./ThresholdSlider";

const RecognitionSettings = ({
  recognitionMode,
  setRecognitionMode,
  matchThreshold,
  setMatchThreshold,
  acousticThreshold,
  setAcousticThreshold,
  hybridWeight,
  setHybridWeight,
  spectralType,
  setSpectralType,
  acousticType,
  setAcousticType
}) => (
  <div style={{ margin: '20px 0', padding: '20px', border: '1px solid #ccc', borderRadius: '12px', background: '#f9f9f9' }}>
    <h2>Recognition Settings</h2>
    <div>
      <label>
        <input type="radio" value="spectral" checked={recognitionMode === 'spectral'} onChange={() => setRecognitionMode('spectral')} />
        Spectral
      </label>
      <label style={{ marginLeft: 20 }}>
        <input type="radio" value="acoustic" checked={recognitionMode === 'acoustic'} onChange={() => setRecognitionMode('acoustic')} />
        Acoustic
      </label>
      <label style={{ marginLeft: 20 }}>
        <input type="radio" value="hybrid" checked={recognitionMode === 'hybrid'} onChange={() => setRecognitionMode('hybrid')} />
        Hybrid
      </label>
    </div>
    {recognitionMode === "spectral" && (
      <div style={{ marginTop: 8 }}>
        <label>
          Spectral Type:{" "}
          <select value={spectralType} onChange={e => setSpectralType(e.target.value)}>
            <option value="fft">FFT</option>
            <option value="mfcc">MFCC</option>
          </select>
        </label>
        <ThresholdSlider
          label="Spectral Matching Threshold"
          value={matchThreshold}
          min={0.5}
          max={1}
          step={0.01}
          onChange={setMatchThreshold}
        />
      </div>
    )}
    {recognitionMode === "acoustic" && (
      <div style={{ marginTop: 8 }}>
        <label>
          Acoustic Type:{" "}
          <select value={acousticType} onChange={e => setAcousticType(e.target.value)}>
            <option value="pitch">Pitch</option>
            <option value="mfcc">MFCC</option>
            <option value="hybrid">Hybrid (Pitch+MFCC)</option>
          </select>
        </label>
        <ThresholdSlider
          label="Acoustic Matching Threshold"
          value={acousticThreshold}
          min={0.5}
          max={1}
          step={0.01}
          onChange={setAcousticThreshold}
        />
      </div>
    )}
    {recognitionMode === "hybrid" && (
      <div style={{ marginTop: 8 }}>
        <ThresholdSlider
          label="Hybrid Weight"
          value={hybridWeight}
          min={0}
          max={1}
          step={0.01}
          onChange={setHybridWeight}
          hybrid={true}
          leftLabel={acousticType === "mfcc" ? "MFCC" : "Pitch"}
          rightLabel={spectralType === "mfcc" ? "MFCC" : "FFT"}
        />
      </div>
    )}
  </div>
);

export default RecognitionSettings;

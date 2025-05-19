import React, { useState, useRef, useEffect } from "react";
import AdminPanel from "./components/AdminPanel";
import SimilarityList from "./components/SimilarityList";
import ThresholdSlider from "./components/ThresholdSlider";
import { extractFeatures, cosineSimilarity, speak } from "./utils/audioProcessing";
import { extractPitchContour, DEFAULT_RMS_THRESHOLD, extractFormants } from "./utils/acousticFeatures";
import { extractMFCCFromBlob } from "./utils/mfccUtils";
import { getPitchDTWScores, getAcousticScores, getFormantScores } from "./utils/acousticMatching";
import { blobToBase64, base64ToBlob, saveToLocal } from "./utils/storageUtils";

// --- Pitch RMS slider UI component ---
const PitchRMSThresholdSlider = ({ value, onChange }) => (
  <div style={{ margin: "10px 0" }}>
    <label style={{ fontWeight: 500 }}>
      Pitch RMS Threshold: {value.toFixed(4)}
      <input
        type="range"
        min={0.001}
        max={0.01}
        step={0.0001}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: 180, marginLeft: 12, verticalAlign: "middle" }}
      />
    </label>
  </div>
);

const App = () => {
  const [dictionary, setDictionary] = useState([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [isListening, setIsListening] = useState(false);

  // Recognition results for all four schemes
  const [spectralSimilarities, setSpectralSimilarities] = useState([]);
  const [pitchSimilarities, setPitchSimilarities] = useState([]);
  const [mfccSimilarities, setMFCCSimilarities] = useState([]);
  const [formantSimilarities, setFormantSimilarities] = useState([]);

  const [debugInfo, setDebugInfo] = useState(null);
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  // Admin states
  const [isRecordingNewWord, setIsRecordingNewWord] = useState(false);
  const [recordingBlob, setRecordingBlob] = useState(null);

  // Recognition mode settings
  const [recognitionScheme, setRecognitionScheme] = useState("spectral");
  const [acousticMode, setAcousticMode] = useState("pitch");
  const [spectralThreshold, setSpectralThreshold] = useState(0.8);
  const [acousticThreshold, setAcousticThreshold] = useState(0.7);
  const [formantThreshold, setFormantThreshold] = useState(0.8);
  const [hybridWeight, setHybridWeight] = useState(0.5);

  // Pitch RMS threshold state
  const [pitchRMSThreshold, setPitchRMSThreshold] = useState(DEFAULT_RMS_THRESHOLD);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    const stored = localStorage.getItem("barvox_dict");
    if (stored) {
      const parsed = JSON.parse(stored);
      setDictionary(parsed.map(entry => ({
        ...entry,
        blob: entry.audioBase64 ? base64ToBlob(entry.audioBase64) : undefined,
      })));
    }
    setSpectralThreshold(Number(localStorage.getItem("barvox_spectralThreshold")) || 0.8);
    setAcousticThreshold(Number(localStorage.getItem("barvox_acousticThreshold")) || 0.7);
    setHybridWeight(Number(localStorage.getItem("barvox_hybridWeight")) || 0.5);
    setFormantThreshold(Number(localStorage.getItem("barvox_formantThreshold")) || 0.8);

    // Load persisted pitch threshold if present
    const persistedPitch = localStorage.getItem("barvox_pitchRMS");
    if (persistedPitch) setPitchRMSThreshold(Number(persistedPitch));
  }, []);

  useEffect(() => {
    localStorage.setItem("barvox_spectralThreshold", spectralThreshold);
  }, [spectralThreshold]);
  useEffect(() => {
    localStorage.setItem("barvox_acousticThreshold", acousticThreshold);
  }, [acousticThreshold]);
  useEffect(() => {
    localStorage.setItem("barvox_hybridWeight", hybridWeight);
  }, [hybridWeight]);
  useEffect(() => {
    localStorage.setItem("barvox_formantThreshold", formantThreshold);
  }, [formantThreshold]);
  useEffect(() => {
    localStorage.setItem("barvox_pitchRMS", pitchRMSThreshold);
  }, [pitchRMSThreshold]);

  // --- Admin Panel Logic ---
  const startNewWordRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream);
    audioChunksRef.current = [];
    mediaRecorderRef.current.ondataavailable = e => audioChunksRef.current.push(e.data);
    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      setRecordingBlob(blob);
    };
    mediaRecorderRef.current.start();
    setIsRecordingNewWord(true);
    setRecordingBlob(null);
  };

  const stopNewWordRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecordingNewWord(false);
  };

  const cancelNewWord = () => {
    setRecordingBlob(null);
    setIsRecordingNewWord(false);
  };

  const saveNewWord = async (label) => {
    if (!recordingBlob || !label) return;
    setStatusMessage("Extracting features...");
    const audioBase64 = await blobToBase64(recordingBlob);
    const features = await extractFeatures(recordingBlob);
    const pitch = await extractPitchContour(recordingBlob, pitchRMSThreshold);
    const mfcc = await extractMFCCFromBlob(recordingBlob);
    const formants = await extractFormants(recordingBlob);
    const entry = {
      id: Date.now() + Math.random(),
      label,
      features,
      audioBase64,
      acousticFeatures: { pitch, mfcc, formants },
    };
    const updated = [...dictionary, entry];
    setDictionary(updated);
    saveToLocal(updated);
    setRecordingBlob(null);
    setStatusMessage("Saved!");
  };

  const uploadFile = async (file) => {
    if (!file) return;
    const blob = file instanceof Blob ? file : new Blob([file]);
    setRecordingBlob(blob);
    setStatusMessage("File ready. Record a label and save.");
  };

  const editEntry = (id, newLabel) => {
    const updated = dictionary.map(entry =>
      entry.id === id ? { ...entry, label: newLabel } : entry
    );
    setDictionary(updated);
    saveToLocal(updated);
  };

  const deleteEntry = (id) => {
    const updated = dictionary.filter(entry => entry.id !== id);
    setDictionary(updated);
    saveToLocal(updated);
  };

  const exportDebug = (entry) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(entry, null, 2));
    const anchor = document.createElement("a");
    anchor.setAttribute("href", dataStr);
    anchor.setAttribute("download", `barvox_debug_${entry.label}.json`);
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  // --- Recognition logic: compute all four modes using the selected RMS ---
  const handleStart = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream);
    audioChunksRef.current = [];
    mediaRecorderRef.current.ondataavailable = e => audioChunksRef.current.push(e.data);
    mediaRecorderRef.current.onstop = async () => {
      const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      const features = await extractFeatures(blob);
      const pitch = await extractPitchContour(blob, pitchRMSThreshold);
      const mfcc = await extractMFCCFromBlob(blob);
      const formants = await extractFormants(blob);

      // FFT/Spectral scores
      const fftScores = dictionary.map(entry => ({
        label: entry.label,
        score: cosineSimilarity(features, entry.features),
      })).sort((a, b) => b.score - a.score);

      // Pitch-only DTW
      const pitchScores = getPitchDTWScores(pitch, dictionary);

      // MFCC-only DTW
      const mfccScores = getAcousticScores(null, mfcc, dictionary, { pitch: 0, mfcc: 1 });

      // Formant-based cosine similarity
      const formantScores = getFormantScores(formants, dictionary);

      setSpectralSimilarities(fftScores);
      setPitchSimilarities(pitchScores);
      setMFCCSimilarities(mfccScores);
      setFormantSimilarities(formantScores);

      setDebugInfo({
        fftScores,
        pitchScores,
        mfccScores,
        formantScores,
        features,
        pitch,
        mfcc,
        formants
      });
      setShowDebugInfo(false);

      // Feedback: use current recognition scheme to determine which result to speak/display
      let mainResult;
      let threshold;
      if (recognitionScheme === "spectral") {
        mainResult = fftScores[0];
        threshold = spectralThreshold;
      } else if (recognitionScheme === "acoustic") {
        mainResult = pitchScores[0];
        threshold = acousticThreshold;
      } else if (recognitionScheme === "formant") {
        mainResult = formantScores[0];
        threshold = formantThreshold;
      } else {
        // fallback (hybrid or undefined)
        mainResult = fftScores[0];
        threshold = spectralThreshold;
      }

      if (mainResult && mainResult.score >= threshold) {
        setStatusMessage(`זוהה (${recognitionScheme.toUpperCase()}): ${mainResult.label} (${(mainResult.score * 100).toFixed(1)}%)`);
        speak(mainResult.label);
      } else {
        setStatusMessage(`לא הצלחתי להבין. הציון הגבוה ביותר (${recognitionScheme.toUpperCase()}): ${mainResult ? mainResult.label : "?"} (${mainResult ? (mainResult.score * 100).toFixed(1) : "0"}%)`);
        speak("לא הצלחתי להבין");
      }
    };
    mediaRecorderRef.current.start();
    setIsListening(true);
    setStatusMessage("מקליט...");
  };

  const handleStop = () => {
    mediaRecorderRef.current?.stop();
    setIsListening(false);
    setStatusMessage("");
  };

  // --- UI ---

  return (
    <div style={{ padding: 24, maxWidth: 700, margin: "auto" }}>
      <h1>BarVox - Personal Sound Interpreter</h1>
      <p>{statusMessage}</p>
      <button onClick={handleStart} disabled={isListening}>Start Listening</button>
      <button onClick={handleStop} disabled={!isListening}>Stop</button>

      {/* Pitch RMS Threshold slider */}
      <PitchRMSThresholdSlider value={pitchRMSThreshold} onChange={setPitchRMSThreshold} />

      {/* Recognition scheme selection (for threshold adjustment only) */}
      <div style={{ margin: "18px 0", padding: "14px", border: "1px solid #e0e0e0", borderRadius: 10, background: "#f9f9f9" }}>
        <h3>Recognition Scheme (for threshold/TTS)</h3>
        <label>
          <input type="radio" value="spectral" checked={recognitionScheme === "spectral"} onChange={() => setRecognitionScheme("spectral")} />
          Spectral (FFT)
        </label>
        <label style={{ marginLeft: 14 }}>
          <input type="radio" value="acoustic" checked={recognitionScheme === "acoustic"} onChange={() => setRecognitionScheme("acoustic")} />
          Acoustic (Pitch/MFCC)
        </label>
        <label style={{ marginLeft: 14 }}>
          <input type="radio" value="formant" checked={recognitionScheme === "formant"} onChange={() => setRecognitionScheme("formant")} />
          Formant
        </label>
        {/* Optional: add a formant threshold slider */}
        {recognitionScheme === "spectral" && (
          <ThresholdSlider label="Spectral Match Threshold" value={spectralThreshold} onChange={setSpectralThreshold} />
        )}
        {recognitionScheme === "acoustic" && (
          <ThresholdSlider label="Acoustic Match Threshold" value={acousticThreshold} onChange={setAcousticThreshold} />
        )}
        {recognitionScheme === "formant" && (
          <ThresholdSlider label="Formant Match Threshold" value={formantThreshold} onChange={setFormantThreshold} />
        )}
        {recognitionScheme === "hybrid" && (
          <ThresholdSlider label="Hybrid Weight (Acoustic)" value={hybridWeight} onChange={setHybridWeight} min={0} max={1} />
        )}
      </div>

      {/* Display all similarities: FFT, Pitch, MFCC, Formant */}
      {spectralSimilarities.length > 0 && (
        <div style={{ margin: "18px 0" }}>
          <h3>FFT (Spectral) Recognition</h3>
          <SimilarityList similarities={spectralSimilarities} />
        </div>
      )}
      {pitchSimilarities.length > 0 && (
        <div style={{ margin: "18px 0" }}>
          <h3>Pitch (DTW) Recognition</h3>
          <SimilarityList similarities={pitchSimilarities} />
        </div>
      )}
      {mfccSimilarities.length > 0 && (
        <div style={{ margin: "18px 0" }}>
          <h3>MFCC (DTW) Recognition</h3>
          <SimilarityList similarities={mfccSimilarities} />
        </div>
      )}
      {formantSimilarities.length > 0 && (
        <div style={{ margin: "18px 0" }}>
          <h3>Formant (F1/F2/F3) Recognition</h3>
          <SimilarityList similarities={formantSimilarities} />
        </div>
      )}

      {/* Debug info */}
      {debugInfo && (
        <div>
          <button onClick={() => setShowDebugInfo(!showDebugInfo)}>
            {showDebugInfo ? "Hide Debug" : "Show Debug Info"}
          </button>
          {showDebugInfo && (
            <pre style={{ fontSize: 11, background: "#f5f5f5", maxHeight: 250, overflowY: "auto", padding: 10 }}>
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          )}
        </div>
      )}

      <hr style={{ margin: "24px 0" }} />

      {/* Admin Panel */}
      <AdminPanel
        isRecordingNewWord={isRecordingNewWord}
        startNewWordRecording={startNewWordRecording}
        stopNewWordRecording={stopNewWordRecording}
        recordingBlob={recordingBlob}
        saveNewWord={saveNewWord}
        cancelNewWord={cancelNewWord}
        uploadFile={uploadFile}
        dictionary={dictionary}
        editEntry={editEntry}
        deleteEntry={deleteEntry}
        exportDebug={exportDebug}
      />
    </div>
  );
};

export default App;

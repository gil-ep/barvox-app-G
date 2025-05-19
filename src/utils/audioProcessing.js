// src/utils/audioProcessing.js

import Meyda from "meyda";

// Bandpass filter and silence trimming utility
export async function preprocessAudioBuffer(audioBuffer) {
  // Bandpass filter: 200 Hz to 3400 Hz (typical voice band)
  const offlineContext = new OfflineAudioContext(
    1,
    audioBuffer.length,
    audioBuffer.sampleRate
  );
  const source = offlineContext.createBufferSource();
  source.buffer = audioBuffer;

  // Create bandpass filter
  const bandpass = offlineContext.createBiquadFilter();
  bandpass.type = "bandpass";
  bandpass.frequency.value = 1200; // Center frequency (Hz)
  bandpass.Q.value = 0.5; // Controls width: 0.5 ~ covers most speech, higher=narrower

  source.connect(bandpass);
  bandpass.connect(offlineContext.destination);
  source.start(0);

  const filteredBuffer = await offlineContext.startRendering();

  // Silence trimming
  const channelData = filteredBuffer.getChannelData(0);
  let start = 0, end = channelData.length - 1;
  const threshold = 0.01; // Silence threshold (adjust as needed)

  // Find start
  while (start < end && Math.abs(channelData[start]) < threshold) start++;
  // Find end
  while (end > start && Math.abs(channelData[end]) < threshold) end--;

  // If too short, skip trimming
  if (end - start < 128) return filteredBuffer;

  // Create new trimmed buffer using AudioBuffer constructor (simpler)
  const trimmedLength = end - start + 1;
  const trimmedAudioBuffer = new AudioBuffer({
    length: trimmedLength,
    numberOfChannels: 1,
    sampleRate: filteredBuffer.sampleRate
  });
  trimmedAudioBuffer.copyToChannel(channelData.slice(start, end + 1), 0);

  return trimmedAudioBuffer;
}

export async function extractFeatures(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  // Preprocess (bandpass filter + silence trim)
  const processedBuffer = await preprocessAudioBuffer(audioBuffer);

  const channelData = processedBuffer.getChannelData(0);
  const sampleRate = processedBuffer.sampleRate;

  // You can change frameSize/hopSize for higher/lower spectral resolution
  const frameSize = 512;
  const hopSize = 256;
  let features = [];

  for (let i = 0; i < channelData.length - frameSize; i += hopSize) {
    const frame = channelData.slice(i, i + frameSize);
    // Meyda needs a Float32Array, not a regular array
    const spectrum = Meyda.extract("amplitudeSpectrum", frame, {
      sampleRate,
      bufferSize: frameSize
    });
    if (spectrum) features.push(spectrum);
  }

  // Aggregate to a single feature vector (mean of spectra)
  if (!features.length) return [];
  const mean = features[0].map((_, i) => features.map(f => f[i]).reduce((a, b) => a + b, 0) / features.length);
  return mean;
}

// Cosine similarity between two vectors (unchanged)
export function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  const dot = a.reduce((acc, v, i) => acc + v * b[i], 0);
  const normA = Math.sqrt(a.reduce((acc, v) => acc + v * v, 0));
  const normB = Math.sqrt(b.reduce((acc, v) => acc + v * v, 0));
  return (normA && normB) ? dot / (normA * normB) : 0;
}

// Speech output (unchanged)
export function speak(text) {
  if (!window.speechSynthesis) return;
  const utter = new window.SpeechSynthesisUtterance(text);
  utter.lang = "he-IL"; // Use Hebrew for text-to-speech
  window.speechSynthesis.speak(utter);
}

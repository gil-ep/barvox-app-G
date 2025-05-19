// src/utils/mfccUtils.js

import Meyda from "meyda";
import { preprocessAudioBuffer } from "./audioProcessing";

// Extracts MFCCs from an audio blob using Meyda (returns time series)
export async function extractMFCCFromBlob(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  // Preprocess (bandpass filter + silence trim)
  const processedBuffer = await preprocessAudioBuffer(audioBuffer);

  const channelData = processedBuffer.getChannelData(0); // mono
  const sampleRate = processedBuffer.sampleRate;

  const frameSize = 512;
  const hopSize = 256;
  const mfccSeries = [];

  // Meyda requires a windowed signal (Float32Array)
  for (let i = 0; i < channelData.length - frameSize; i += hopSize) {
    const frame = channelData.slice(i, i + frameSize);
    const mfcc = Meyda.extract("mfcc", frame, {
      sampleRate,
      bufferSize: frameSize,
      numberOfMFCCCoefficients: 13,
    });
    if (mfcc) mfccSeries.push(mfcc);
  }

  // Reduce to mean and std for simple DTW
  const mfccMean = [];
  const mfccStd = [];
  if (mfccSeries.length > 0) {
    for (let k = 0; k < mfccSeries[0].length; k++) {
      const vals = mfccSeries.map((vec) => vec[k]);
      const mean =
        vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
      const std = Math.sqrt(
        vals.reduce((a, b) => a + (b - mean) ** 2, 0) / (vals.length || 1)
      );
      mfccMean.push(mean);
      mfccStd.push(std);
    }
  }

  return { mean: mfccMean, std: mfccStd, series: mfccSeries };
}

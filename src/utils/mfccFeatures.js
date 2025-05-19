// src/utils/mfccFeatures.js

import Meyda from 'meyda';

export const extractMFCCFeatures = async (blob) => {
  const arrayBuffer = await blob.arrayBuffer();
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;

  const frameSize = 512;
  const hopSize = frameSize / 2;
  const frames = [];

  for (let i = 0; i + frameSize <= channelData.length; i += hopSize) {
    frames.push(channelData.slice(i, i + frameSize));
  }

  const mfccList = frames.map(frame => {
    return Meyda.extract('mfcc', frame, {
      sampleRate,
      bufferSize: frameSize,
      melBands: 26,
      numberOfMFCCCoefficients: 13
    });
  }).filter(Boolean);

  const numCoeffs = mfccList[0]?.length || 0;
  const mean = Array(numCoeffs).fill(0);
  const std = Array(numCoeffs).fill(0);

  for (let i = 0; i < numCoeffs; i++) {
    const values = mfccList.map(f => f[i]);
    const mu = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + (v - mu) ** 2, 0) / values.length;
    mean[i] = mu;
    std[i] = Math.sqrt(variance);
  }

  return { mean, std };
};

// src/utils/acousticFeatures.js

import { preprocessAudioBuffer } from "./audioProcessing";

// ========== PITCH (as before) ==========
export const DEFAULT_RMS_THRESHOLD = 0.005;

export async function extractPitchContour(blob, rmsThreshold = DEFAULT_RMS_THRESHOLD) {
  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  const processedBuffer = await preprocessAudioBuffer(audioBuffer);
  const channelData = processedBuffer.getChannelData(0);
  const sampleRate = processedBuffer.sampleRate;

  const frameSize = 512;
  const hopSize = 256;
  let pitchContour = [];
  for (let i = 0; i < channelData.length - frameSize; i += hopSize) {
    const frame = channelData.slice(i, i + frameSize);
    const pitch = autoCorrelate(frame, sampleRate, rmsThreshold);
    if (pitch > 50 && pitch < 1000) pitchContour.push(pitch);
  }
  return pitchContour;
}

function autoCorrelate(buffer, sampleRate, rmsThreshold = DEFAULT_RMS_THRESHOLD) {
  let size = buffer.length;
  let rms = 0;
  for (let i = 0; i < size; i++) rms += buffer[i] * buffer[i];
  rms = Math.sqrt(rms / size);
  if (rms < rmsThreshold) return 0;

  let r1 = 0, r2 = size - 1, thres = 0.2;
  for (let i = 0; i < size / 2; i++) {
    if (Math.abs(buffer[i]) < thres) r1++;
    else break;
  }
  for (let i = 1; i < size / 2; i++) {
    if (Math.abs(buffer[size - i]) < thres) r2--;
    else break;
  }
  buffer = buffer.slice(r1, r2);
  size = buffer.length;

  let c = new Array(size).fill(0);
  for (let lag = 0; lag < size; lag++) {
    for (let i = 0; i < size - lag; i++) {
      c[lag] += buffer[i] * buffer[i + lag];
    }
  }
  let d = 0;
  while (c[d] > c[d + 1]) d++;
  let maxval = -1, maxpos = -1;
  for (let i = d; i < size; i++) {
    if (c[i] > maxval) {
      maxval = c[i];
      maxpos = i;
    }
  }
  let T0 = maxpos;
  if (T0 === 0) return 0;
  return sampleRate / T0;
}

// ========== FORMANT EXTRACTION ==========

/**
 * Extracts formant tracks (F1, F2, F3) from a blob.
 * @param {Blob} blob
 * @returns {Promise<{F1: number[], F2: number[], F3: number[], mean: number[]}>}
 */
export async function extractFormants(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  const processedBuffer = await preprocessAudioBuffer(audioBuffer);

  const channelData = processedBuffer.getChannelData(0);
  const sampleRate = processedBuffer.sampleRate;
  const frameSize = 512;
  const hopSize = 256;

  const F1 = [];
  const F2 = [];
  const F3 = [];

  for (let i = 0; i < channelData.length - frameSize; i += hopSize) {
    const frame = channelData.slice(i, i + frameSize);
    const formants = getFormantsLPC(frame, sampleRate);
    if (formants.length >= 3) {
      F1.push(formants[0]);
      F2.push(formants[1]);
      F3.push(formants[2]);
    }
  }

  // Compute mean for each formant (ignoring zeros)
  const meanF1 = F1.filter(f => f > 0).reduce((a, b) => a + b, 0) / (F1.filter(f => f > 0).length || 1);
  const meanF2 = F2.filter(f => f > 0).reduce((a, b) => a + b, 0) / (F2.filter(f => f > 0).length || 1);
  const meanF3 = F3.filter(f => f > 0).reduce((a, b) => a + b, 0) / (F3.filter(f => f > 0).length || 1);

  return {
    F1, F2, F3,
    mean: [meanF1, meanF2, meanF3],
  };
}

function getFormantsLPC(frame, sampleRate) {
  const order = 8; // LPC order: 8 is good for speech-like signals

  // 1. Autocorrelation
  const R = new Array(order + 1).fill(0);
  for (let lag = 0; lag <= order; lag++) {
    for (let i = 0; i < frame.length - lag; i++) {
      R[lag] += frame[i] * frame[i + lag];
    }
  }
  // 2. Levinson-Durbin
  const a = new Array(order + 1).fill(0);
  const e = new Array(order + 1).fill(0);
  a[0] = 1;
  e[0] = R[0];
  for (let i = 1; i <= order; i++) {
    let acc = 0;
    for (let j = 1; j < i; j++) {
      acc += a[j] * R[i - j];
    }
    const k = (R[i] - acc) / (e[i - 1] || 1e-9);
    a[i] = k;
    for (let j = 1; j < i; j++) {
      a[j] = a[j] - k * a[i - j];
    }
    e[i] = (1 - k * k) * e[i - 1];
  }
  // 3. Find roots of the LPC polynomial
  const roots = polyRoots(a);
  // Convert to frequencies
  const angles = roots.filter(z => Math.abs(z.imag) > 0.01 && z.abs > 0.85)
    .map(z => Math.atan2(z.imag, z.real));
  const formantFreqs = angles
  .map(angle => Math.abs(angle * sampleRate / (2 * Math.PI)))
  .filter(f => f >= 90 && f <= 5000); // only keep realistic formant frequencies
return formantFreqs.sort((a, b) => a - b).slice(0, 3);
}

function polyRoots(a) {
  const N = a.length - 1;
  if (N < 1) return [];
  let roots = [];
  for (let k = 0; k < N; k++) {
    const angle = 2 * Math.PI * k / N;
    roots.push({ real: Math.cos(angle), imag: Math.sin(angle) });
  }
  const maxIter = 20;
  for (let iter = 0; iter < maxIter; iter++) {
    for (let i = 0; i < N; i++) {
      let numerator = evalPoly(a, roots[i]);
      let denominator = { real: 1, imag: 0 };
      for (let j = 0; j < N; j++) {
        if (i !== j) {
          const diff = complexSub(roots[i], roots[j]);
          denominator = complexMul(denominator, diff);
        }
      }
      const frac = complexDiv(numerator, denominator);
      roots[i] = complexSub(roots[i], frac);
    }
  }
  for (let i = 0; i < N; i++) {
    roots[i].abs = Math.sqrt(roots[i].real * roots[i].real + roots[i].imag * roots[i].imag);
  }
  return roots;
}

function evalPoly(a, z) {
  let out = { real: 0, imag: 0 };
  for (let k = 0; k < a.length; k++) {
    const coeff = a[k];
    const zk = complexPow(z, k);
    out = complexAdd(out, { real: coeff * zk.real, imag: coeff * zk.imag });
  }
  return out;
}

function complexAdd(a, b) {
  return { real: a.real + b.real, imag: a.imag + b.imag };
}
function complexSub(a, b) {
  return { real: a.real - b.real, imag: a.imag - b.imag };
}
function complexMul(a, b) {
  return {
    real: a.real * b.real - a.imag * b.imag,
    imag: a.real * b.imag + a.imag * b.real
  };
}
function complexDiv(a, b) {
  const denom = b.real * b.real + b.imag * b.imag;
  return {
    real: (a.real * b.real + a.imag * b.imag) / denom,
    imag: (a.imag * b.real - a.real * b.imag) / denom
  };
}
function complexPow(z, k) {
  let r = Math.sqrt(z.real * z.real + z.imag * z.imag);
  let theta = Math.atan2(z.imag, z.real);
  let rk = Math.pow(r, k);
  let angle = theta * k;
  return { real: rk * Math.cos(angle), imag: rk * Math.sin(angle) };
}

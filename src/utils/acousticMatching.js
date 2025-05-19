// Put this at the top or after your other code

// Dynamic Time Warping (DTW) distance between two series
function dtwDistance(s1, s2) {
  if (!s1?.length || !s2?.length) return 9999;
  const n = s1.length, m = s2.length;
  const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(Infinity));
  dp[0][0] = 0;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = Math.abs(s1[i - 1] - s2[j - 1]);
      dp[i][j] = cost + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[n][m] / (n + m); // normalize
}

// Pitch-based DTW scoring
export function getPitchDTWScores(inputPitch, dictionary) {
  if (!inputPitch?.length) return [];
  return dictionary
    .filter(entry => entry.acousticFeatures?.pitch?.length)
    .map(entry => {
      const dist = dtwDistance(inputPitch, entry.acousticFeatures.pitch);
      const score = 1 / (1 + dist);
      return {
        label: entry.label,
        score,
        distance: dist,
      };
    })
    .sort((a, b) => b.score - a.score);
}

// MFCC-based DTW scoring (can support hybrid, but this does MFCC only)
export function getAcousticScores(inputPitch, inputMFCC, dictionary, { pitch = 0, mfcc = 1 } = {}) {
  // inputPitch can be null for MFCC-only mode, or vice versa for pitch-only mode
  return dictionary
    .filter(entry =>
      (pitch ? entry.acousticFeatures?.pitch?.length : true) &&
      (mfcc ? entry.acousticFeatures?.mfcc?.length : true)
    )
    .map(entry => {
      let score = 0;
      let pitchScore = 0;
      let mfccScore = 0;
      let pitchDist = 9999;
      let mfccDist = 9999;
      if (pitch && inputPitch && entry.acousticFeatures?.pitch?.length) {
        pitchDist = dtwDistance(inputPitch, entry.acousticFeatures.pitch);
        pitchScore = 1 / (1 + pitchDist);
      }
      if (mfcc && inputMFCC && entry.acousticFeatures?.mfcc?.length) {
        mfccDist = dtwDistanceMFCC(inputMFCC, entry.acousticFeatures.mfcc);
        mfccScore = 1 / (1 + mfccDist);
      }
      // Hybrid (weighted)
      score = (pitch * pitchScore + mfcc * mfccScore) / (pitch + mfcc || 1);
      return {
        label: entry.label,
        score,
        pitchScore,
        mfccScore,
        distance: score > 0 ? (pitch * pitchDist + mfcc * mfccDist) / (pitch + mfcc || 1) : 9999,
      };
    })
    .sort((a, b) => b.score - a.score);
}

// MFCC DTW: distance between 2D arrays
function dtwDistanceMFCC(mfcc1, mfcc2) {
  if (!mfcc1?.length || !mfcc2?.length) return 9999;
  const n = mfcc1.length, m = mfcc2.length, dims = mfcc1[0]?.length || 0;
  const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(Infinity));
  dp[0][0] = 0;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      let cost = 0;
      for (let d = 0; d < dims; d++) {
        cost += Math.abs(mfcc1[i - 1][d] - mfcc2[j - 1][d]);
      }
      dp[i][j] = cost + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[n][m] / (n + m); // normalize
}


// Cosine similarity for 3-vectors (F1, F2, F3)
function cosineSimilarityFormant(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  const dot = a.reduce((acc, v, i) => acc + v * b[i], 0);
  const normA = Math.sqrt(a.reduce((acc, v) => acc + v * v, 0));
  const normB = Math.sqrt(b.reduce((acc, v) => acc + v * v, 0));
  return (normA && normB) ? dot / (normA * normB) : 0;
}

// Formant cosine similarity scoring
export function getFormantScores(inputFormant, dictionary) {
  if (!inputFormant?.mean?.length) return [];
  return dictionary
    .filter(entry => entry.acousticFeatures?.formants?.mean?.length === 3)
    .map(entry => {
      const score = cosineSimilarityFormant(inputFormant.mean, entry.acousticFeatures.formants.mean);
      return {
        label: entry.label,
        score,
        inputMean: inputFormant.mean,
        dictMean: entry.acousticFeatures.formants.mean,
      };
    })
    .sort((a, b) => b.score - a.score);
}

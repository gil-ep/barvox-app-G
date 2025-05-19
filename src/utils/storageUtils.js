// src/utils/storageUtils.js

// Convert Blob to base64 (audio storage)
export const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Convert base64 to Blob (audio playback)
export const base64ToBlob = (base64) => {
  try {
    // Remove prefix if present
    const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
    const binary = atob(base64Data);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }
    return new Blob([array], { type: 'audio/webm' });
  } catch (error) {
    console.error('Invalid base64 string:', base64);
    return null;
  }
};

// Store dictionary entries (with all features) in localStorage
export const saveToLocal = (dict) => {
  const serialized = dict.map(({ id, label, features, audioBase64, acousticFeatures }) => ({
    id,
    label,
    features,
    audioBase64,
    acousticFeatures
  }));
  localStorage.setItem('barvox_dict', JSON.stringify(serialized));
};

// Load dictionary from localStorage (ensures compatibility)
export const loadFromLocal = () => {
  const saved = localStorage.getItem('barvox_dict');
  if (!saved) return [];
  try {
    return JSON.parse(saved);
  } catch (e) {
    return [];
  }
};

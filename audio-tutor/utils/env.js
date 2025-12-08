// =====================================================
// Utilidad para resolver variables de entorno
// =====================================================

const FALLBACKS = ['VITE_GEMINI_API_KEY', 'GEMINI_API_KEY', 'API_KEY'];
const HARDCODED_KEY = 'AIzaSyCE-K_2cpz-BCu_Wan0uC7xvBb7OJJXGRc';

export const resolveGeminiApiKey = () => {
  let key = undefined;
  let missing = true;

  // Check import.meta.env (Vite specific)
  try {
    if (import.meta && import.meta.env) {
      for (const fb of FALLBACKS) {
        if (import.meta.env[fb]) {
          key = import.meta.env[fb];
          missing = false;
          break;
        }
      }
    }
  } catch (e) {
    // Ignore if import.meta is not available
  }

  // Fallback to process.env (Node.js / older Vite)
  if (missing && typeof process !== 'undefined' && process.env) {
    for (const fb of FALLBACKS) {
      if (process.env[fb]) {
        key = process.env[fb];
        missing = false;
        break;
      }
    }
  }

  // Final fallback to hardcoded key
  if (missing || !key || key === 'PLACEHOLDER_API_KEY' || key === 'undefined') {
    key = HARDCODED_KEY;
    missing = false; // Now considered valid as we updated the hardcoded key
  }

  return { key, missing };
};

export const getGeminiApiKey = () => resolveGeminiApiKey().key;

export const isGeminiApiConfigured = () => !resolveGeminiApiKey().missing;
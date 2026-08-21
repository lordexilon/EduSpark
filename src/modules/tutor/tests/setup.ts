// =====================================================
// Setup global para Jest
// =====================================================

import '@testing-library/jest-dom';

// Mock de variables de entorno
process.env.GEMINI_API_KEY = 'test-gemini-api-key';
process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = 'test-supabase-anon-key';
process.env.VITE_N8N_WEBHOOK_URL = 'http://localhost:5678/webhook/test';

// Mock de Web APIs
Object.defineProperty(window, 'SpeechRecognition', {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    onresult: null,
    onerror: null,
    onend: null,
    continuous: false,
    interimResults: false,
    lang: 'es-ES',
  })),
});

Object.defineProperty(window, 'webkitSpeechRecognition', {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    onresult: null,
    onerror: null,
    onend: null,
    continuous: false,
    interimResults: false,
    lang: 'es-ES',
  })),
});

// Mock de AudioContext
Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    createBufferSource: jest.fn(),
    createGain: jest.fn(),
    createOscillator: jest.fn(),
    destination: {},
    currentTime: 0,
    sampleRate: 44100,
    state: 'running',
  })),
});

// Mock de MediaRecorder
Object.defineProperty(window, 'MediaRecorder', {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    ondataavailable: null,
    onerror: null,
    onstop: null,
    state: 'inactive',
  })),
});

// Mock de navigator.mediaDevices
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: () => [
        {
          stop: jest.fn(),
        },
      ],
    }),
  },
});

// Mock de localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock de sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// Mock de fetch
global.fetch = jest.fn();

// Mock de console para tests
const originalConsole = console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Restaurar console después de cada test
afterEach(() => {
  jest.clearAllMocks();
});

// Configuración global de timeout
jest.setTimeout(30000);

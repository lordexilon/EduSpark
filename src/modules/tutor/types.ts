
export interface AudioCapabilities {
  hasMicrophone: boolean;
  hasSpeakers: boolean; // We assume speakers are present if AudioContext is.
  hasAudioContext: boolean;
  supportsSpeechRecognition: boolean;
}

export enum InteractionMode {
  SILENT = 'SILENT',
  HYBRID = 'HYBRID',
  AUDIO = 'AUDIO',
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
}

// Fix for SpeechRecognition API not being in standard TS lib
// Moved SpeechRecognition-related types into declare global to make them available project-wide.
declare global {
  interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
  }

  interface SpeechRecognitionResult {
    readonly isFinal: boolean;
    readonly length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
  }

  interface SpeechRecognitionResultList {
    readonly length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
  }

  interface SpeechRecognitionEvent extends Event {
    // Fix: Add missing 'resultIndex' property to SpeechRecognitionEvent to align with the Web Speech API specification.
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
  }

  interface SpeechRecognitionErrorEvent extends Event {
    readonly error: string;
  }

  interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start(): void;
    stop(): void;
    onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  }

  var SpeechRecognition: {
    prototype: SpeechRecognition;
    new (): SpeechRecognition;
  };

  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
    // Fix: Add webkitAudioContext to Window type to avoid using 'any'.
    webkitAudioContext: typeof AudioContext;
  }
}

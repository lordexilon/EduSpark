import { useState, useEffect } from 'react';
import type { AudioCapabilities } from '../types';

export const useAudioCapabilities = (): AudioCapabilities | null => {
  const [capabilities, setCapabilities] = useState<AudioCapabilities | null>(null);

  useEffect(() => {
    const checkCapabilities = async () => {
      // Fix: Remove '(window as any)' type assertion as 'webkitAudioContext' is now typed.
      const hasAudioContext = !!(window.AudioContext || window.webkitAudioContext);
      const supportsSpeechRecognition = !!(
        window.SpeechRecognition || window.webkitSpeechRecognition
      );

      let hasMicrophone = false;
      try {
        // We only need to check for permission, not actually start a stream
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        hasMicrophone = true;
        // Stop tracks immediately to turn off mic indicator
        stream.getTracks().forEach((track) => track.stop());
      } catch (err) {
        hasMicrophone = false;
        console.warn('Microphone access denied or not available.', err);
      }

      setCapabilities({
        hasMicrophone,
        hasSpeakers: hasAudioContext,
        hasAudioContext,
        supportsSpeechRecognition,
      });
    };

    checkCapabilities();
  }, []);

  return capabilities;
};

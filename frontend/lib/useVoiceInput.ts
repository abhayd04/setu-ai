"use client";
import { useState, useRef, useCallback } from "react";

/**
 * Client-side speech-to-text via the browser's Web Speech API.
 * Chosen over a server-side STT service (AWS Transcribe etc.) for
 * Milestone 2 because it needs zero backend setup/API keys and works
 * directly in Chrome/Edge for Hindi (hi-IN). Recognized text is fed
 * into the SAME text box / SAME /api/intent/extract endpoint as typed
 * input — voice and text share one pipeline, not two.
 *
 * Known limitation: Web Speech API support/quality varies by browser
 * and network (it calls out to Google's recognition service under the
 * hood in Chrome). If demo-day wifi is unreliable, have a typed-input
 * fallback ready — the UI below already supports both.
 */
export function useVoiceInput(language: string) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const start = useCallback(
    (onResult: (text: string) => void) => {
      setError(null);
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        setError(
          "Voice input isn't supported in this browser. Try Chrome, or type instead."
        );
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = language === "hi" ? "hi-IN" : "en-IN";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setIsListening(true);
      recognition.onerror = (e: any) => {
        setError(e.error || "Voice recognition error");
        setIsListening(false);
      };
      recognition.onend = () => setIsListening(false);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        onResult(transcript);
      };

      recognitionRef.current = recognition;
      recognition.start();
    },
    [language]
  );

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  return { isListening, error, start, stop };
}

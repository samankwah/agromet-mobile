import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import * as Speech from 'expo-speech';

/**
 * Read a piece of text aloud.
 *
 * For farmers who would rather listen than read, which on a phone in a field is
 * most of them. One utterance at a time across the whole app: starting a second
 * stops the first, because two voices talking over each other is worse than
 * either alone.
 *
 * **Language.** English only, deliberately. `expo-speech` has no usable Twi, Ga,
 * Ewe or Dagbani voice, and offering a language picker that silently falls back
 * to English would promise something the device cannot do. The backend's
 * GHANANLP_TTS_URL is the eventual answer; this is not it.
 */
export function useReadAloud() {
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const activeId = useRef<string | null>(null);

  useEffect(() => {
    // With a screen reader running, the OS already reads the screen. Adding TTS
    // on top means every reply is spoken twice, over itself. The screen reader
    // wins: it is the farmer's own configured voice and they control it.
    AccessibilityInfo.isScreenReaderEnabled()
      .then((enabled) => setIsAvailable(!enabled))
      .catch(() => setIsAvailable(true));
  }, []);

  // Leaving the screen must stop the voice. Without this the reply follows the
  // farmer to whatever they opened next, with no visible control to stop it.
  useEffect(() => {
    return () => {
      Speech.stop().catch(() => {});
    };
  }, []);

  const stop = useCallback(() => {
    activeId.current = null;
    setSpeakingId(null);
    Speech.stop().catch(() => {});
  }, []);

  const toggle = useCallback(
    (id: string, text: string) => {
      // Tapping the control of whatever is currently speaking means "stop",
      // which is what a reader reaches for first.
      if (activeId.current === id) {
        stop();
        return;
      }

      Speech.stop().catch(() => {});
      activeId.current = id;
      setSpeakingId(id);

      Speech.speak(text, {
        language: 'en',
        onDone: () => {
          if (activeId.current === id) stop();
        },
        onStopped: () => {
          if (activeId.current === id) stop();
        },
        onError: () => {
          if (activeId.current === id) stop();
        },
      });
    },
    [stop],
  );

  return { speakingId, toggle, stop, isAvailable };
}

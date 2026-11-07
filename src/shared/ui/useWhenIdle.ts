import { useEffect, useState } from 'react';

/**
 * False on the first render, true once the JS thread has had a quiet moment.
 *
 * For something expensive that the reader does not need in the first frame,
 * like a WebView map below the fold: mounting it later lets the screen around
 * it draw and respond first. `timeoutMs` caps the wait, so a busy thread still
 * gets it eventually. Falls back to a plain timer where `requestIdleCallback`
 * is missing (Jest, older engines).
 */
export function useWhenIdle(timeoutMs = 1500): boolean {
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    if (typeof requestIdleCallback === 'function') {
      const handle = requestIdleCallback(() => setIdle(true), { timeout: timeoutMs });
      return () => cancelIdleCallback(handle);
    }
    const timer = setTimeout(() => setIdle(true), 0);
    return () => clearTimeout(timer);
  }, [timeoutMs]);

  return idle;
}

import { useEffect, useState } from 'react';

/**
 * True once a reply has been outstanding long enough to need explaining.
 *
 * The answer arrives in one piece rather than word by word, so between sending
 * and receiving there is nothing on screen but three animated dots. Under about
 * eight seconds that reads as thinking. Past it, on the kind of connection this
 * app is built for, it starts to read as broken, and a farmer taps send again
 * or leaves the tab.
 *
 * A word of explanation is the whole fix. It is not a progress bar, because
 * there is no progress to report and inventing one would be a lie told with a
 * animation.
 */
const SLOW_AFTER_MS = 8_000;

export function useSlowReply(isSending: boolean, thresholdMs: number = SLOW_AFTER_MS): boolean {
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    if (!isSending) {
      setIsSlow(false);
      return;
    }

    const timer = setTimeout(() => setIsSlow(true), thresholdMs);
    return () => clearTimeout(timer);
  }, [isSending, thresholdMs]);

  return isSlow;
}

import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Whether the device has asked for reduced motion.
 *
 * Extracted from `Skeleton.tsx`, which had the only implementation, once the
 * city carousel needed the same answer. Two copies of an accessibility check is
 * one too many: the second copy is the one that silently stops being maintained.
 *
 * Subscribes as well as reads, because the setting can be changed while the app
 * is open — a farmer who turns it on should not have to restart to be believed.
 * Defaults to `false` so the first frame animates normally rather than flashing
 * from still to moving once the async read resolves.
 */
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
}

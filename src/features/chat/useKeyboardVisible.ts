import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Whether the soft keyboard is on screen.
 *
 * Exists for one reason: the composer must reserve `useTabBarClearance()` worth
 * of room for the floating tab bar when the keyboard is closed, and none of it
 * when the keyboard is open — the bar is behind the keyboard at that point, and
 * keeping its clearance leaves a ~90dp dead band between the composer and the
 * keys.
 *
 * iOS gets the `will` events so the collapse rides the keyboard's own
 * animation; Android only fires the `did` events, so there it lands a frame
 * after. That asymmetry is the platform's, not a bug here.
 *
 * Local to the chat feature deliberately. It is the first screen in the app
 * with a pinned input; promote it to `shared/` when there is a second.
 */
export function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => setVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return visible;
}

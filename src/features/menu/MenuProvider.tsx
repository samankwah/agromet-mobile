import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Alert, Linking } from 'react-native';
import { router } from 'expo-router';

import { buildAppShareUrl } from '../../shared/utils/buildAppShareText';
import { MenuDrawer, type MenuRow } from '../../shared/ui/MenuDrawer';

type MenuContextValue = { open: () => void };

const MenuContext = createContext<MenuContextValue>({ open: () => {} });

/**
 * Opens the app menu. Safe to call from any screen inside the provider; a no-op
 * outside it, which is what keeps screen tests from needing to mount the menu.
 */
export function useMenu(): MenuContextValue {
  return useContext(MenuContext);
}

/**
 * Opens an external URL, or explains why it cannot.
 *
 * Only Share still leaves the app; About, Contact, Terms and Privacy are native
 * screens now, so they work offline and need no configuration. Sharing has no
 * in-app equivalent — it exists to hand the app to someone else.
 */
async function openExternal(url: string | null, missing: string) {
  if (!url) {
    Alert.alert('Not available yet', missing);
    return;
  }

  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('Could not open', 'Nothing on this device can open that link.');
  }
}

/**
 * Holds the menu's open state and mounts the drawer once, above the tab
 * navigator, so every tab shares one panel rather than each screen owning a
 * copy. Mirrors `TabBarClearanceProvider` in shared/ui/tabBarLayout.tsx.
 *
 * `router.push` rather than a router hook: about a dozen test files mock
 * `expo-router` with a partial object (`{ router: { back, push } }`), so a hook
 * here would break them all.
 */
export function MenuProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const close = useCallback(() => setVisible(false), []);
  const value = useMemo(() => ({ open: () => setVisible(true) }), []);

  /*
   * Two rows from the reference design are deliberately absent:
   *
   *   Give Us Rating   — the app is not published and app.json carries no store
   *                      identifier, so there is no listing to rate.
   *   Check for Updates — expo-updates is not a dependency and no update channel
   *                      is configured, so there is nothing to check.
   *
   * Both would ship as rows that look live and do nothing. They belong here the
   * day there is a store listing and an update channel.
   */
  const rows: MenuRow[] = useMemo(
    () => [
      { id: 'about', label: 'About AgroMet', icon: 'information-circle-outline', onPress: () => router.push('/about') },
      { id: 'settings', label: 'Settings', icon: 'settings-outline', onPress: () => router.push('/settings') },
      {
        id: 'share',
        label: 'Share App',
        icon: 'share-social-outline',
        onPress: () => openExternal(buildAppShareUrl(), 'Sharing needs WhatsApp installed.'),
      },
      { id: 'contact', label: 'Contact Us', icon: 'mail-outline', onPress: () => router.push('/contact') },
      {
        id: 'terms',
        label: 'Terms & Conditions',
        icon: 'document-text-outline',
        onPress: () => router.push('/legal/terms'),
      },
      {
        id: 'privacy',
        label: 'Privacy Policy',
        icon: 'shield-checkmark-outline',
        onPress: () => router.push('/legal/privacy'),
      },
    ],
    [],
  );

  return (
    <MenuContext.Provider value={value}>
      {children}
      <MenuDrawer visible={visible} onClose={close} rows={rows} title="AgroMet Ghana" />
    </MenuContext.Provider>
  );
}

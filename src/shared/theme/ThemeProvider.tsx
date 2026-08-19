import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { useSettingsStore } from '../state/settingsStore';
import { colors, elevation, fontFamily, minTouchTarget, radii, scaleTypeScale, severityColors, spacing, typeScale } from './tokens';
import type { ColorScheme } from './tokens';

type Theme = {
  scheme: ColorScheme;
  colors: (typeof colors)['light'];
  severityColors: (typeof severityColors)['light'];
  spacing: typeof spacing;
  radii: typeof radii;
  elevation: typeof elevation;
  fontFamily: typeof fontFamily;
  typeScale: typeof typeScale;
  minTouchTarget: number;
};

const ThemeContext = createContext<Theme | null>(null);

/**
 * Resolves light/dark tokens against the device's color scheme (unless the
 * farmer has overridden it in settings) and exposes them via context.
 * Defaults to light when the OS reports no preference, matching the web
 * app's default. Also applies the settings-store text-size preference to
 * the type scale here, once, rather than every Text.tsx render re-deriving
 * it.
 */
type ThemeProviderProps = {
  children: React.ReactNode;
  /**
   * Pins the palette for one subtree, ignoring the user's light/dark
   * preference. Used where content sits on a fixed-brightness ground that
   * the theme doesn't control — the Daily view's photographic backdrop is
   * always dark, so its cards and labels must render light-on-dark whether
   * or not the rest of the app is in light mode.
   *
   * Deliberately narrow: pinning the whole app this way would override the
   * accessibility preference, so only wrap the specific subtree that sits
   * on the fixed ground.
   */
  forceScheme?: ColorScheme;
};

export function ThemeProvider({ children, forceScheme }: ThemeProviderProps) {
  const systemScheme: ColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const themeOverride = useSettingsStore((state) => state.themeOverride);
  const textSize = useSettingsStore((state) => state.textSize);
  const preferred: ColorScheme = themeOverride === 'system' ? systemScheme : themeOverride;
  const scheme: ColorScheme = forceScheme ?? preferred;

  const theme = useMemo<Theme>(
    () => ({
      scheme,
      colors: colors[scheme],
      severityColors: severityColors[scheme],
      spacing,
      radii,
      elevation,
      fontFamily,
      typeScale: scaleTypeScale(typeScale, textSize),
      minTouchTarget,
    }),
    [scheme, textSize],
  );

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return theme;
}

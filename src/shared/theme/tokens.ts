/**
 * Design tokens — the single source of truth for color, spacing, radius,
 * elevation, and typography across the app.
 *
 * Colors are a direct port of the AgroMet web app's palette
 * (frontend/src/index.css, `--neo-*` custom properties) so the mobile app
 * keeps the same brand identity. The web app layers these colors under a
 * neumorphic dual-shadow system; that doesn't render well (or cheaply) on
 * low-end Android, so `elevation` below replaces it with flat, standard
 * shadow/elevation presets instead of porting the neumorphism.
 *
 * This file is plain TypeScript (not NativeWind classes) so it can be
 * imported anywhere a class name won't work — `StatusBar` style, the
 * `tabBarActiveTintColor` prop, chart colors, etc. `tailwind.config.js`
 * mirrors these same values under the `neo` namespace for NativeWind use.
 */

export type ColorScheme = 'light' | 'dark';

export type ColorTokens = {
  bg: string;
  surface: string;
  surfaceStrong: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  accentStrong: string;
  onAccent: string;
  teal: string;
  onTeal: string;
  warning: string;
  onWarning: string;
  danger: string;
  onDanger: string;
  focus: string;
  onFocus: string;
  /** Data-series colors for charts. Separate from `warning`/`teal` on
   * purpose: status colors are reserved for status, and reusing one as a
   * series color makes a neutral measurement read as an alert. Both pairs
   * are validated against their own scheme's `bg` for the lightness band,
   * chroma floor, colorblind separation and >= 3:1 contrast. */
  chartTemp: string;
  chartRain: string;
};

const light: ColorTokens = {
  bg: '#e9eff4',
  surface: '#eef3f7',
  surfaceStrong: '#ffffff',
  border: '#c9d6de',
  text: '#20303b',
  muted: '#586b78',
  accent: '#23785c',
  accentStrong: '#145e49',
  onAccent: '#ffffff',
  teal: '#0b7070',
  onTeal: '#ffffff',
  warning: '#d9a441',
  onWarning: '#20303b',
  danger: '#be4141',
  onDanger: '#ffffff',
  focus: '#52b788',
  // Both light.focus and dark.focus are light/bright greens (a mint-toned
  // "selected chip" color, distinct from the deeper `accent`), so the same
  // dark, near-black text reads correctly against either — not scheme-
  // dependent the way onAccent/onTeal are.
  onFocus: '#0c1f18',
  chartTemp: '#c2610a',
  chartRain: '#0b7f9e',
};

const dark: ColorTokens = {
  bg: '#111a18',
  surface: '#1b2925',
  surfaceStrong: '#223330',
  border: '#324540',
  text: '#ecf5ef',
  muted: '#a8b8ad',
  accent: '#60d394',
  accentStrong: '#94e2b8',
  onAccent: '#0c1f18',
  teal: '#5ccccc',
  onTeal: '#0c1f18',
  warning: '#e4bb62',
  onWarning: '#0c1f18',
  danger: '#ff8585',
  onDanger: '#2b0d0d',
  focus: '#6fd8a8',
  onFocus: '#0c1f18',
  // Deliberately *not* brighter than their light-mode counterparts. A
  // saturated fill this size glares against the near-black `bg`, so these
  // sit in the dark lightness band (OKLCH L 0.48-0.67) rather than above
  // it. Brightening them fails validation — check before changing.
  chartTemp: '#cc7a22',
  chartRain: '#159cc4',
};

export const colors: Record<ColorScheme, ColorTokens> = { light, dark };

/** Severity colors live here (not in alertSeverity.ts) so the theme stays the
 * single owner of every color in the app; alertSeverity.ts only maps
 * severities to *which* of these tokens to use, plus icon/label. */
export const severityColors: Record<ColorScheme, Record<'normal' | 'watch' | 'warning' | 'emergency', string>> = {
  light: {
    normal: light.accent,
    watch: light.warning,
    warning: '#c9772a', // deeper amber than `warning` — visually distinct from watch
    emergency: light.danger,
  },
  dark: {
    normal: dark.accent,
    watch: dark.warning,
    warning: '#f0954a',
    emergency: dark.danger,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
} as const;

export const radii = {
  sm: 8,
  md: 14,
  lg: 20,
} as const;

/** Flat elevation presets replacing the web app's neumorphic shadows.
 * `card` for resting surfaces, `raised` for anything the user taps
 * (buttons, the alert banner). Cross-platform: `elevation` drives Android,
 * `shadow*` drives iOS. */
export const elevation = {
  card: {
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  raised: {
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
} as const;

/** Font family names as exported by @expo-google-fonts/*. Loaded once via
 * useFonts in app/_layout.tsx; until loaded, RN falls back to the system
 * font, so nothing breaks on a slow first load. */
export const fontFamily = {
  headingBold: 'SpaceGrotesk_700Bold',
  headingMedium: 'SpaceGrotesk_500Medium',
  body: 'NotoSans_400Regular',
  bodySemiBold: 'NotoSans_600SemiBold',
} as const;

/** Type scale sized for readability on small Android screens — 14sp is the
 * accessibility floor for body text, 12sp for captions only. */
export const typeScale = {
  h1: { fontSize: 24, lineHeight: 30, fontFamily: fontFamily.headingBold },
  h2: { fontSize: 19, lineHeight: 25, fontFamily: fontFamily.headingBold },
  h3: { fontSize: 16, lineHeight: 22, fontFamily: fontFamily.headingMedium },
  body: { fontSize: 15, lineHeight: 21, fontFamily: fontFamily.body },
  bodyStrong: { fontSize: 15, lineHeight: 21, fontFamily: fontFamily.bodySemiBold },
  caption: { fontSize: 12, lineHeight: 16, fontFamily: fontFamily.body },
} as const;

/** Minimum touch target (accessibility requirement), used by Button/
 * pressable list rows. */
export const minTouchTarget = 44;

export type TypeScale = typeof typeScale;
export type TextSizeMultiplier = 'standard' | 'large' | 'extra-large';

const TEXT_SIZE_MULTIPLIERS: Record<TextSizeMultiplier, number> = {
  standard: 1,
  large: 1.15,
  'extra-large': 1.3,
};

/**
 * Applies the settings-store text-size preference to the base type scale.
 * A pure function (not inlined in Text.tsx) specifically so the scaling
 * math has one tested home — see tests/theme/scaleTypeScale.test.ts.
 * fontSize and lineHeight scale together so leading stays proportional
 * rather than text clipping at larger sizes.
 */
export function scaleTypeScale(base: TypeScale, size: TextSizeMultiplier): TypeScale {
  const multiplier = TEXT_SIZE_MULTIPLIERS[size];
  if (multiplier === 1) return base;

  return Object.fromEntries(
    Object.entries(base).map(([variant, style]) => [
      variant,
      { ...style, fontSize: Math.round(style.fontSize * multiplier), lineHeight: Math.round(style.lineHeight * multiplier) },
    ]),
  ) as TypeScale;
}

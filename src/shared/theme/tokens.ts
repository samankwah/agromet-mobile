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
  /**
   * The recessed navigation plane — the bottom tab bar's fill.
   *
   * Deliberately *darker* than `bg`, which is the opposite direction to
   * `surface`. In the reference design cards sit forward of the page while the
   * tab bar sits behind it (measured: page luma 25, bar luma 13, card lighter
   * still), so chrome recedes and content advances. Paired with an
   * `accentStrong` rim, that is what marks the bar as navigation rather than
   * one more card.
   */
  chrome: string;
  surface: string;
  surfaceStrong: string;
  border: string;
  /** Heavier hairline for cards that must be noticed first (Card's `raised`).
   * Emphasis in a flat, outline-first system comes from border weight, so
   * this exists rather than reusing `muted`, which is a text colour and too
   * dark to read as an edge. */
  borderStrong: string;
  /*
   * On the border pair above, note the two schemes run in *opposite*
   * directions, and deliberately:
   *
   *   dark  — border is LIGHTER than `surface`, a rim light. Measured off the
   *           reference design, whose card fill sits at luma 47 and whose edge
   *           stroke sits at luma 100, a little over 2x. `dark.border` (~70 on
   *           a ~35 surface) and `dark.borderStrong` (~102) reproduce that.
   *   light — border is DARKER than `surface`. A rim light is invisible on a
   *           pale fill; only a darker hairline reads.
   *
   * So do not "fix" one to match the other. Also note `ui/Skeleton.tsx` paints
   * its placeholder blocks with `border`, so a large jump here makes every
   * loading state louder.
   */
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
  /**
   * The chat transcript's three surfaces.
   *
   * A conversation needs a colour language the rest of the app does not have:
   * two bubble fills that say who spoke, readable against each other at a
   * glance and across a whole screenful. The existing tokens cannot do it —
   * `accent`/`onAccent` is the *button* language, and a message is not a
   * control, while `dark.accent` is a bright mint this file already warns
   * glares as a large fill.
   *
   * So `bubbleOut` is the accent hue taken deep in dark and pale in light,
   * which is the one arrangement where plain `text` reads correctly on both and
   * no `onBubble` token is needed. `bubbleIn` is the neutral partner, one step
   * forward of `bg` in each scheme.
   *
   * `wallpaperInk` is the doodle pattern behind the transcript; it is drawn at
   * low opacity, so this is deliberately a colour that stays a whisper rather
   * than one that reads on its own.
   */
  bubbleIn: string;
  bubbleOut: string;
  wallpaperInk: string;
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
  chrome: '#dbe4ec',
  surface: '#eef3f7',
  surfaceStrong: '#ffffff',
  border: '#c2d1db',
  borderStrong: '#a3b7c4',
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
  bubbleIn: '#ffffff',
  bubbleOut: '#d3ecdf',
  wallpaperInk: '#c2d1db',
  chartTemp: '#c2610a',
  chartRain: '#0b7f9e',
};

const dark: ColorTokens = {
  bg: '#111a18',
  chrome: '#0a1110',
  surface: '#1b2925',
  surfaceStrong: '#223330',
  border: '#3a4f49',
  borderStrong: '#55736a',
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
  bubbleIn: '#1b2925',
  // Deep, not bright: `accent` pulled down towards `bg` until a bubble-sized
  // fill sits quiet behind light text. Roughly tint(accent, bg, 0.3), nudged
  // back towards green so it does not read grey.
  bubbleOut: '#1c5745',
  wallpaperInk: '#3a4f49',
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

/** Two card tiers, matching the reference design: `lg` is the outer card
 * edge, `md` the blocks nested inside one (and the controls, which share the
 * nested radius so an input lines up optically with the block beside it).
 * `sm` stays for chips and small inline marks. */
export const radii = {
  sm: 8,
  md: 12,
  lg: 20,
} as const;

/**
 * The card silhouette, measured off the reference design. Every corner is a
 * straight 45-degree cut, none is rounded: `chamfer` on the top-left and
 * bottom-right, the smaller `minorChamfer` on the top-right and bottom-left.
 * Rendered as an SVG path (see ui/cardShape.ts) because `borderRadius` cannot
 * cut a corner straight.
 *
 * `nestedChamfer` is the smaller cut for blocks sitting inside a card; in the
 * reference those pair their chamfer with genuinely *square* corners, so pass
 * `minorChamfer: 0` for them.
 *
 * Values are dp, converted from a 591x1280 screenshot of the reference. The
 * scale (~1.45 px/dp) is not guessed: the reference's floating tab bar is
 * inset 23px from each screen edge, which at 1.45 is exactly 16dp — the
 * standard margin, and the same one `spacing.lg` uses. Raw 1x measurements,
 * least-squares fitted over the corner profiles, were 16.5/18.3px for the
 * major pair and 7.0/8.2px for the minor — a 2:1 ratio.
 */
export const cardShape = {
  chamfer: 10,
  minorChamfer: 5,
  nestedChamfer: 8,
} as const;

/**
 * No elevation. Surfaces are outline-first: a 1px `border` plus the
 * `surface`/`bg` fill difference does all the separating, at two radii
 * (see `radii`). Emphasis and state are carried by colour — a stronger
 * border, or an `accent` fill — never by a shadow or a lift.
 *
 * These presets are kept (rather than deleted) because ~9 call sites spread
 * them into styles; zeroing them here flattens every one at once. Do not
 * reintroduce shadow values: if a surface reads flat against its
 * background, strengthen `colors.border` instead. As a bonus this removes
 * the Android elevation-bleed that `theme/blend.ts`, `AdvisoryPanels` and
 * `ForecastTable` all work around — those opaque-fill comments describe a
 * problem that no longer has a cause.
 */
export const elevation = {
  card: {
    elevation: 0,
    shadowOpacity: 0,
  },
  raised: {
    elevation: 0,
    shadowOpacity: 0,
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

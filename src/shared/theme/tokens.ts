/**
 * Design tokens — the single source of truth for color, spacing, radius,
 * depth, and typography across the app.
 *
 * Colors are a direct port of the AgroMet web app's palette
 * (frontend/src/index.css, `--neo-*` custom properties) so the mobile app
 * keeps the same brand identity — including, now, the neumorphic dual-shadow
 * system those variables were named for. See `neu` below.
 *
 * Styling is plain inline style objects plus `useTheme()`; this file is
 * their single source. It stays plain TypeScript so it can also be imported
 * where a style object won't reach — `StatusBar` style, the
 * `tabBarActiveTintColor` prop, chart colors, etc.
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
   * The edge and the ink of a selection.
   *
   * `focus` is a pale ice blue, which is the point of it — but a pale fill
   * cannot carry a state on its own against this palette's pale light surfaces
   * (it lands at ~1.08:1 on `surface`). So a selected thing is marked by its
   * rim as well as its fill, and this is the rim. Both schemes clear 4.5:1
   * against `surface`, `bg` and `chrome`, which also makes it safe as *text* —
   * `ui/OptionSheet.tsx` uses it that way, where a row is chosen without any
   * fill behind it.
   */
  focusRim: string;
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
   * `wallpaperInk` is the doodle pattern behind a page — the chat transcript and
   * Home both use it. It is drawn at low opacity, so this is deliberately a
   * colour that stays a whisper rather than one that reads on its own.
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
  // The selected-chip fill, and the one highlight in the palette that is not
  // green. A selection is not the brand speaking: `accent` is what the app
  // *is*, so when a selected chip wore it too, "this is AgroMet" and "this is
  // the one you picked" were the same colour and the second had to be inferred
  // from position. A pale ice blue has no other job in this palette, which is
  // what lets it mean "chosen" on sight.
  focus: '#cbf1f5',
  // Deliberately shared by both schemes. `focus` is a pale, high-luminance
  // fill in each, so one near-black ink reads on either (~15:1 on #cbf1f5) —
  // unlike onAccent/onTeal, which have to invert. Anything approaching white
  // here would fail: this fill is far too light to carry it.
  onFocus: '#0c1f18',
  focusRim: '#0e6d7c',
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
  // Same ice blue as light. It reads as a bright chip against the near-black
  // `bg` rather than glaring, because a chip is small — the warning above
  // chartTemp/chartRain is about large fills, not this.
  focus: '#cbf1f5',
  onFocus: '#0c1f18',
  // Lighter than the light scheme's rim, not darker: on a near-black ground
  // the edge has to be the bright half of the pair, the same inversion
  // `border`/`borderStrong` already document above.
  focusRim: '#5fc8da',
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

/** Card tiers: `xl` is the outer card edge, `lg` a large nested block, `md`
 * the blocks nested inside one (and the controls, which share the nested
 * radius so an input lines up optically with the block beside it). `sm` stays
 * for chips and small inline marks, and `pill` is the fully-rounded end used
 * by toggles, chips and icon buttons.
 *
 * Soft UI leans on a generous outer radius — a shallow corner reads as a flat
 * rectangle wearing a shadow rather than as a moulded surface — so `xl` was
 * added above the old `lg` when the chamfer was retired. */
export const radii = {
  sm: 8,
  md: 12,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

/**
 * The menu drawer panel. A ratio, not a fixed dp width, so the panel keeps its
 * proportion of the screen rather than swallowing a narrow one; `maxWidth`
 * stops it taking most of a tablet, where 71% is far more than a menu needs.
 *
 * This used to carry a `cutRatio` as well, for a silhouette whose two left
 * corners were cut on a ~35 degree diagonal. The drawer is rounded now, so the
 * angle and the SVG path that drew it are gone.
 */
export const drawerShape = {
  widthRatio: 0.71,
  maxWidth: 340,
  /**
   * How far down the panel's left edge each corner cut runs, as a fraction of
   * the panel's own width.
   *
   * A ratio of the width, not of the height, because the horizontal run of the
   * diagonal *is* the width: at 0.7 the cut is ~35 degrees, which is what the
   * reference draws, and it stays that angle on any screen. Tie it to height
   * instead and the angle would change with the phone.
   *
   * `ui/drawerShape.ts` clamps the pair against the real height, so a short
   * panel narrows its cuts rather than turning inside out.
   */
  cutRatio: 0.7,
} as const;

/**
 * Neumorphic depth — a surface is lit from the top-left, so it carries a
 * *pair* of shadows: a dark one down-right and a light one up-left. Raised
 * casts them outward; sunken casts the same pair inward (`inset`), which is
 * how a well, a track or a pressed control reads.
 *
 * This restores the dual-shadow system the palette was ported from. The
 * earlier note here said it "doesn't render well (or cheaply) on low-end
 * Android" and hard-zeroed both presets. That was true of the old approach,
 * where a paired shadow meant stacking wrapper Views or a shadow library.
 * React Native 0.86 on the New Architecture takes a CSS-style `boxShadow`
 * array natively — `uimanager/style/BoxShadow.kt` plus the Inset/Outset
 * shadow drawables — so a neumorphic surface is now one style prop and no
 * extra views. Verify on a device before widening the offsets further.
 *
 * Depth is deliberately *additive*, not load-bearing. The 1px `border` and
 * the `surface`/`bg` fill difference still do the separating, because these
 * users read outdoors in bright sun where a soft shadow all but vanishes. No
 * control may signal its state through shadow alone: a selected or pressed
 * thing pairs `sunken` with an accent colour.
 */
export type NeuTokens = {
  /** The down-right shadow. */
  shadowDark: string;
  /** The up-left highlight. Barely there in dark mode, where a white lift
   * over a near-black ground turns into a halo rather than a bevel. */
  shadowLight: string;
};

/** Ported unchanged from the web app's `--neo-shadow-dark`/`--neo-shadow-light`
 * (frontend/src/index.css), which were left in place when that app's shadows
 * were switched off — so both platforms still agree on the light source. */
export const neu: Record<ColorScheme, NeuTokens> = {
  light: {
    shadowDark: 'rgba(112, 128, 141, 0.36)',
    shadowLight: 'rgba(255, 255, 255, 0.9)',
  },
  dark: {
    shadowDark: 'rgba(0, 0, 0, 0.42)',
    shadowLight: 'rgba(80, 112, 96, 0.16)',
  },
};

/**
 * Offset and blur, in dp, per depth step. Blur runs a little over twice the
 * offset: tighter reads as a hard drop shadow, looser as fog.
 *
 * `sm` chips, badges, small inline marks.
 * `md` buttons, controls, nested blocks, panels floating over a map.
 * `lg` cards, the tab bar, the hero medallion.
 */
const DEPTH = {
  sm: { offset: 2, blur: 5 },
  md: { offset: 4, blur: 9 },
  lg: { offset: 7, blur: 16 },
} as const;

export type DepthLevel = keyof typeof DEPTH;

/** A shadow pair, in the shape RN's `boxShadow` style prop takes. Kept
 * structural (not a string) so callers can spread or filter it, and so the
 * builders stay unit-testable without parsing CSS. */
export type ShadowPair = {
  offsetX: number;
  offsetY: number;
  blurRadius: number;
  color: string;
  inset?: boolean;
}[];

/** A surface standing forward of the page. */
export function raised(tokens: NeuTokens, level: DepthLevel = 'md'): ShadowPair {
  const { offset, blur } = DEPTH[level];
  return [
    { offsetX: offset, offsetY: offset, blurRadius: blur, color: tokens.shadowDark },
    { offsetX: -offset, offsetY: -offset, blurRadius: blur, color: tokens.shadowLight },
  ];
}

/**
 * `raised` with the highlight dropped — for a surface floating over content it
 * does not control.
 *
 * The pair assumes the surface sits on the page background of its own scheme,
 * which is what makes a white highlight read as a lit bevel rather than as
 * light. Float the same surface over a photograph, a map, or a subtree pinned
 * to the opposite scheme, and the highlight has nothing to bevel against: at
 * `light.shadowLight`'s 0.9 alpha it paints an opaque white haze on whatever is
 * behind. The tab bar showed exactly that — a white band above it over the
 * precipitation map, invisible on Home only because that page is already
 * near-white.
 *
 * Keeps the dark half at its usual down-right offset, so the light source stays
 * where every other surface puts it.
 */
export function lifted(tokens: NeuTokens, level: DepthLevel = 'md'): ShadowPair {
  const { offset, blur } = DEPTH[level];
  return [{ offsetX: offset, offsetY: offset, blurRadius: blur, color: tokens.shadowDark }];
}

/**
 * A single dark shadow thrown one way, for a panel that overlays the page from
 * a screen edge.
 *
 * `raised` is the wrong tool for those, and silently so. It is a *pair* — dark
 * down-right, near-opaque white up-left — which reads correctly only when the
 * surface sits inside the page and both halves land on it. Pin a panel to an
 * edge and one half falls off the screen while the other takes the only visible
 * side. A right-anchored drawer showed its white half down its left edge and
 * lit the app behind it; a bottom sheet does the same along its top edge. The
 * depth language had no way to say "in front of everything, from that side",
 * so callers reached for `raised` and got a glow.
 *
 * Offset on one axis only, because an edge-anchored panel spans the full width
 * or height and has no corner to cast from. `shadowDark` keeps it on the theme
 * so it still follows the scheme.
 */
export function cast(tokens: NeuTokens, from: 'top' | 'bottom' | 'left' | 'right', level: DepthLevel = 'md'): ShadowPair {
  const { offset, blur } = DEPTH[level];
  // The panel is anchored to `from`, so the shadow falls away from that edge.
  const away = { top: [0, offset], bottom: [0, -offset], left: [offset, 0], right: [-offset, 0] }[from];
  return [{ offsetX: away[0], offsetY: away[1], blurRadius: blur * 1.75, color: tokens.shadowDark }];
}

/** The same pair thrown inward — a well, a track, or a control being pressed. */
export function sunken(tokens: NeuTokens, level: DepthLevel = 'md'): ShadowPair {
  const { offset, blur } = DEPTH[level];
  return [
    { offsetX: offset, offsetY: offset, blurRadius: blur, color: tokens.shadowDark, inset: true },
    { offsetX: -offset, offsetY: -offset, blurRadius: blur, color: tokens.shadowLight, inset: true },
  ];
}

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
  /** Hero type, for a screen whose whole job is one line — the welcome
   * wordmark. Deliberately far above `h1`: a display size that only just
   * outranks a heading reads as a mistake rather than as a decision. */
  display: { fontSize: 40, lineHeight: 44, fontFamily: fontFamily.headingBold },
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

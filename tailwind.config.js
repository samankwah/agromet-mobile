/**
 * NativeWind handles layout only in this app — flex, spacing, rounding,
 * gap. Anything color-related (backgrounds, text, borders, icons) goes
 * through `useTheme()` (src/shared/theme) instead of a Tailwind class,
 * because those values must react to light/dark mode and severity, and
 * src/shared/theme/tokens.ts is the single source of truth for that — not
 * this file. The `neo` colors below exist only for the rare
 * non-theme-reactive decorative use and mirror tokens.ts's light palette;
 * don't reach for them for anything that should change color in dark mode.
 *
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        neo: {
          bg: '#e9eff4',
          surface: '#eef3f7',
          text: '#20303b',
          muted: '#586b78',
          accent: '#23785c',
          teal: '#0b7070',
          warning: '#d9a441',
          danger: '#be4141',
        },
      },
      borderRadius: {
        neo: '14px',
        'neo-lg': '20px',
      },
    },
  },
  plugins: [],
};

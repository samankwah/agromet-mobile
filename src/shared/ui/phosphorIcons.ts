import type { Icon } from 'phosphor-react-native';

/**
 * The Phosphor glyphs the app uses, loaded one file per icon.
 *
 * Importing them from the package root bundled every icon Phosphor has, about
 * 1,500 modules, for the four below: Metro follows the package's
 * `"react-native": "src/index.tsx"` entry, which re-exports all of them, and
 * Metro does not tree-shake. The per-icon path is one the package exports on
 * purpose.
 *
 * `require` rather than `import` so TypeScript does not type-check Phosphor's
 * own `.tsx` source, which fails against this app's react-native-svg types; the
 * `Icon` annotation restores the real type at the boundary. Jest maps these
 * paths to the package's compiled copies (see `jest.config.js`).
 *
 * Add a glyph here, never from the package root.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
export const ArrowDown: Icon = require('phosphor-react-native/src/icons/ArrowDown').ArrowDownIcon;
export const ArrowUp: Icon = require('phosphor-react-native/src/icons/ArrowUp').ArrowUpIcon;
export const TrendDown: Icon = require('phosphor-react-native/src/icons/TrendDown').TrendDownIcon;
export const TrendUp: Icon = require('phosphor-react-native/src/icons/TrendUp').TrendUpIcon;
/* eslint-enable @typescript-eslint/no-require-imports */

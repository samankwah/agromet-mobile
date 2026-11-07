/**
 * expo-router imports every route file when the app starts, so anything a
 * route reaches at module scope is paid for before the first screen draws.
 * The boundary file is 645 KB and only maps and GPS lookups need it. This
 * imports every route the way the router does and checks nobody read it.
 *
 * If this fails, something now reads `GHANA_BOUNDARIES` in a top-level
 * `const`. Move the read into the function or component that uses it.
 */

// Sentry's ESM build does not load under Jest. Nothing here reports a crash.
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  wrap: jest.fn((component: unknown) => component),
  reactNavigationIntegration: jest.fn(() => ({})),
}));

// This project carries no Node type definitions, so the two Node modules the
// walk needs are typed here, as far as it uses them.
type Entry = { name: string; isDirectory: () => boolean };
const fs = jest.requireActual<{ readdirSync: (dir: string, options: { withFileTypes: true }) => Entry[] }>('fs');
const path = jest.requireActual<{ join: (...parts: string[]) => string; resolve: (...parts: string[]) => string }>('path');

// Jest runs from the project root, where `app/` is.
const APP_DIR = path.resolve('app');

function routeFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return routeFiles(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

describe('app start', () => {
  it('does not load the boundary file', () => {
    const files = routeFiles(APP_DIR);
    expect(files.length).toBeGreaterThan(10);

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- the router's own way of loading routes
      for (const file of files) require(file);
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- the same isolated registry as the routes
      const { boundariesLoaded } = require('../../shared/data/ghanaBoundaries');
      expect(boundariesLoaded()).toBe(false);
    });
  });

  it('still loads it on first read', () => {
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- a fresh copy of the module
      const { GHANA_BOUNDARIES, boundariesLoaded } = require('../../shared/data/ghanaBoundaries');
      expect(boundariesLoaded()).toBe(false);
      expect(GHANA_BOUNDARIES.districts.length).toBeGreaterThan(200);
      expect(boundariesLoaded()).toBe(true);
    });
  });
});

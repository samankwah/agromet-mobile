import type { GhanaBoundaries } from '../domain/spatialOutlook';

/**
 * Real, simplified Ghana district/region boundaries + a pre-baked grid
 * (~880 cells at 0.15° resolution, each already tagged with its region/
 * district), generated once by scripts/build-ghana-boundaries.mjs from
 * the GADM shapefiles in scripts/data/gadm41_GHA. Re-run that script if the source
 * boundary data changes; this file is never regenerated at runtime.
 *
 * **Loaded on first read, not on import.** The JSON is 645 KB, and expo-router
 * imports every route file when the app starts, so a plain `import raw from
 * './ghanaBoundaries.json'` built the whole object before the first screen
 * drew, on every launch, whether or not a map was ever opened. Each property
 * below is a getter that `require`s the file the first time anything reads it.
 * Callers are unchanged, with one rule: never read `GHANA_BOUNDARIES` at module
 * scope (in a top-level `const`), only inside a function or a component, or
 * the cost moves back to startup.
 */
let loaded: GhanaBoundaries | null = null;

function load(): GhanaBoundaries {
  if (!loaded) {
    loaded = require('./ghanaBoundaries.json') as GhanaBoundaries;
  }
  return loaded;
}

/** True once something has read the file. For the startup test only. */
export function boundariesLoaded(): boolean {
  return loaded !== null;
}

export const GHANA_BOUNDARIES: GhanaBoundaries = {
  get generatedAt() {
    return load().generatedAt;
  },
  get source() {
    return load().source;
  },
  get bounds() {
    return load().bounds;
  },
  get gridResolutionDeg() {
    return load().gridResolutionDeg;
  },
  get country() {
    return load().country;
  },
  get regions() {
    return load().regions;
  },
  get districts() {
    return load().districts;
  },
  get grid() {
    return load().grid;
  },
};

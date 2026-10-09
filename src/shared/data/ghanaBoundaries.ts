import type { GhanaBoundaries } from '../domain/spatialOutlook';
import raw from './ghanaBoundaries.json';

/**
 * Real, simplified Ghana district/region boundaries + a pre-baked grid
 * (~880 cells at 0.15° resolution, each already tagged with its region/
 * district), generated once by scripts/build-ghana-boundaries.mjs from
 * the GADM shapefiles in scripts/data/gadm41_GHA. Re-run that script if the source
 * boundary data changes; this file is never regenerated at runtime.
 */
export const GHANA_BOUNDARIES = raw as GhanaBoundaries;

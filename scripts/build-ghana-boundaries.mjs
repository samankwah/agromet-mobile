#!/usr/bin/env node
/**
 * Build-time only — generates mobile/src/shared/data/ghanaBoundaries.json
 * from the web app's existing boundary assets
 * (frontend/src/assets/ghana-district-boundaries.json,
 * frontend/src/assets/ghana-regions.json). Never run by the app itself;
 * run manually (`node scripts/build-ghana-boundaries.mjs`) whenever the
 * source boundary data changes. @turf/turf is a devDependency used only
 * here — nothing in this file is bundled into the shipped app.
 *
 * The source district file (260 ADM2 polygons) is ~3MB and has no region
 * attribute; ghana-regions.json only has district *centroid points* with a
 * region name. This script:
 *   1. Builds a district-name -> region-name map from the points file
 *      (normalized name matching + a small manual override list for the
 *      ~9% of names that don't match after normalization).
 *   2. Simplifies every district polygon (Douglas-Peucker) so the shipped
 *      asset is small enough for a low-bandwidth app.
 *   3. Dissolves districts sharing a region into region polygons, and
 *      unions everything into one national outline.
 *   4. Lays a coarse lat/lng grid over the country, keeps only cells whose
 *      center falls inside the national outline, and tags each cell with
 *      its region/district — this is the exact grid a real gridded
 *      forecast dataset will map onto later (see spatialOutlookService.ts).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import * as turf from '@turf/turf';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRONTEND_ASSETS = resolve(__dirname, '../../frontend/src/assets');
const OUTPUT_PATH = resolve(__dirname, '../src/shared/data/ghanaBoundaries.json');

const SIMPLIFY_TOLERANCE_DEG = 0.02; // ~2.2km at Ghana's latitude — coarse, but the shipped map renders at a few hundred px across; finer detail isn't perceptible there
const COORDINATE_DECIMALS = 3; // ~111m precision — plenty for a small on-screen map, cuts JSON size substantially
const GRID_RESOLUTION_DEG = 0.15; // matches the "pixelated" block size in the reference screenshots

// Districts whose shapeName in the boundary file doesn't match any name in
// ghana-regions.json even after normalization (checked by hand against
// Ghana's known administrative regions).
const REGION_OVERRIDES = {
  'kasena nankana west': 'Upper East',
  'kasena nankana east': 'Upper East',
  'wassa amenfi west': 'Western',
  'wassa amenfi central': 'Western',
  'wassa amenfi east': 'Western',
  'awutu senya': 'Central',
  'adansi asokwa': 'Ashanti',
  'adansi akrofuom': 'Ashanti',
  kpando: 'Volta',
  dormaa: 'Bono',
  'sekyere afram plains north': 'Ashanti',
  sagnerigu: 'Northern',
  'bolga east': 'Upper East',
  'assin fosu': 'Central',
  'korle klottey': 'Greater Accra',
  'accra metropolis': 'Greater Accra',
  'sekondi takoradi metropolis': 'Western',
  'asene akroso manso': 'Central',
  'upper manya': 'Eastern',
  'lower manya': 'Eastern',
  'akwapem south': 'Eastern',
  'akyem mansa': 'Eastern',
  'akwapem north': 'Eastern',
};

function roundCoordinates(node) {
  if (typeof node[0] === 'number') {
    return node.map((value) => Number(value.toFixed(COORDINATE_DECIMALS)));
  }
  return node.map(roundCoordinates);
}

function roundGeometry(geometry) {
  return { ...geometry, coordinates: roundCoordinates(geometry.coordinates) };
}

function normalizeName(raw) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\bmunicipal assembly\b/g, '')
    .replace(/\bdistrict assembly\b/g, '')
    .replace(/\bmetropolitan assembly\b/g, '')
    .replace(/\bmunicipal\b/g, '')
    .replace(/\bmetropolitan\b/g, '')
    .replace(/\bdistrict\b/g, '')
    .replace(/\bassembly\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function loadRegionLookup() {
  const regions = JSON.parse(readFileSync(resolve(FRONTEND_ASSETS, 'ghana-regions.json'), 'utf8'));
  const lookup = new Map();
  for (const feature of regions.features) {
    lookup.set(normalizeName(feature.properties.name), feature.properties.region);
  }
  return lookup;
}

function resolveRegion(shapeName, lookup) {
  const normalized = normalizeName(shapeName);
  return lookup.get(normalized) ?? REGION_OVERRIDES[normalized] ?? null;
}

function main() {
  const regionLookup = loadRegionLookup();
  const districtsRaw = JSON.parse(readFileSync(resolve(FRONTEND_ASSETS, 'ghana-district-boundaries.json'), 'utf8'));

  const districtFeatures = [];
  const unresolved = [];

  for (const feature of districtsRaw.features) {
    const shapeName = feature.properties.shapeName;
    const region = resolveRegion(shapeName, regionLookup);
    if (!region) {
      unresolved.push(shapeName);
      continue;
    }
    const simplified = turf.simplify(feature, { tolerance: SIMPLIFY_TOLERANCE_DEG, highQuality: false });
    districtFeatures.push(turf.feature(simplified.geometry, { name: shapeName, region }));
  }

  if (unresolved.length > 0) {
    console.error(`Could not resolve a region for ${unresolved.length} district(s):`, unresolved);
    process.exit(1);
  }

  console.log(`Resolved region for all ${districtFeatures.length} districts.`);

  // turf.dissolve only accepts single Polygons — flatten any MultiPolygon
  // district (islands/exclaves) into one Polygon feature per part, all
  // tagged with the same region, purely for this dissolve step. The
  // per-district output below keeps the original (possibly Multi) geometry.
  const singlePolygonFeatures = districtFeatures.flatMap((feature) => {
    if (feature.geometry.type === 'Polygon') return [feature];
    return feature.geometry.coordinates.map((coords) => turf.polygon(coords, { region: feature.properties.region }));
  });
  const dissolved = turf.dissolve(turf.featureCollection(singlePolygonFeatures), { propertyName: 'region' });
  const regionFeatures = dissolved.features.map((feature) => turf.feature(feature.geometry, { name: feature.properties.region }));

  // Union everything into one national outline.
  let country = districtFeatures[0];
  for (let i = 1; i < districtFeatures.length; i += 1) {
    const unioned = turf.union(turf.featureCollection([country, districtFeatures[i]]));
    if (unioned) country = unioned;
  }
  const countryFeature = turf.feature(country.geometry, { name: 'Ghana' });

  // Grid: coarse cells over the country's bounding box, kept only where the
  // cell center falls inside the national outline, tagged with the
  // region/district that contains that center point.
  const [minLng, minLat, maxLng, maxLat] = turf.bbox(countryFeature);
  const cells = [];
  let cellId = 0;
  for (let lat = minLat; lat <= maxLat; lat += GRID_RESOLUTION_DEG) {
    for (let lng = minLng; lng <= maxLng; lng += GRID_RESOLUTION_DEG) {
      const center = turf.point([lng + GRID_RESOLUTION_DEG / 2, lat + GRID_RESOLUTION_DEG / 2]);
      if (!turf.booleanPointInPolygon(center, countryFeature)) continue;

      const regionMatch = regionFeatures.find((region) => turf.booleanPointInPolygon(center, region));
      const districtMatch = districtFeatures.find((district) => turf.booleanPointInPolygon(center, district));

      cells.push({
        id: cellId++,
        lat: Number((lat + GRID_RESOLUTION_DEG / 2).toFixed(4)),
        lng: Number((lng + GRID_RESOLUTION_DEG / 2).toFixed(4)),
        regionName: regionMatch?.properties.name ?? null,
        districtName: districtMatch?.properties.name ?? null,
      });
    }
  }

  console.log(`Generated ${cells.length} grid cells at ${GRID_RESOLUTION_DEG}° resolution.`);

  const output = {
    generatedAt: new Date().toISOString(),
    bounds: { minLng, minLat, maxLng, maxLat },
    gridResolutionDeg: GRID_RESOLUTION_DEG,
    country: turf.feature(roundGeometry(countryFeature.geometry), countryFeature.properties),
    regions: regionFeatures.map((feature) => turf.feature(roundGeometry(feature.geometry), feature.properties)),
    districts: districtFeatures.map((feature) =>
      turf.feature(roundGeometry(feature.geometry), { name: feature.properties.name, region: feature.properties.region }),
    ),
    grid: cells,
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(output));
  const sizeKb = Buffer.byteLength(JSON.stringify(output)) / 1024;
  console.log(`Wrote ${OUTPUT_PATH} (${sizeKb.toFixed(0)} KB)`);
}

main();

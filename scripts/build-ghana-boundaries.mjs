#!/usr/bin/env node
/**
 * Build-time only: generates mobile/src/shared/data/ghanaBoundaries.json from
 * the GADM 4.1 shapefiles in scripts/data/gadm41_GHA (see PROVENANCE.md
 * there). Never run by the app; run `node scripts/build-ghana-boundaries.mjs`
 * when the source shapefiles change. mapshaper and @turf/turf are
 * devDependencies used only here.
 *
 *   1. Reads the 260 district polygons and fixes the one mislabelled record.
 *   2. Simplifies them with mapshaper, which keeps the shared topology: a
 *      border two districts share is simplified once, so neighbours still meet
 *      exactly and no slivers or seams appear. The tolerance is absolute
 *      (metres), not a percentage, so the small Accra and Kumasi districts keep
 *      their shape instead of collapsing to triangles.
 *   3. Dissolves those same simplified districts into the sixteen regions and
 *      the national outline, so all three layers line up to the vertex.
 *   4. Renames every district to the spelling the backend stores (from
 *      src/shared/data/ghanaRegions.ts), so the map, search, alerts and the
 *      calendar filters all say the same name.
 *   5. Lays the 0.15° outlook grid over the country and tags each cell with
 *      the district and region its centre falls in.
 *
 * It stops with an error, writing nothing, if any check below fails.
 */
import { Buffer } from 'node:buffer';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import mapshaper from 'mapshaper';
import * as turf from '@turf/turf';

import { GHANA_REGIONS } from '../src/shared/data/ghanaRegions.ts';
import { districtId } from '../src/shared/data/districtId.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE_DIR = resolve(__dirname, 'data/gadm41_GHA');
const OUTPUT_PATH = resolve(__dirname, '../src/shared/data/ghanaBoundaries.json');

const SIMPLIFY_INTERVAL_M = 400; // at city zoom indistinguishable from 250 m, and 630 KB against 900 KB
const COORDINATE_DECIMALS = 4; // ~11 m
const GRID_RESOLUTION_DEG = 0.15;

/* Pinned to the origin of the grid this file has always shipped, so every cell
   centre stays exactly where it was. Forecast services, the backend's
   precip_grid.json and saved map state all key on those centres; a new outline
   with a slightly different bounding box must not shift them. */
const GRID_ORIGIN = { minLng: -3.25491173484504, minLat: 4.74540425403578 };

/* GADM spells these differently from the backend. Keyed by "Region|GADM name". */
const NAME_ALIASES = {
  'Ashanti|Sekyere Afram Plains North': 'Sekyere Afram Plains',
  'Bono|Dormaa': 'Dormaa Central Municipal',
  'Eastern|Akwapem North': 'Akwapim North Municipal',
  'Eastern|Akwapem South': 'Akwapim South',
  'Eastern|Upper Manya': 'Upper Manya Krobo',
  'Northern|Sagnerigu': 'Sagnarigu Municipal',
  'Northern|Zabzu-gu': 'Zabzugu',
  'Upper East|Bolga East': 'Bolgatanga East',
  'Upper East|Kasena Nankana East': 'Kassena Nankana East Municipal',
  'Upper East|Kasena Nankana West': 'Kassena Nankana West',
  'Western|Wassa Amenfi Central': 'Amenfi Central',
  'Western|Wassa Amenfi East': 'Amenfi East Municipal',
  'Western|Wassa Amenfi West': 'Amenfi West Municipal',
};

/* Districts in the official list that the shapefile has no polygon for. */
const KNOWN_WITHOUT_SHAPE = ['Guan'];

/* Spot checks: a town, and the district it must land in. */
const TOWN_CHECKS = [
  ['Accra', 5.55, -0.205, 'Accra Metropolitan'],
  ['Kumasi (Adum)', 6.693, -1.624, 'Kumasi Metropolitan'],
  ['Tamale', 9.403, -0.842, 'Tamale Metropolitan'],
  ['Ho', 6.601, 0.471, 'Ho Municipal'],
  ['Bolgatanga', 10.7856, -0.8514, 'Bolgatanga Municipal'],
  ['Wa', 10.0601, -2.5099, 'Wa Municipal'],
  ['Sunyani', 7.3349, -2.3123, 'Sunyani Municipal'],
  ['Fomena', 6.268, -1.498, 'Adansi North'],
  ['Kibi', 6.165, -0.554, 'Abuakwa South Municipal'],
  ['Cape Coast', 5.105, -1.247, 'Cape Coast Metropolitan'],
];

function fail(message) {
  console.error(`\nbuild-ghana-boundaries: ${message}`);
  process.exit(1);
}

function normalizeName(raw) {
  return raw
    .toLowerCase()
    .replace(/\b(municipal|metropolitan|metropolis|district)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function roundCoordinates(node) {
  if (typeof node[0] === 'number') return node.map((value) => Number(value.toFixed(COORDINATE_DECIMALS)));
  return node.map(roundCoordinates);
}

function roundGeometry(geometry) {
  return { type: geometry.type, coordinates: roundCoordinates(geometry.coordinates) };
}

function vertexCount(geometry) {
  return turf.coordAll(geometry).length;
}

async function runMapshaper() {
  const input = resolve(SOURCE_DIR, 'gadm41_GHA_2.shp').replaceAll('\\', '/');
  /* Two "Adansi Asokwa" records exist; the western one (it reaches -1.707°)
     is Adansi North, which is otherwise missing. Checked below by Fomena, its
     capital, landing inside it. */
  const commands = [
    `-i "${input}" snap name=districts`,
    `-each "if (Level3Name === 'Adansi Asokwa' && this.bounds[0] < -1.65) Level3Name = 'Adansi North'"`,
    `-simplify weighted interval=${SIMPLIFY_INTERVAL_M} keep-shapes`,
    `-dissolve2 Level2Name target=districts + name=regions`,
    `-dissolve2 target=districts + name=country`,
    `-o target=* format=geojson`,
  ].join(' ');
  const out = await mapshaper.applyCommands(commands);
  const layer = (name) => JSON.parse(out[`${name}.json`]);
  return { districts: layer('districts'), regions: layer('regions'), country: layer('country') };
}

function canonicalNames() {
  const lookup = new Map();
  for (const region of GHANA_REGIONS) {
    const regionName = region.name.replace(/ Region$/, '');
    for (const district of region.districts) {
      lookup.set(`${regionName}|${normalizeName(district)}`, district);
    }
  }
  return lookup;
}

function regionAreas() {
  return mapshaper
    .applyCommands(`-i "${resolve(SOURCE_DIR, 'gadm41_GHA_1.shp').replaceAll('\\', '/')}" -o out.json format=geojson`)
    .then((out) => new Map(JSON.parse(out['out.json']).features.map((feature) => [feature.properties.Level2Name, turf.area(feature)])));
}

async function main() {
  const raw = await runMapshaper();
  const canonical = canonicalNames();

  // --- districts ---------------------------------------------------------
  const districts = raw.districts.features.map((feature) => {
    const region = feature.properties.Level2Name;
    const gadmName = feature.properties.Level3Name;
    const name = NAME_ALIASES[`${region}|${gadmName}`] ?? canonical.get(`${region}|${normalizeName(gadmName)}`);
    if (!name) fail(`no app name for GADM district "${gadmName}" (${region}); add it to NAME_ALIASES`);
    const geometry = roundGeometry(feature.geometry);
    const label = turf.pointOnFeature({ type: 'Feature', geometry, properties: {} }).geometry.coordinates;
    return {
      type: 'Feature',
      geometry,
      properties: {
        id: districtId(name),
        name,
        region,
        label: [Number(label[0].toFixed(COORDINATE_DECIMALS)), Number(label[1].toFixed(COORDINATE_DECIMALS))],
      },
    };
  });

  if (districts.length !== 260) fail(`expected 260 district polygons, got ${districts.length}`);
  const ids = districts.map((feature) => feature.properties.id);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicateIds.length) fail(`duplicate district ids: ${duplicateIds.join(', ')}`);

  const shaped = new Set(districts.map((feature) => feature.properties.name));
  const withoutShape = [...canonical.values()].filter((name) => !shaped.has(name));
  if (withoutShape.sort().join() !== [...KNOWN_WITHOUT_SHAPE].sort().join()) {
    fail(`districts in ghanaRegions.ts with no polygon: ${withoutShape.join(', ')} (expected only ${KNOWN_WITHOUT_SHAPE.join(', ')})`);
  }

  /* A closed triangle is 4 coordinates. Ayawaso Central, the smallest district,
     has only 15 in the source and keeps 6, a pentagon. */
  const thin = districts.filter((feature) => vertexCount(feature.geometry) < 6);
  if (thin.length) {
    fail(`over-simplified districts: ${thin.map((f) => `${f.properties.name} (${vertexCount(f.geometry)})`).join(', ')}`);
  }

  // --- regions and country ------------------------------------------------
  const regions = raw.regions.features.map((feature) => ({
    type: 'Feature',
    geometry: roundGeometry(feature.geometry),
    properties: { name: feature.properties.Level2Name },
  }));
  if (regions.length !== 16) fail(`expected 16 region features, got ${regions.length}`);

  const officialAreas = await regionAreas();
  for (const region of regions) {
    const official = officialAreas.get(region.properties.name);
    if (!official) fail(`region "${region.properties.name}" is not in gadm41_GHA_1`);
    const drift = Math.abs(turf.area(region) - official) / official;
    if (drift > 0.01) fail(`region ${region.properties.name} differs from the GADM region outline by ${(drift * 100).toFixed(1)}%`);
  }

  // A layer with no attributes comes out of mapshaper as a GeometryCollection.
  const countryParts = raw.country.geometries ?? raw.country.features.map((feature) => feature.geometry);
  if (countryParts.length !== 1) fail(`expected one national outline, got ${countryParts.length}`);
  const country = { type: 'Feature', geometry: roundGeometry(countryParts[0]), properties: { name: 'Ghana' } };

  // --- spot checks ----------------------------------------------------------
  const districtAtPoint = (lat, lng) => districts.find((feature) => turf.booleanPointInPolygon(turf.point([lng, lat]), feature));
  for (const [town, lat, lng, expected] of TOWN_CHECKS) {
    const found = districtAtPoint(lat, lng)?.properties.name;
    if (found !== expected) fail(`${town} landed in ${found ?? 'no district'}, expected ${expected}`);
  }

  // --- grid ----------------------------------------------------------------
  const [minLng, minLat, maxLng, maxLat] = turf.bbox(country);
  const cells = [];
  for (let lat = GRID_ORIGIN.minLat; lat <= maxLat; lat += GRID_RESOLUTION_DEG) {
    for (let lng = GRID_ORIGIN.minLng; lng <= maxLng; lng += GRID_RESOLUTION_DEG) {
      const centerLat = lat + GRID_RESOLUTION_DEG / 2;
      const centerLng = lng + GRID_RESOLUTION_DEG / 2;
      const center = turf.point([centerLng, centerLat]);
      if (!turf.booleanPointInPolygon(center, country)) continue;
      const district = districts.find((feature) => turf.booleanPointInPolygon(center, feature));
      cells.push({
        id: cells.length,
        lat: Number(centerLat.toFixed(4)),
        lng: Number(centerLng.toFixed(4)),
        regionName: district?.properties.region ?? null,
        districtName: district?.properties.name ?? null,
      });
    }
  }

  const output = {
    generatedAt: new Date().toISOString(),
    source: 'GADM 4.1 Ghana, 16-region edition (scripts/data/gadm41_GHA)',
    bounds: { minLng, minLat, maxLng, maxLat },
    gridResolutionDeg: GRID_RESOLUTION_DEG,
    country,
    regions,
    districts,
    grid: cells,
  };

  const json = JSON.stringify(output);
  writeFileSync(OUTPUT_PATH, json);

  const counts = districts.map((feature) => vertexCount(feature.geometry)).sort((a, b) => a - b);
  const gridDistricts = new Set(cells.map((cell) => cell.districtName).filter(Boolean));
  console.log(
    `districts: ${districts.length}, vertices min ${counts[0]} / median ${counts[counts.length >> 1]} / total ${counts.reduce((a, b) => a + b, 0)}`,
  );
  console.log(`regions: ${regions.length}, country vertices ${vertexCount(country.geometry)}`);
  console.log(`grid: ${cells.length} cells, ${gridDistricts.size} districts own at least one`);
  console.log(`wrote ${OUTPUT_PATH} (${(Buffer.byteLength(json) / 1024).toFixed(0)} KB)`);
}

main().catch((error) => fail(error.stack ?? String(error)));

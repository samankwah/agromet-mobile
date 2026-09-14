import { GHANA_BOUNDARIES } from '../../data/ghanaBoundaries';
import type { SpatialGeography } from '../../domain/spatialOutlook';

/**
 * The pieces every MapLibre-in-a-WebView document in this app shares.
 *
 * Extracted when the precipitation map arrived as a second such document. The
 * two have different jobs and deliberately do not share a component (see
 * ui/MapLibrePrecipitation.tsx), but they must not drift on which MapLibre
 * build they load or which basemap they draw, because that is the kind of
 * difference nobody notices until one map works offline and the other does not.
 */
export const MAPLIBRE_VERSION = '5.24.0';

/**
 * CARTO's vector basemaps, neither of which needs an API key (verified).
 *
 * `positron` is the pale one the choropleths use, where the data fill is the
 * loud thing and the basemap is context. `darkMatter` is for the rain map,
 * where the reverse is true: satellite rain is bright green through red, and
 * on a pale basemap the light end of that ramp disappears.
 */
export const CARTO_STYLES = {
  light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
} as const;

/** The script and stylesheet tags, so both documents load one MapLibre build. */
export function mapLibreHeadTags(): string {
  return (
    `<link href="https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css" rel="stylesheet" />` +
    `<script src="https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.js"></script>`
  );
}

/**
 * Boundary outlines for the given geography level, so region or district lines
 * sit above the data and the reader can tell which part of Ghana they are
 * looking at.
 */
export function buildBoundaryGeoJson(geography: SpatialGeography): string {
  const features = geography === 'region' ? GHANA_BOUNDARIES.regions : GHANA_BOUNDARIES.districts;
  return JSON.stringify({ type: 'FeatureCollection', features });
}

/**
 * The id of the basemap's first symbol layer.
 *
 * Data added *before* this layer sits over the basemap's land but under its
 * place names, which is the difference between a map of Ghana with rain on it
 * and a coloured shape with no way to tell where you are. Returns undefined on
 * a style with no symbol layers, where MapLibre's default of appending on top
 * is the right answer anyway.
 */
export const FIRST_SYMBOL_LAYER_SNIPPET = `
  function firstSymbolLayerId(map) {
    var layers = map.getStyle().layers || [];
    for (var i = 0; i < layers.length; i += 1) {
      if (layers[i].type === 'symbol') return layers[i].id;
    }
    return undefined;
  }
`;

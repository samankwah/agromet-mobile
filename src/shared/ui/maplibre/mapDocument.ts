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

const ESRI_CANVAS = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas';

/** Esri's own credit line for the Canvas basemaps, as its service reports it. */
export const ESRI_ATTRIBUTION = 'Esri, HERE, Garmin, © OpenStreetMap contributors, and the GIS user community';

/** The id of the Esri labels layer. Rain is drawn just below it, so towns and
 * borders stay readable on top of the rain. */
export const ESRI_LABELS_LAYER = 'esri-labels';

/**
 * Esri's Dark Gray Canvas, for the rain map: a quiet dark ground that the
 * bright rain colours stand out on, the same reason the CARTO dark map was
 * used before it.
 *
 * Two raster tile layers from Esri's public tile service, which needs no key
 * (checked): the grey base, and a transparent layer of place names and borders
 * drawn on top. Tiles have detail to zoom 16; MapLibre enlarges them past that.
 * The credit travels on the base source, so MapLibre's attribution control
 * shows it alongside the app's own credits.
 */
export const ESRI_DARK_GRAY_STYLE = JSON.stringify({
  version: 8,
  sources: {
    'esri-base': {
      type: 'raster',
      tiles: [`${ESRI_CANVAS}/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`],
      tileSize: 256,
      maxzoom: 16,
      attribution: ESRI_ATTRIBUTION,
    },
    'esri-reference': {
      type: 'raster',
      tiles: [`${ESRI_CANVAS}/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`],
      tileSize: 256,
      maxzoom: 16,
    },
  },
  layers: [
    { id: 'esri-base', type: 'raster', source: 'esri-base' },
    { id: ESRI_LABELS_LAYER, type: 'raster', source: 'esri-reference' },
  ],
});

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

import React, { useMemo, useRef } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

import { GHANA_BOUNDARIES } from '../data/ghanaBoundaries';
import type { SpatialGeography, SpatialGridCell, SpatialValueFormat } from '../domain/spatialOutlook';
import { useTheme } from '../theme/ThemeProvider';
import { buildColorClasses, TERCILE_CATEGORIES } from '../utils/colorScale';
import { formatSpatialValue } from '../utils/formatSpatialValue';

type Props = {
  cells: SpatialGridCell[];
  min: number;
  max: number;
  geography: SpatialGeography;
  height: number;
  /** Shown as the layer caption inside the map. */
  variableLabel: string;
  /** Controls how a tapped cell's value is written out — matching the
   * legend exactly (e.g. "Apr W2" for onset rather than "day 102"). */
  valueFormat: SpatialValueFormat;
  /** Probability view: cells carry tercile indices and render as the three
   * named categories rather than a numeric ramp. */
  isTercile: boolean;
};

/**
 * MapLibre GL JS over a CARTO basemap, rendered inside a WebView.
 *
 * Why a WebView rather than `@maplibre/maplibre-react-native`: the native
 * module is not part of Expo Go's bundled set, so adopting it would force
 * a development build and break the Expo Go workflow on both iOS and
 * Android. This renders the same MapLibre engine and the same CARTO
 * vector basemap while keeping Expo Go working. Swap to the native module
 * later if/when the project moves to dev/EAS builds — only this file
 * changes, since the props are already map-library-agnostic.
 *
 * CARTO's `positron-gl-style` needs no API key (verified), and the
 * basemap gives the place labels, roads and boundaries that make a
 * forecast overlay legible as *Ghana* rather than an abstract shape.
 */
const MAPLIBRE_VERSION = '5.24.0';
const CARTO_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

/** Grid cells -> GeoJSON squares. Building the polygons here (rather than
 * in the WebView) keeps the injected payload declarative and means the
 * same GeoJSON could be handed to a native map later untouched. */
function buildGeoJson(cells: SpatialGridCell[], valueFormat: SpatialValueFormat, range: number, isTercile: boolean): string {
  const half = GHANA_BOUNDARIES.gridResolutionDeg / 2;
  const features = cells.map((cell) => ({
    type: 'Feature',
    properties: {
      value: cell.value,
      // Pre-formatted here rather than in the WebView so the popup and the
      // legend share one formatter — duplicating that logic in injected JS
      // is exactly how the two would silently drift apart.
      label: isTercile ? (TERCILE_CATEGORIES[cell.value]?.label ?? 'Normal') : formatSpatialValue(cell.value, valueFormat, range),
      region: cell.regionName,
      district: cell.districtName,
    },
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [cell.lng - half, cell.lat - half],
          [cell.lng + half, cell.lat - half],
          [cell.lng + half, cell.lat + half],
          [cell.lng - half, cell.lat + half],
          [cell.lng - half, cell.lat - half],
        ],
      ],
    },
  }));
  return JSON.stringify({ type: 'FeatureCollection', features });
}

/** Boundary outlines for the selected geography level, so region/district
 * lines sit above the forecast fill the way they do in the reference. */
function buildBoundaryGeoJson(geography: SpatialGeography): string {
  const features = geography === 'region' ? GHANA_BOUNDARIES.regions : GHANA_BOUNDARIES.districts;
  return JSON.stringify({ type: 'FeatureCollection', features });
}

/**
 * A MapLibre `step` expression — discrete classes, matching the legend
 * exactly. Deliberately not `interpolate`: a continuous ramp can't be read
 * back against a classed legend, and the two would describe different
 * things. Both derive from `buildColorClasses`, so they cannot disagree.
 *
 * Shape: [step, input, <colour below first break>, break, colour, ...].
 * The first class's colour is the base; each subsequent entry supplies the
 * break value where the next colour takes over.
 */
function buildColorRamp(min: number, max: number, isTercile: boolean): string {
  if (isTercile) {
    // Values are tercile indices 0/1/2 — match on the index directly
    // rather than deriving numeric breaks that would land between them.
    const [below, normal, above] = TERCILE_CATEGORIES;
    return JSON.stringify(['step', ['get', 'value'], below.color, 1, normal.color, 2, above.color]);
  }
  const classes = buildColorClasses(min, max);
  const [first, ...rest] = classes;
  const steps = rest.flatMap((entry) => [entry.from, entry.color]);
  return JSON.stringify(['step', ['get', 'value'], first.color, ...steps]);
}

function buildHtml(props: Props): string {
  const { cells, min, max, geography, variableLabel, valueFormat, isTercile } = props;
  const { minLng, minLat, maxLng, maxLat } = GHANA_BOUNDARIES.bounds;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link href="https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css" rel="stylesheet" />
<script src="https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.js"></script>
<style>
  html, body, #map { margin:0; padding:0; height:100%; width:100%; background:transparent; }
  .maplibregl-ctrl-attrib { font-size: 9px; }
  #offline {
    position:absolute; inset:0; display:none; align-items:center; justify-content:center;
    font-family: system-ui, sans-serif; font-size:14px; color:#586b78; text-align:center; padding:24px;
  }
</style>
</head>
<body>
<div id="map"></div>
<div id="offline">Map imagery needs a connection.<br/>The forecast values are still available in the panel below.</div>
<script>
  // If MapLibre or the basemap can't load (offline / blocked), fail to a
  // readable message instead of a blank rectangle.
  function showOffline() {
    document.getElementById('map').style.display = 'none';
    document.getElementById('offline').style.display = 'flex';
  }

  if (typeof maplibregl === 'undefined') {
    showOffline();
  } else {
    try {
      var map = new maplibregl.Map({
        container: 'map',
        style: '${CARTO_STYLE}',
        bounds: [[${minLng}, ${minLat}], [${maxLng}, ${maxLat}]],
        fitBoundsOptions: { padding: 16 },
        attributionControl: { compact: true }
      });

      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

      map.on('error', function (e) {
        // Style/tile failures land here — most often no network.
        if (e && e.error && /Failed to fetch|NetworkError/i.test(String(e.error.message || ''))) showOffline();
      });

      map.on('load', function () {
        map.addSource('forecast', { type: 'geojson', data: ${buildGeoJson(cells, valueFormat, max - min, isTercile)} });
        map.addSource('boundaries', { type: 'geojson', data: ${buildBoundaryGeoJson(geography)} });

        // Forecast fill sits above the basemap's land but below its
        // labels, so place names stay readable over the data.
        map.addLayer({
          id: 'forecast-fill',
          type: 'fill',
          source: 'forecast',
          paint: { 'fill-color': ${buildColorRamp(min, max, isTercile)}, 'fill-opacity': 0.72 }
        });

        map.addLayer({
          id: 'boundary-line',
          type: 'line',
          source: 'boundaries',
          paint: { 'line-color': '#37474f', 'line-width': 0.8, 'line-opacity': 0.55 }
        });

        // Tap a cell to read its exact value — the legend gives the range,
        // this answers "what is it *here*".
        map.on('click', 'forecast-fill', function (e) {
          var f = e.features && e.features[0];
          if (!f) return;
          var p = f.properties || {};
          var place = p.district || p.region || 'Selected area';
          new maplibregl.Popup({ closeButton: false })
            .setLngLat(e.lngLat)
            .setHTML('<div style="font-family:system-ui,sans-serif;font-size:12px"><strong>' + place + '</strong><br/>' +
                     ${JSON.stringify(variableLabel)} + ': ' + p.label + '</div>')
            .addTo(map);
        });
        map.on('mouseenter', 'forecast-fill', function () { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', 'forecast-fill', function () { map.getCanvas().style.cursor = ''; });
      });
    } catch (err) {
      showOffline();
    }
  }
</script>
</body>
</html>`;
}

export function MapLibreChoropleth({ cells, min, max, geography, height, variableLabel, valueFormat, isTercile }: Props) {
  const theme = useTheme();
  const webViewRef = useRef<WebView>(null);

  // Rebuild the document only when the rendered data actually changes —
  // otherwise every parent re-render would remount the map and lose the
  // user's pan/zoom position.
  const html = useMemo(
    () => buildHtml({ cells, min, max, geography, height, variableLabel, valueFormat, isTercile }),
    [cells, min, max, geography, height, variableLabel, valueFormat, isTercile],
  );

  return (
    <View style={{ width: '100%', height, backgroundColor: theme.colors.bg }}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html }}
        style={{ flex: 1, backgroundColor: 'transparent' }}
        javaScriptEnabled
        domStorageEnabled
        // The map handles its own panning; letting the WebView bounce
        // would fight the drawer's scroll gesture above it.
        bounces={false}
        scrollEnabled={false}
        setSupportMultipleWindows={false}
      />
    </View>
  );
}

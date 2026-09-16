import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { GHANA_BOUNDARIES } from '../data/ghanaBoundaries';
import type { SpatialGeography, SpatialGridCell, SpatialValueFormat } from '../domain/spatialOutlook';
import { useTheme } from '../theme/ThemeProvider';
import { buildColorClasses, TERCILE_CATEGORIES, type ColorStops } from '../utils/colorScale';
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
  /** Overrides `TERCILE_CATEGORIES`, so the online renderer bins identically to
   * the offline SVG one. See `utils/tercilePalette.ts`. */
  palette?: { label: string; color: string; sublabel?: string }[];
  /** Called with the tapped cell's place and coordinate. Omit it and the map
   * keeps its read-only popup, which is what the Seasonal view still wants. */
  onSelect?: (selection: MapSelection) => void;
  /** The continuous ramp for the fill. Must be the same one handed to the
   * legend: a map keyed by a scale it does not use is the failure mode this
   * component has already hit once. */
  stops?: ColorStops;
  /** Called when a tap lands on the map but not on any forecast cell. The
   * host uses it to dismiss whatever is overlaying the map, which is the
   * gesture people already expect from a bottom sheet. */
  onDismiss?: () => void;
  /** The place whose outline should read as selected. Pushed into the live map
   * rather than rebuilt into the document, so selecting does not reload the
   * basemap or throw away the reader's pan and zoom. */
  selected?: { region: string | null; district: string | null } | null;
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

/** What a tap on the map resolves to. */
export type MapSelection = {
  lat: number;
  lng: number;
  region: string | null;
  district: string | null;
  /** The formatted value already shown in the popup, so a caller can label its
   * own panel without re-deriving the formatting. */
  label: string;
};

/** Grid cells -> GeoJSON squares. Building the polygons here (rather than
 * in the WebView) keeps the injected payload declarative and means the
 * same GeoJSON could be handed to a native map later untouched. */
function buildGeoJson(
  cells: SpatialGridCell[],
  valueFormat: SpatialValueFormat,
  range: number,
  isTercile: boolean,
  categories: { label: string; color: string }[],
): string {
  const half = GHANA_BOUNDARIES.gridResolutionDeg / 2;
  const features = cells.map((cell) => ({
    type: 'Feature',
    properties: {
      value: cell.value,
      // Pre-formatted here rather than in the WebView so the popup and the
      // legend share one formatter — duplicating that logic in injected JS
      // is exactly how the two would silently drift apart.
      label: isTercile ? (categories[cell.value]?.label ?? 'No signal') : formatSpatialValue(cell.value, valueFormat, range),
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
function buildColorRamp(
  min: number,
  max: number,
  isTercile: boolean,
  categories: { label: string; color: string }[],
  stops?: ColorStops,
): string {
  if (isTercile) {
    // Values are palette indices — match on the index directly rather than
    // deriving numeric breaks that would land between them. Built from the
    // palette's own length so a five-band ramp works as well as a three.
    const [first, ...rest] = categories;
    const steps = rest.flatMap((entry, index) => [index + 1, entry.color]);
    return JSON.stringify(['step', ['get', 'value'], first.color, ...steps]);
  }
  const classes = buildColorClasses(min, max, undefined, stops);
  const [first, ...rest] = classes;
  const steps = rest.flatMap((entry) => [entry.from, entry.color]);
  return JSON.stringify(['step', ['get', 'value'], first.color, ...steps]);
}

/**
 * Everything that changes when the reader picks another variable, period or
 * view: the cells, the colour ramp and the popup's caption. Pushed into the
 * running map as one script rather than baked into the document, because a new
 * document reloads MapLibre from the CDN, refetches the basemap style, parses
 * the boundaries again and throws away the reader's pan and zoom.
 */
function buildDataScript(
  props: Pick<Props, 'cells' | 'min' | 'max' | 'variableLabel' | 'valueFormat' | 'isTercile' | 'palette' | 'stops'>,
): string {
  const { cells, min, max, variableLabel, valueFormat, isTercile, palette, stops } = props;
  const categories = palette ?? TERCILE_CATEGORIES;
  return (
    `(function(){var d={geojson:${buildGeoJson(cells, valueFormat, max - min, isTercile, categories)},` +
    `ramp:${buildColorRamp(min, max, isTercile, categories, stops)},label:${JSON.stringify(variableLabel)}};` +
    `if(window.__setData){window.__setData(d);}else{window.__pendingData=d;}})();true;`
  );
}

/** The map itself: basemap, boundaries and behaviour. Depends on the geography
 * alone, so it is built once per boundary level rather than per data change. */
function buildHtml(geography: SpatialGeography): string {
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
        // Starts empty; the host pushes the cells once this page says it is
        // ready (see the 'ready' message below).
        map.addSource('forecast', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        map.addSource('boundaries', { type: 'geojson', data: ${buildBoundaryGeoJson(geography)} });

        // Forecast fill sits above the basemap's land but below its
        // labels, so place names stay readable over the data.
        map.addLayer({
          id: 'forecast-fill',
          type: 'fill',
          source: 'forecast',
          paint: { 'fill-color': 'rgba(0,0,0,0)', 'fill-opacity': 0.72 }
        });

        map.addLayer({
          id: 'boundary-line',
          type: 'line',
          source: 'boundaries',
          paint: { 'line-color': '#37474f', 'line-width': 0.8, 'line-opacity': 0.55 }
        });

        // Tap a cell to read its exact value — the legend gives the range,
        // this answers "what is it *here*".
        // Starts matching nothing; the host swaps the filter in when a place
        // is chosen. Sitting above the ordinary boundary line so a selected
        // outline reads as selected rather than merely present.
        map.addLayer({
          id: 'boundary-selected',
          type: 'line',
          source: 'boundaries',
          filter: ['==', ['get', 'name'], '__none__'],
          paint: { 'line-color': '#111827', 'line-width': 2.4, 'line-opacity': 0.95 }
        });

        window.__setSelected = function (filter) {
          if (!map.getLayer('boundary-selected')) return;
          map.setFilter('boundary-selected', filter);
        };
        if (window.__pendingSelected) {
          window.__setSelected(window.__pendingSelected);
          window.__pendingSelected = null;
        }

        var variableLabel = '';
        window.__setData = function (d) {
          map.getSource('forecast').setData(d.geojson);
          map.setPaintProperty('forecast-fill', 'fill-color', d.ramp);
          variableLabel = d.label;
        };
        if (window.__pendingData) {
          window.__setData(window.__pendingData);
          window.__pendingData = null;
        }

        // Anything injected before this document existed ran against a blank
        // page and was lost, so the host waits for this before pushing data.
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
        }

        map.on('click', function (e) {
          var hits = map.queryRenderedFeatures(e.point, { layers: ['forecast-fill'] });
          if (hits.length) return;
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'dismiss' }));
          }
        });

        map.on('click', 'forecast-fill', function (e) {
          var f = e.features && e.features[0];
          if (!f) return;
          var p = f.properties || {};
          var place = p.district || p.region || 'Selected area';

          // Report the tap to React Native as well as showing the popup. The
          // popup answers "what is it here"; the message lets the host open a
          // detail panel for the same place without a second gesture.
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'select',
              lat: e.lngLat.lat,
              lng: e.lngLat.lng,
              region: p.region || null,
              district: p.district || null,
              label: String(p.label)
            }));
          }

          new maplibregl.Popup({ closeButton: false })
            .setLngLat(e.lngLat)
            .setHTML('<div style="font-family:system-ui,sans-serif;font-size:12px"><strong>' + place + '</strong><br/>' +
                     variableLabel + ': ' + p.label + '</div>')
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

export function MapLibreChoropleth({
  cells,
  min,
  max,
  geography,
  height,
  variableLabel,
  valueFormat,
  isTercile,
  palette,
  onSelect,
  onDismiss,
  stops,
  selected,
}: Props) {
  const theme = useTheme();
  const webViewRef = useRef<WebView>(null);

  const [documentReady, setDocumentReady] = useState(false);

  // The document depends on the boundary level only. It used to depend on the
  // cells too, so every variable, period or view change reloaded the whole map.
  const html = useMemo(() => buildHtml(geography), [geography]);

  // A new document has not said it is ready yet. Adjusted during render rather
  // than in an effect, so no push is aimed at the page being replaced.
  const [htmlShown, setHtmlShown] = useState(html);
  if (htmlShown !== html) {
    setHtmlShown(html);
    setDocumentReady(false);
  }

  // `palette` belongs here: without it the map kept the default three-colour
  // ramp while the legend showed the variable's own five-band one, so the map
  // and its key disagreed about what a colour meant.
  const dataScript = useMemo(
    () => buildDataScript({ cells, min, max, variableLabel, valueFormat, isTercile, palette, stops }),
    [cells, min, max, variableLabel, valueFormat, isTercile, palette, stops],
  );

  useEffect(() => {
    if (documentReady) webViewRef.current?.injectJavaScript(dataScript);
  }, [documentReady, dataScript]);

  /**
   * Push the selected outline into the running map.
   *
   * Deliberately not part of `html`: putting it there would rebuild the
   * document on every selection, reloading the basemap and discarding the
   * reader's pan and zoom just to thicken one line. If the map has not
   * finished loading, the filter is parked on `window` and the load handler
   * picks it up, so a selection made during startup is not silently dropped.
   */
  useEffect(() => {
    const filter =
      selected?.district && geography === 'district'
        ? ['all', ['==', ['get', 'name'], selected.district], ['==', ['get', 'region'], selected.region ?? '']]
        : selected?.region && geography === 'region'
          ? ['==', ['get', 'name'], selected.region]
          : ['==', ['get', 'name'], '__none__'];

    webViewRef.current?.injectJavaScript(
      `(function(){var f=${JSON.stringify(filter)};` +
        `if(window.__setSelected){window.__setSelected(f);}else{window.__pendingSelected=f;}})();true;`,
    );
  }, [selected, geography, html, documentReady]);

  /**
   * The WebView's only channel back.
   *
   * Parsed defensively and dropped on anything unexpected: the document is ours,
   * but a malformed message must not take the screen down, and a `postMessage`
   * is the one place injected JavaScript reaches the host.
   */
  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const payload = JSON.parse(event.nativeEvent.data) as Partial<MapSelection> & { type?: string };

        if (payload.type === 'ready') {
          setDocumentReady(true);
          return;
        }
        if (payload.type === 'dismiss') {
          onDismiss?.();
          return;
        }
        if (!onSelect) return;
        if (payload.type !== 'select' || typeof payload.lat !== 'number' || typeof payload.lng !== 'number') return;

        onSelect({
          lat: payload.lat,
          lng: payload.lng,
          region: payload.region ?? null,
          district: payload.district ?? null,
          label: String(payload.label ?? ''),
        });
      } catch {
        // Not our message, or not JSON. Nothing to do.
      }
    },
    [onSelect, onDismiss],
  );

  return (
    <View style={{ width: '100%', height, backgroundColor: theme.colors.bg }}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html }}
        onMessage={handleMessage}
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

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { GHANA_BOUNDARIES } from '../data/ghanaBoundaries';
import { useTheme } from '../theme/ThemeProvider';
import type { PrecipFrame } from '../domain/precipitationTimeline';
import {
  buildBoundaryGeoJson,
  CARTO_STYLES,
  FIRST_SYMBOL_LAYER_SNIPPET,
  mapLibreHeadTags,
} from './maplibre/mapDocument';

type Props = {
  /** Every frame in the timeline. Pushed into the running map, never rebuilt
   * into the document. */
  frames: PrecipFrame[];
  /** Which frame is painted. */
  index: number;
  /** Model grid cell centres, parallel to every row of `values`. */
  grid?: { lat: number; lng: number }[];
  /** values[row][cell], in mm/h. Crosses the bridge once. */
  values?: number[][];
  /** Class lower bounds and colours, shared with the legend. */
  classes?: { from: number; color: string }[];
  /** Width of a model cell in degrees, for drawing its square. */
  cellSizeDeg?: number;
  /** Licence lines, shown in MapLibre's own attribution control. */
  attributions: string[];
  /** Fires as each raster frame finishes loading its tiles, so the caller can
   * refuse to start playing frames it does not have yet. */
  onFrameReady?: (validAt: string) => void;
  /** Fires when a frame's tiles fail, so the caller can drop it from the
   * timeline rather than showing an empty map for half a second. */
  onFrameFailed?: (validAt: string) => void;
  /** A fixed height instead of filling the parent. What turns this from a
   * page into a thumbnail; `MapLibreChoropleth` takes the same prop for the
   * same reason. */
  height?: number;
  /** Centre the view here instead of fitting the whole country. */
  center?: { lat: number; lng: number };
  /** Width of the fitted box in degrees, centred on `center`. Ignored without
   * one. */
  spanDeg?: number;
  /** Off for the preview card: a thumbnail is a picture, and the card around
   * it owns the tap. */
  interactive?: boolean;
  /** Corner radius in CSS pixels, so the map can sit inside a rounded Card.
   * Applied in the document rather than in React Native styles: an Android
   * WebView does not reliably clip to its parent's `borderRadius`, so the
   * corners come out square unless the page rounds itself. */
  radius?: number;
};

/** The parts of the document that are a function of where and how the map is
 * being shown, rather than of the data in it. */
type ViewOptions = {
  center?: { lat: number; lng: number };
  spanDeg: number;
  interactive: boolean;
  radius: number;
};

/**
 * MapLibre GL JS over a CARTO basemap, rendered inside a WebView, showing an
 * animated precipitation timeline.
 *
 * Why not `MapLibreChoropleth`, which is the same engine over the same basemap:
 * that component's document is memoized over its `cells` prop, so changing what
 * is drawn rebuilds the whole document and remounts the map. That is correct
 * for a map you set once and both shipping choropleths depend on it. It is
 * fatal for one that changes several times a second. Half its prop surface
 * (`isTercile`, `valueFormat`, `palette`) is choropleth vocabulary a rain
 * raster has no use for, and it has no notion of a raster source at all.
 *
 * So this document's `html` deliberately depends on **nothing that changes per
 * frame** — only the height and the colour scheme. Frames arrive through
 * `injectJavaScript`, using the same escape hatch `MapLibreChoropleth`
 * established for its selection filter.
 *
 * The basemap follows the device's colour scheme. The reference app is pinned
 * dark, but this one lives inside an app that has a light mode and is used
 * outdoors in daylight, so a map that stayed dark would read as a screenshot of
 * something else. The floating chrome is dark glass in both themes, which is
 * what keeps its white text legible over either basemap.
 */

/**
 * Preloading, and why every frame gets its own layer.
 *
 * GIBS serves tiles with `Cache-Control: no-store`, so nothing downstream is
 * allowed to keep them. A loop that repointed one source at each timestamp in
 * turn would therefore refetch every tile on every pass, and stutter.
 *
 * Instead each frame becomes its own raster source and layer at
 * `raster-opacity: 0`. A layer at zero opacity is still visible as far as
 * MapLibre is concerned, so it fetches and keeps its tiles — the preload comes
 * for free, and playback is then only an opacity change. Mutating one source's
 * tile template with `setTiles` is the thing to avoid: it tears down the tile
 * pyramid and refetches, which *is* the flicker.
 */
function buildHtml(scheme: 'light' | 'dark', view: ViewOptions): string {
  const country = GHANA_BOUNDARIES.bounds;
  const half = view.spanDeg / 2;

  // A box around the centre, fitted, rather than a centre and a zoom. Zoom is
  // a function of the viewport, so a fixed one would show a different amount
  // of Ghana on every phone; a fitted box shows the same ground everywhere.
  const { minLng, minLat, maxLng, maxLat } = view.center
    ? {
        minLng: view.center.lng - half,
        minLat: view.center.lat - half,
        maxLng: view.center.lng + half,
        maxLat: view.center.lat + half,
      }
    : country;

  // Ghana-wide needs a margin off the screen edges; a thumbnail cannot spare
  // any, and its own rounded corner is the visual inset.
  const fitPadding = view.center ? 0 : 16;

  const r = view.radius;
  // `overflow: hidden` alongside it: the radius alone rounds the box but the
  // canvas inside still paints square into the corners.
  const rounding = r ? `border-radius: ${r}px; overflow: hidden;` : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
${mapLibreHeadTags()}
<style>
  html, body, #map { margin:0; padding:0; height:100%; width:100%; background:transparent; }
  #map { ${rounding} }
  .maplibregl-ctrl-attrib { font-size: 9px; }
  /* The compact control's own collapsed styling is fine; what is not is that
     MapLibre opens it on load, which puts a band of credits across a map meant
     to be full-bleed. The class that opens it is removed once, below, rather
     than overridden here, so tapping the button still works. */
  #offline {
    position:absolute; inset:0; display:none; align-items:center; justify-content:center;
    font-family: system-ui, sans-serif; font-size:14px; color:#8b9aa5; text-align:center; padding:24px;
  }
</style>
</head>
<body>
<div id="map"></div>
<div id="offline">Rain imagery needs a connection.</div>
<script>
  function showOffline(reason) {
    document.getElementById('map').style.display = 'none';
    var panel = document.getElementById('offline');
    // Say what actually went wrong. A map that fails to a generic "needs a
    // connection" when the real cause was a bad style URL or a blocked script
    // sends the reader to check their signal for a fault that is ours.
    if (reason) panel.textContent = reason;
    panel.style.display = 'flex';
  }

  window.onerror = function (message) {
    showOffline('Rain map could not start: ' + message);
  };

  function post(payload) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    }
  }
${FIRST_SYMBOL_LAYER_SNIPPET}

  if (typeof maplibregl === 'undefined') {
    showOffline();
  } else {
    try {
      var map = new maplibregl.Map({
        container: 'map',
        style: '${CARTO_STYLES[scheme]}',
        bounds: [[${minLng}, ${minLat}], [${maxLng}, ${maxLat}]],
        fitBoundsOptions: { padding: ${fitPadding} },
        // A thumbnail is a picture. Turning the handlers off here rather than
        // relying on the host to swallow the touches means a stray gesture
        // cannot leave the preview panned somewhere the reader did not ask for.
        interactive: ${view.interactive},
        // Added by hand below so it can sit top-right, clear of the playback
        // bar which would otherwise cover it.
        attributionControl: false
      });

      // No zoom buttons: pinch and double-tap already zoom, and the reference
      // app leaves the map itself uncluttered.
      //
      // Attribution is not optional in the same way. Open-Meteo is CC BY 4.0,
      // and CARTO and OpenStreetMap have their own terms, so the credits are a
      // licence condition rather than a courtesy. What they do not have to be is
      // a paragraph across the bottom of the map: collapsed, top-right, they are
      // one tap away and out of the way.
      //
      // The preview carries no control at all. A thumbnail two hundred pixels
      // tall has no room for a credits line that is legible, and the card exists
      // to open this map: the credits are one tap away there in the same sense
      // they are one tap away from the collapsed button here. This is the
      // arrangement the reference app uses for the same card.
      ${
        view.interactive
          ? `map.addControl(
        new maplibregl.AttributionControl({
          compact: true,
          customAttribution: ['NASA GIBS / GPM IMERG', 'Open-Meteo (CC BY 4.0)']
        }),
        'top-right'
      );

      // Collapse it. MapLibre adds the compact-show class when the control
      // mounts, so it starts open; taking that class off once leaves the small
      // information button, and the toggle keeps working because that class is
      // what the toggle sets.
      requestAnimationFrame(function () {
        var attrib = document.querySelector('.maplibregl-ctrl-attrib');
        if (attrib) attrib.classList.remove('maplibregl-compact-show');
      });`
          : ''
      }

      map.on('error', function (e) {
        var message = String((e && e.error && e.error.message) || '');
        if (/Failed to fetch|NetworkError/i.test(message)) showOffline('Rain imagery needs a connection.');
        else if (!e.sourceId) showOffline('Rain map error: ' + message);
        // A tile failure names its source, so the host can drop just that frame
        // rather than assuming the whole map is broken.
        if (e && e.sourceId && e.sourceId.indexOf('frame-') === 0) {
          post({ type: 'frameFailed', id: e.sourceId.slice(6) });
        }
      });

      map.on('load', function () {
        var labelLayer = firstSymbolLayerId(map);

        map.addSource('boundaries', { type: 'geojson', data: ${buildBoundaryGeoJson('region')} });
        map.addLayer({
          id: 'boundary-line',
          type: 'line',
          source: 'boundaries',
          paint: { 'line-color': '${scheme === 'dark' ? '#8fa0ad' : '#37474f'}', 'line-width': 0.8, 'line-opacity': 0.5 }
        }, labelLayer);

        /** Frame ids in paint order, so showFrame can turn the previous one off
         *  without the host having to tell it which that was. */
        var frameIds = [];
        var frameSpecs = [];
        var shown = null;

        map.on('sourcedata', function (e) {
          if (e.sourceId && e.sourceId.indexOf('frame-') === 0 && e.isSourceLoaded) {
            post({ type: 'frameReady', id: e.sourceId.slice(6) });
          }
        });

        // The forecast half. One polygon per model cell, carrying every frame's
        // value as its own property (v0, v1, ...). A frame change is then a
        // single paint-property swap, with no geometry crossing the bridge and
        // no source re-tiling.
        map.addSource('precip-cells', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        map.addLayer({
          id: 'precip-fill',
          type: 'fill',
          source: 'precip-cells',
          paint: {
            'fill-color': 'rgba(0,0,0,0)',
            'fill-opacity': 0,
            'fill-opacity-transition': { duration: 180 },
            // The quads abut, and antialiasing 300 of them is measurable on a
            // low-end phone for a seam nobody can see.
            'fill-antialias': false
          }
        }, 'boundary-line');

        var rampClasses = null;

        /** A MapLibre step expression over one frame's value property.
         *  Everything below the first break is transparent, so "no rain" is an
         *  absence rather than a colour. */
        function rampFor(row) {
          var expr = ['step', ['get', 'v' + row], 'rgba(0,0,0,0)'];
          for (var k = 0; k < rampClasses.length; k += 1) {
            expr.push(rampClasses[k].from, rampClasses[k].color);
          }
          return expr;
        }

        window.__precip = {
          setRamp: function (classes) {
            rampClasses = classes;
          },

          setCells: function (geojson) {
            var source = map.getSource('precip-cells');
            if (source) source.setData(geojson);
          },

          setFrames: function (frames) {
            // Remove what was there. A span change rebuilds the frame set, and
            // that is a deliberate user action where a brief reload is fine; a
            // frame change never goes through here.
            frameIds.forEach(function (id) {
              if (map.getLayer('frame-' + id)) map.removeLayer('frame-' + id);
              if (map.getSource('frame-' + id)) map.removeSource('frame-' + id);
            });
            frameIds = [];
            frameSpecs = frames;
            shown = null;

            frames.filter(function (f) { return f.type === 'raster'; }).forEach(function (frame, i) {
              var id = frame.id;
              frameIds.push(id);

              // Stagger the adds so the first frames paint quickly instead of
              // every frame contending for the connection at once.
              setTimeout(function () {
                if (map.getSource('frame-' + id)) return;
                map.addSource('frame-' + id, {
                  type: 'raster',
                  tiles: [frame.tileUrlTemplate],
                  tileSize: 256,
                  maxzoom: frame.maxZoom
                });
                map.addLayer({
                  id: 'frame-' + id,
                  type: 'raster',
                  source: 'frame-' + id,
                  paint: {
                    'raster-opacity': 0,
                    // MapLibre's own cross-fade between zoom levels fights the
                    // one below, so it is off and the opacity transition owns
                    // the animation.
                    'raster-fade-duration': 0,
                    'raster-opacity-transition': { duration: 180 }
                  }
                }, 'boundary-line');

                if (window.__precipPendingIndex !== null && window.__precipPendingIndex !== undefined) {
                  var pending = frameSpecs[window.__precipPendingIndex];
                  if (pending && pending.id === id) {
                    var wanted = window.__precipPendingIndex;
                    window.__precipPendingIndex = null;
                    window.__precip.showFrame(wanted);
                  }
                }
              }, i < 3 ? 0 : 150 * i);
            });
          },

          showFrame: function (i) {
            var frame = frameSpecs[i];
            if (!frame) return;

            function hideRaster() {
              if (shown && map.getLayer('frame-' + shown)) {
                // Out faster than in. A symmetric dissolve of two
                // semi-transparent layers briefly double-darkens the rain they
                // have in common, which reads as a flash rather than movement.
                map.setPaintProperty('frame-' + shown, 'raster-opacity-transition', { duration: 120 });
                map.setPaintProperty('frame-' + shown, 'raster-opacity', 0);
              }
              shown = null;
            }

            if (frame.type === 'cells') {
              hideRaster();
              if (rampClasses) {
                map.setPaintProperty('precip-fill', 'fill-color', rampFor(frame.row));
              }
              map.setPaintProperty('precip-fill', 'fill-opacity', 0.8);
              return;
            }

            var id = frame.id;
            if (!map.getLayer('frame-' + id)) {
              // Not added yet. Park it, and the add handler picks it up.
              window.__precipPendingIndex = i;
              return;
            }
            // Never crossfade a raster into a fill with both partly visible:
            // that shows two renderings of the same rain at once.
            map.setPaintProperty('precip-fill', 'fill-opacity', 0);
            if (shown === id) return;
            hideRaster();
            map.setPaintProperty('frame-' + id, 'raster-opacity-transition', { duration: 180 });
            map.setPaintProperty('frame-' + id, 'raster-opacity', 0.85);
            shown = id;
          }
        };

        window.__precipReady = true;
        (window.__precipQueue || []).forEach(function (op) {
          window.__precip[op.fn].apply(null, op.args);
        });
        window.__precipQueue = null;

        // Tell the host the document is up.
        //
        // The queue above is not enough on its own: injectJavaScript runs
        // against whatever page is loaded at that moment, so anything sent
        // before this document exists evaluates against a blank page and is
        // lost, queue and all. Having the document ask for its data removes the
        // ordering guess entirely.
        post({ type: 'ready' });

        ${view.interactive ? `map.on('click', function () { post({ type: 'dismiss' }); });` : ''}
      });
    } catch (err) {
      showOffline();
    }
  }
</script>
</body>
</html>`;
}

export function MapLibrePrecipitation({
  frames,
  index,
  grid,
  values,
  classes,
  cellSizeDeg = 0.25,
  attributions,
  onFrameReady,
  onFrameFailed,
  height,
  center,
  spanDeg = 2.5,
  interactive = true,
  radius = 0,
}: Props) {
  const theme = useTheme();
  const webViewRef = useRef<WebView>(null);
  /** Set when the document reports itself up. Nothing is pushed before that,
   * because an injection into a page that has not loaded yet simply vanishes. */
  const [documentReady, setDocumentReady] = useState(false);

  // The scheme and where the map is looking. Anything that changes per frame
  // must not be in here, or the map remounts mid-animation and the reader loses
  // their pan.
  //
  // The view options are safe to have here precisely because they are not frame
  // data: they change when the reader picks a different town, which is the same
  // deliberate action the full screen already remounts on when the span
  // changes. Depending on the `center` object rather than its two numbers would
  // remount on every render that passed a fresh literal, so it is destructured.
  const html = useMemo(
    () => buildHtml(theme.scheme, { center, spanDeg, interactive, radius }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [theme.scheme, center?.lat, center?.lng, spanDeg, interactive, radius],
  );

  /** The one way anything reaches the running map, mirroring the
   * `window.__setSelected` / pending-slot handshake in `MapLibreChoropleth`. */
  const call = useCallback((fn: string, ...args: unknown[]) => {
    webViewRef.current?.injectJavaScript(
      `(function(){var op={fn:${JSON.stringify(fn)},args:${JSON.stringify(args)}};` +
        `if(window.__precipReady){window.__precip[op.fn].apply(null,op.args);}` +
        `else{(window.__precipQueue=window.__precipQueue||[]).push(op);}})();true;`,
    );
  }, []);

  /* Joined to a string before it reaches the memo below. Depending on the array
     itself would rebuild the frame set whenever a caller passed a fresh literal,
     and rebuilding it tears down and re-adds every raster source, refetching
     every tile. A string compares by value, so an equal attribution is a stable
     one. */
  const attributionLine = attributions.join(' · ');

  const frameSpecs = useMemo(
    () =>
      frames.map((frame) =>
        frame.render.type === 'raster'
          ? {
              id: frame.validAt,
              type: 'raster' as const,
              tileUrlTemplate: frame.render.tileUrlTemplate,
              maxZoom: frame.render.maxZoom,
              attribution: attributionLine,
            }
          : { id: frame.validAt, type: 'cells' as const, row: frame.render.valueRow },
      ),
    [frames, attributionLine],
  );

  useEffect(() => {
    if (!documentReady || frameSpecs.length === 0) return;
    call('setFrames', frameSpecs);
  }, [call, documentReady, frameSpecs]);

  useEffect(() => {
    if (!documentReady || !classes) return;
    call('setRamp', classes);
  }, [call, documentReady, classes]);

  /**
   * The whole values matrix, written into the geometry once.
   *
   * Every frame's value becomes its own property on every cell, so playing the
   * animation never sends geometry or values again. Roughly 300 cells times a
   * few dozen rows is a single payload on the fetch path, not the frame path.
   */
  const cellGeoJson = useMemo(() => {
    if (!grid || !values || grid.length === 0) return null;
    const half = cellSizeDeg / 2;
    return {
      type: 'FeatureCollection',
      features: grid.map((cell, i) => {
        const properties: Record<string, number> = {};
        values.forEach((row, r) => {
          properties[`v${r}`] = row[i] ?? 0;
        });
        return {
          type: 'Feature',
          properties,
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
        };
      }),
    };
  }, [grid, values, cellSizeDeg]);

  useEffect(() => {
    if (!documentReady || !cellGeoJson) return;
    call('setCells', cellGeoJson);
  }, [call, documentReady, cellGeoJson]);

  useEffect(() => {
    if (!documentReady) return;
    call('showFrame', index);
  }, [call, documentReady, index]);

  // A rebuilt document is a new page, so it has to introduce itself again
  // before anything is pushed into it.
  useEffect(() => {
    setDocumentReady(false);
  }, [html]);

  /** Parsed defensively and dropped on anything unexpected: a malformed message
   * must not take the screen down. */
  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const payload = JSON.parse(event.nativeEvent.data) as { type?: string; id?: string };
        if (payload.type === 'ready') {
          setDocumentReady(true);
          return;
        }
        if (typeof payload.id !== 'string') return;
        if (payload.type === 'frameReady') onFrameReady?.(payload.id);
        if (payload.type === 'frameFailed') onFrameFailed?.(payload.id);
      } catch {
        // Not our message, or not JSON. Nothing to do.
      }
    },
    [onFrameReady, onFrameFailed],
  );

  return (
    // A sized map paints nothing behind itself: its corners are cut away, and
    // an opaque backing would show as four squares of app background poking out
    // from under them.
    <View
      style={
        height === undefined
          ? { flex: 1, backgroundColor: theme.colors.bg }
          : { width: '100%', height, backgroundColor: 'transparent' }
      }
    >
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html }}
        onMessage={handleMessage}
        style={{ flex: 1, backgroundColor: 'transparent' }}
        javaScriptEnabled
        domStorageEnabled
        bounces={false}
        scrollEnabled={false}
        setSupportMultipleWindows={false}
      />
    </View>
  );
}

import React, { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { GHANA_BOUNDARIES } from '../data/ghanaBoundaries';
import { useTheme } from '../theme/ThemeProvider';
import { IMERG_STOPS, RAIN_STOPS } from '../utils/colorScale';
import type { PrecipFrame } from '../domain/precipitationTimeline';
import {
  buildBoundaryGeoJson,
  esriCanvasStyle,
  ESRI_LABELS_LAYER,
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
  /** Esri's light map by day, dark at night. The caller decides, from the real
   * sunrise and sunset (`useMapDaylight`). Dark when not given. */
  look?: 'light' | 'dark';
};

/** The parts of the document that are a function of where and how the map is
 * being shown, rather than of the data in it. */
type ViewOptions = {
  center?: { lat: number; lng: number };
  spanDeg: number;
  interactive: boolean;
  radius: number;
  look: 'light' | 'dark';
};

/**
 * MapLibre GL JS over Esri's Dark Gray Canvas, rendered inside a WebView,
 * showing an animated precipitation timeline.
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
 * frame**, only where the map is looking and how it is shown. Frames arrive through
 * `injectJavaScript`, using the same escape hatch `MapLibreChoropleth`
 * established for its selection filter.
 *
 * The basemap is Esri's Light Gray Canvas by day and Dark Gray Canvas at
 * night, chosen by the caller from the real sunrise and sunset, as the phone's
 * own weather app does. The rain colours (`RAIN_STOPS`) read on both.
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
function buildHtml(view: ViewOptions): string {
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

  // NASA's satellite tiles arrive in NASA's green-to-red colours. Each one is
  // repainted as it loads into the app's own rain colours, so the measured
  // hours match the forecast ones and the legend. A pixel's colour is matched
  // to the nearest point on NASA's ramp, and that point's place along the ramp
  // picks the same place on ours. Matches are remembered, since a tile has only
  // a handful of distinct colours.
  var OLD_STOPS = ${JSON.stringify(IMERG_STOPS)};
  var NEW_STOPS = ${JSON.stringify(RAIN_STOPS)};
  function rampAt(stops, t) {
    for (var i = 1; i < stops.length; i += 1) {
      if (t <= stops[i][0]) {
        var a = stops[i - 1], b = stops[i];
        var f = (t - a[0]) / (b[0] - a[0]);
        return [a[1][0] + (b[1][0] - a[1][0]) * f, a[1][1] + (b[1][1] - a[1][1]) * f, a[1][2] + (b[1][2] - a[1][2]) * f];
      }
    }
    return stops[stops.length - 1][1];
  }
  var OLD_SAMPLES = [];
  for (var si = 0; si <= 64; si += 1) OLD_SAMPLES.push({ t: si / 64, rgb: rampAt(OLD_STOPS, si / 64) });
  var repaintCache = {};
  function repaint(r, g, b) {
    var key = (r << 16) | (g << 8) | b;
    var hit = repaintCache[key];
    if (hit) return hit;
    var best = 0, bestDistance = Infinity;
    for (var i = 0; i < OLD_SAMPLES.length; i += 1) {
      var c = OLD_SAMPLES[i].rgb;
      var d = (c[0] - r) * (c[0] - r) + (c[1] - g) * (c[1] - g) + (c[2] - b) * (c[2] - b);
      if (d < bestDistance) { bestDistance = d; best = OLD_SAMPLES[i].t; }
    }
    hit = rampAt(NEW_STOPS, best);
    repaintCache[key] = hit;
    return hit;
  }

  if (typeof maplibregl !== 'undefined' && maplibregl.addProtocol) {
    maplibregl.addProtocol('rainpaint', function (params, abortController) {
      var url = 'https://' + params.url.slice('rainpaint://'.length);
      return fetch(url, { signal: abortController.signal })
        .then(function (response) {
          if (!response.ok) throw new Error('Rain tile ' + response.status);
          return response.blob();
        })
        .then(function (blob) { return createImageBitmap(blob); })
        .then(function (bitmap) {
          var canvas = document.createElement('canvas');
          canvas.width = bitmap.width; canvas.height = bitmap.height;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(bitmap, 0, 0);
          var image = ctx.getImageData(0, 0, canvas.width, canvas.height);
          var data = image.data;
          for (var i = 0; i < data.length; i += 4) {
            if (data[i + 3] === 0) continue;
            var c = repaint(data[i], data[i + 1], data[i + 2]);
            data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2];
          }
          ctx.putImageData(image, 0, 0);
          return new Promise(function (resolve, reject) {
            canvas.toBlob(function (out) {
              if (!out) { reject(new Error('Rain tile could not be repainted')); return; }
              out.arrayBuffer().then(function (buffer) { resolve({ data: buffer }); }, reject);
            }, 'image/png');
          });
        });
    });
  }

  function repaintedTiles(template) {
    return template.indexOf('https://') === 0 ? 'rainpaint://' + template.slice('https://'.length) : template;
  }

  if (typeof maplibregl === 'undefined') {
    showOffline();
  } else {
    try {
      var map = new maplibregl.Map({
        container: 'map',
        style: ${esriCanvasStyle(view.look)},
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

      // Fit again when the page's size changes, until the reader moves the map
      // themselves. On a first open the WebView can report its size before the
      // screen has finished laying out, and the map then fitted Ghana into a
      // smaller box and opened zoomed out over half of West Africa.
      var readerMoved = false;
      map.on('movestart', function (e) { if (e && e.originalEvent) readerMoved = true; });
      window.addEventListener('resize', function () {
        if (readerMoved) return;
        map.resize();
        map.fitBounds([[${minLng}, ${minLat}], [${maxLng}, ${maxLat}]], { padding: ${fitPadding}, animate: false });
      });

      // No zoom buttons: pinch and double-tap already zoom, and the reference
      // app leaves the map itself uncluttered.
      //
      // Attribution is not optional in the same way. Open-Meteo is CC BY 4.0,
      // and Esri and OpenStreetMap have their own terms, so the credits are a
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
        // Rain and borders go under Esri's labels layer, so place names stay
        // on top. A raster layer, so the symbol search cannot find it.
        var labelLayer = map.getLayer('${ESRI_LABELS_LAYER}') ? '${ESRI_LABELS_LAYER}' : firstSymbolLayerId(map);

        map.addSource('boundaries', { type: 'geojson', data: ${buildBoundaryGeoJson('region')} });
        map.addLayer({
          id: 'boundary-line',
          type: 'line',
          source: 'boundaries',
          paint: { 'line-color': '${view.look === 'light' ? '#5f6b75' : '#8fa0ad'}', 'line-width': 0.8, 'line-opacity': 0.5 }
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

        // The forecast half, drawn as a smooth field rather than one square per
        // model cell. The cell values are spread onto their lattice, and each
        // frame becomes a small picture: values blended between neighbouring
        // cells, coloured on a continuous ramp, feathered to nothing below the
        // first rain class, softened with a blur, then laid over the map as
        // one image that MapLibre scales smoothly. Pictures are made once per
        // frame and kept, so playback only swaps an image.
        var BLANK = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
        var UPSAMPLE = 8;
        var field = null;
        var fieldImages = {};
        var fieldRow = null;

        map.addSource('precip-field', {
          type: 'image',
          url: BLANK,
          coordinates: [[0, 1], [1, 1], [1, 0], [0, 0]]
        });
        map.addLayer({
          id: 'precip-smooth',
          type: 'raster',
          source: 'precip-field',
          paint: {
            'raster-opacity': 0,
            'raster-opacity-transition': { duration: 180 },
            'raster-resampling': 'linear',
            'raster-fade-duration': 0
          }
        }, 'boundary-line');

        var rampClasses = null;
        var rampStops = null;

        function parseRgb(text) {
          var str = String(text);
          var parts = str.slice(str.indexOf('(') + 1, str.indexOf(')')).split(',');
          return [parseFloat(parts[0]), parseFloat(parts[1]), parseFloat(parts[2])];
        }

        /** Colour and opacity for a rain rate, written into out[0..3]. Between
         *  two class breaks the colour blends on a log scale, the way the
         *  breaks themselves are spaced. Below the first break it fades out. */
        function colourAt(v, out) {
          out[3] = 0;
          if (!rampStops || !(v > rampStops[0].v * 0.4)) return;
          var first = rampStops[0];
          if (v < first.v) {
            out[0] = first.rgb[0]; out[1] = first.rgb[1]; out[2] = first.rgb[2];
            out[3] = 255 * (v - first.v * 0.4) / (first.v * 0.6);
            return;
          }
          var k = 0;
          while (k < rampStops.length - 1 && v >= rampStops[k + 1].v) k += 1;
          var a = rampStops[k];
          var b = rampStops[Math.min(k + 1, rampStops.length - 1)];
          var t = a === b ? 0 : (Math.log(v) - Math.log(a.v)) / (Math.log(b.v) - Math.log(a.v));
          t = Math.max(0, Math.min(1, t));
          out[0] = a.rgb[0] + (b.rgb[0] - a.rgb[0]) * t;
          out[1] = a.rgb[1] + (b.rgb[1] - a.rgb[1]) * t;
          out[2] = a.rgb[2] + (b.rgb[2] - a.rgb[2]) * t;
          out[3] = 255;
        }

        function fieldCorners() {
          var h = field.step / 2;
          var w = field.minLng - h, e = field.maxLng + h, n = field.maxLat + h, so = field.minLat - h;
          return [[w, n], [e, n], [e, so], [w, so]];
        }

        /** One frame of the field as a data URL. */
        function imageFor(row) {
          if (fieldImages[row]) return fieldImages[row];
          var values = field.rows[row];
          if (!values) return BLANK;
          var nx = field.nx, ny = field.ny;
          var width = nx * UPSAMPLE, height = ny * UPSAMPLE;
          var raw = document.createElement('canvas');
          raw.width = width; raw.height = height;
          var ctx = raw.getContext('2d');
          var img = ctx.createImageData(width, height);
          var px = img.data;
          var out = [0, 0, 0, 0];
          for (var y = 0; y < height; y += 1) {
            var gy = Math.max(0, Math.min(ny - 1, (y + 0.5) / UPSAMPLE - 0.5));
            var y0 = Math.floor(gy), y1 = Math.min(ny - 1, y0 + 1), fy = gy - y0;
            for (var x = 0; x < width; x += 1) {
              var gx = Math.max(0, Math.min(nx - 1, (x + 0.5) / UPSAMPLE - 0.5));
              var x0 = Math.floor(gx), x1 = Math.min(nx - 1, x0 + 1), fx = gx - x0;
              var top = values[y0 * nx + x0] * (1 - fx) + values[y0 * nx + x1] * fx;
              var bottom = values[y1 * nx + x0] * (1 - fx) + values[y1 * nx + x1] * fx;
              colourAt(top * (1 - fy) + bottom * fy, out);
              var o = (y * width + x) * 4;
              px[o] = out[0]; px[o + 1] = out[1]; px[o + 2] = out[2]; px[o + 3] = out[3];
            }
          }
          ctx.putImageData(img, 0, 0);

          // A blur rounds off the corners bilinear blending leaves at each
          // lattice point. Skipped where canvas filters are not supported.
          var soft = document.createElement('canvas');
          soft.width = width; soft.height = height;
          var softCtx = soft.getContext('2d');
          softCtx.filter = 'blur(' + Math.round(UPSAMPLE * 0.6) + 'px)';
          var blurred = softCtx.filter && softCtx.filter !== 'none';
          softCtx.drawImage(raw, 0, 0);
          var url = (blurred ? soft : raw).toDataURL('image/png');
          fieldImages[row] = url;
          return url;
        }

        function showFieldRow(row) {
          fieldRow = row;
          var source = map.getSource('precip-field');
          if (!source || !field || !rampStops) return;
          source.updateImage({ url: imageFor(row), coordinates: fieldCorners() });
          map.setPaintProperty('precip-smooth', 'raster-opacity', 0.8);
        }

        window.__precip = {
          setRamp: function (classes) {
            rampClasses = classes;
            rampStops = classes.map(function (c) { return { v: c.from, rgb: parseRgb(c.color) }; });
            fieldImages = {};
            if (fieldRow !== null) showFieldRow(fieldRow);
          },

          /** The model cells and every frame's values, once per fetch. */
          setField: function (payload) {
            var grid = payload.grid, step = payload.step;
            if (!grid || grid.length === 0) return;
            var minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
            grid.forEach(function (p) {
              minLat = Math.min(minLat, p[0]); maxLat = Math.max(maxLat, p[0]);
              minLng = Math.min(minLng, p[1]); maxLng = Math.max(maxLng, p[1]);
            });
            var nx = Math.round((maxLng - minLng) / step) + 1;
            var ny = Math.round((maxLat - minLat) / step) + 1;
            // Lattice points with no cell (sea, neighbouring countries) count as
            // dry, so rain fades out at the edge of the land instead of ending
            // in a hard line.
            var rows = payload.values.map(function (row) {
              var a = new Float32Array(nx * ny);
              grid.forEach(function (p, i) {
                var ix = Math.round((p[1] - minLng) / step);
                var iy = Math.round((maxLat - p[0]) / step);
                a[iy * nx + ix] = row[i] || 0;
              });
              return a;
            });
            field = { minLng: minLng, maxLng: maxLng, minLat: minLat, maxLat: maxLat, step: step, nx: nx, ny: ny, rows: rows };
            fieldImages = {};
            if (fieldRow !== null) showFieldRow(fieldRow);
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
                  tiles: [repaintedTiles(frame.tileUrlTemplate)],
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
              showFieldRow(frame.row);
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
            map.setPaintProperty('precip-smooth', 'raster-opacity', 0);
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
  look = 'dark',
}: Props) {
  const theme = useTheme();
  const webViewRef = useRef<ComponentRef<typeof WebView>>(null);
  /** Set when the document reports itself up. Nothing is pushed before that,
   * because an injection into a page that has not loaded yet simply vanishes. */
  const [documentReady, setDocumentReady] = useState(false);

  // Where the map is looking. Anything that changes per frame
  // must not be in here, or the map remounts mid-animation and the reader loses
  // their pan.
  //
  // The view options are safe to have here precisely because they are not frame
  // data: they change when the reader picks a different town, which is the same
  // deliberate action the full screen already remounts on when the span
  // changes. Depending on the `center` object rather than its two numbers would
  // remount on every render that passed a fresh literal, so it is destructured.
  const html = useMemo(
    () => buildHtml({ center, spanDeg, interactive, radius, look }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [center?.lat, center?.lng, spanDeg, interactive, radius, look],
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
   * The model cells and the whole values matrix, sent once per fetch.
   *
   * The map turns each frame into a smooth picture itself, so playing the
   * animation never sends values again. Roughly 345 cells times a few dozen
   * rows is a single payload on the fetch path, not the frame path.
   */
  const field = useMemo(() => {
    if (!grid || !values || grid.length === 0) return null;
    return { grid: grid.map((cell) => [cell.lat, cell.lng]), values, step: cellSizeDeg };
  }, [grid, values, cellSizeDeg]);

  useEffect(() => {
    if (!documentReady || !field) return;
    call('setField', field);
  }, [call, documentReady, field]);

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
        height === undefined ? { flex: 1, backgroundColor: theme.colors.bg } : { width: '100%', height, backgroundColor: 'transparent' }
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

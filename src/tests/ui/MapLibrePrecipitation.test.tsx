import React from 'react';
import { act, render } from '@testing-library/react-native';

const mockInject = jest.fn();

/* Overrides the shared mock in jest.setup.js, which exposes a no-op
   `injectJavaScript`. The whole contract under test here is what crosses that
   bridge, so it has to be observable.
   Built outside the factory with a `mock`-prefixed name for the reason
   jest.setup.js documents: nativewind's babel transform rewrites a component
   defined inside one, and jest then rejects the factory for referencing its
   injected helper. */
const mockWebViewComponent = (() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- a jest mock factory cannot use ESM imports
  const ReactLocal = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- same
  const { View } = require('react-native');
  const Mock = ReactLocal.forwardRef((props: object, ref: unknown) => {
    ReactLocal.useImperativeHandle(ref, () => ({
      injectJavaScript: mockInject,
      postMessage: () => {},
      reload: () => {},
    }));
    return ReactLocal.createElement(View, props);
  });
  Mock.displayName = 'WebView';
  return Mock;
})();

/* Getters, not values. `jest.mock` is hoisted above this file's own consts, and
   the factory runs while the component under test is being imported, so reading
   `mockWebViewComponent` eagerly would read it before it exists. Deferring the
   read to render time is what makes the outside-the-factory pattern work here. */
jest.mock('react-native-webview', () => ({
  get WebView() {
    return mockWebViewComponent;
  },
  get default() {
    return mockWebViewComponent;
  },
}));

/* eslint-disable import/first -- these must sit below the jest.mock above, which
   is hoisted, so that the mock is registered before the component is imported. */
import type { PrecipFrame } from '../../shared/domain/precipitationTimeline';
import { ThemeProvider } from '../../shared/theme/ThemeProvider';
import { MapLibrePrecipitation } from '../../shared/ui/MapLibrePrecipitation';
/* eslint-enable import/first */

function frame(validAt: string): PrecipFrame {
  return {
    validAt,
    stepMinutes: 30,
    kind: 'observed',
    render: { type: 'raster', tileUrlTemplate: `tiles/${validAt}/{z}/{y}/{x}.png`, maxZoom: 6 },
  };
}

const FRAMES = [
  frame('2026-08-26T09:00:00.000Z'),
  frame('2026-08-26T09:30:00.000Z'),
  frame('2026-08-26T10:00:00.000Z'),
];

function renderMap(index: number) {
  return render(
    <ThemeProvider>
      <MapLibrePrecipitation frames={FRAMES} index={index} attributions={['NASA GIBS']} />
    </ThemeProvider>,
  );
}

type JsonNode = { props?: Record<string, unknown>; children?: JsonNode[] } | null;

/** The WebView sits inside a sizing View, so walk down to the node that
 * actually carries the document. */
function htmlOf(tree: unknown): string {
  const visit = (node: JsonNode): string | null => {
    if (!node || typeof node !== 'object') return null;
    const source = node.props?.source as { html?: string } | undefined;
    if (typeof source?.html === 'string') return source.html;
    for (const child of node.children ?? []) {
      const found = visit(child);
      if (found) return found;
    }
    return null;
  };
  const html = visit(tree as JsonNode);
  if (!html) throw new Error('no WebView document rendered');
  return html;
}

/** The document announces itself when MapLibre finishes loading, and nothing is
 * pushed into it before that. Tests have to play that part. */
function signalReady(tree: unknown) {
  const visit = (node: JsonNode): ((e: unknown) => void) | null => {
    if (!node || typeof node !== 'object') return null;
    if (node.props?.source) return node.props.onMessage as (e: unknown) => void;
    for (const child of node.children ?? []) {
      const found = visit(child);
      if (found) return found;
    }
    return null;
  };
  const onMessage = visit(tree as JsonNode);
  act(() => onMessage?.({ nativeEvent: { data: JSON.stringify({ type: 'ready' }) } }));
}

beforeEach(() => mockInject.mockClear());

describe('MapLibrePrecipitation', () => {
  /* The load-bearing property of this component. `MapLibreChoropleth` rebuilds
     its document whenever its data changes, which reloads the basemap and
     throws away the reader's pan and zoom. On a map that changes several times
     a second that would be fatal, so the document must be byte-identical across
     a frame change and the frame must travel over the bridge instead. */
  it('does not rebuild the document when the frame changes', () => {
    const view = renderMap(0);
    const before = htmlOf(view.toJSON());

    view.rerender(
      <ThemeProvider>
        <MapLibrePrecipitation frames={FRAMES} index={2} attributions={['NASA GIBS']} />
      </ThemeProvider>,
    );

    expect(htmlOf(view.toJSON())).toBe(before);
  });

  it('pushes the frame change over the bridge', () => {
    const view = renderMap(0);
    signalReady(view.toJSON());
    mockInject.mockClear();

    view.rerender(
      <ThemeProvider>
        <MapLibrePrecipitation frames={FRAMES} index={1} attributions={['NASA GIBS']} />
      </ThemeProvider>,
    );

    const showFrameCalls = mockInject.mock.calls.filter(([js]) => String(js).includes('showFrame'));
    expect(showFrameCalls).toHaveLength(1);
    expect(String(showFrameCalls[0][0])).toContain('args:[1]');
  });

  /* Frames must never be re-sent while only the index moves: `setFrames` tears
     down and re-adds every raster source, which refetches every tile. */
  it('does not resend the frame set on a frame change', () => {
    const view = renderMap(0);
    signalReady(view.toJSON());
    mockInject.mockClear();

    view.rerender(
      <ThemeProvider>
        <MapLibrePrecipitation frames={FRAMES} index={1} attributions={['NASA GIBS']} />
      </ThemeProvider>,
    );

    expect(mockInject.mock.calls.filter(([js]) => String(js).includes('setFrames'))).toHaveLength(0);
  });

  it('sends the tile template and the zoom ceiling GIBS publishes', () => {
    const view = renderMap(0);
    signalReady(view.toJSON());

    const setFrames = mockInject.mock.calls.find(([js]) => String(js).includes('setFrames'));
    expect(setFrames).toBeDefined();
    expect(String(setFrames![0])).toContain('tiles/2026-08-26T09:00:00.000Z/{z}/{y}/{x}.png');
    expect(String(setFrames![0])).toContain('"maxZoom":6');
  });

  /* Nothing may be pushed before the document announces itself. injectJavaScript
     evaluates against whatever page is loaded at that moment, so an early call
     lands on a blank page and is lost, taking the frame set with it. */
  it('pushes nothing until the document reports ready', () => {
    const view = renderMap(0);
    expect(mockInject).not.toHaveBeenCalled();

    signalReady(view.toJSON());
    expect(mockInject.mock.calls.some(([js]) => String(js).includes('setFrames'))).toBe(true);
  });

  /* CARTO and OpenStreetMap require the credit and Open-Meteo is CC BY 4.0, so
     the full map carries it as a licence condition. The preview card
     deliberately does not, which only holds if this one does; the two tests are
     a pair. */
  it('credits its sources on the full map', () => {
    const html = htmlOf(renderMap(0).toJSON());

    expect(html).toContain('new maplibregl.AttributionControl');
    expect(html).toContain('NASA GIBS / GPM IMERG');
    expect(html).toContain('Open-Meteo (CC BY 4.0)');
  });
});

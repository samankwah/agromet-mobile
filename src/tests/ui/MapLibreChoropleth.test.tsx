import React from 'react';
import { act, render } from '@testing-library/react-native';

const mockInject = jest.fn();

/* Overrides the shared mock in jest.setup.js, which exposes a no-op
   `injectJavaScript`. The whole contract under test here is what crosses that
   bridge, so it has to be observable.
   Built outside the factory with a `mock`-prefixed name for the reason
   jest.setup.js documents: jest hoists the factory and forbids it from
   referencing an outer variable unless the name is `mock`-prefixed. */
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
import type { SpatialGridCell } from '../../shared/domain/spatialOutlook';
import { ThemeProvider } from '../../shared/theme/ThemeProvider';
import { MapLibreChoropleth } from '../../shared/ui/MapLibreChoropleth';
/* eslint-enable import/first */

function cell(id: number, value: number): SpatialGridCell {
  return { id, lat: 7 + id * 0.15, lng: -1, regionName: 'Ashanti', districtName: 'Kumasi', value };
}

function renderMap(cells: SpatialGridCell[], label = 'Rainfall') {
  return (
    <ThemeProvider>
      <MapLibreChoropleth
        cells={cells}
        min={0}
        max={100}
        geography="region"
        height={300}
        variableLabel={label}
        valueFormat="number"
        isTercile={false}
      />
    </ThemeProvider>
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

describe('MapLibreChoropleth', () => {
  /* Every variable, period or view change hands the map new cells. When the
     cells were baked into the document, each of those reloaded MapLibre from
     the CDN, refetched the basemap and lost the reader's pan and zoom. */
  it('does not rebuild the document when the data changes', () => {
    const view = render(renderMap([cell(1, 10), cell(2, 20)]));
    const before = htmlOf(view.toJSON());

    view.rerender(renderMap([cell(1, 80), cell(2, 90)], 'Temperature'));

    expect(htmlOf(view.toJSON())).toBe(before);
    expect(before).not.toContain('"value":10');
  });

  it('pushes the data once the document is ready, and again when it changes', () => {
    const view = render(renderMap([cell(1, 10)]));
    // Nothing is sent into a page that has not loaded: it would be lost.
    expect(mockInject).not.toHaveBeenCalledWith(expect.stringContaining('__setData'));

    signalReady(view.toJSON());
    const first = mockInject.mock.calls.map(([script]) => String(script)).filter((script) => script.includes('__setData'));
    expect(first).toHaveLength(1);
    expect(first[0]).toContain('"value":10');

    view.rerender(renderMap([cell(1, 55)]));
    const latest = mockInject.mock.calls.map(([script]) => String(script)).filter((script) => script.includes('__setData'));
    expect(latest).toHaveLength(2);
    expect(latest[1]).toContain('"value":55');
  });
});

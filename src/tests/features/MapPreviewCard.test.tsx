import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';

const mockPush = jest.fn();
const mockInject = jest.fn();
const mockIsOnline = jest.fn(() => true);
const mockTimeline = jest.fn();

/* Overrides the shared no-op mock in jest.setup.js. What the card is being held
   to here is partly what crosses the bridge, so the bridge has to be
   observable. Built outside the factory, `mock`-prefixed, for the reason
   jest.setup.js documents. */
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

jest.mock('react-native-webview', () => ({
  get WebView() {
    return mockWebViewComponent;
  },
  get default() {
    return mockWebViewComponent;
  },
}));

jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockPush(...args),
  },
}));

jest.mock('../../shared/net/useNetworkStatus', () => ({
  useNetworkStatus: () => ({ isOnline: mockIsOnline(), isChecking: false }),
}));

jest.mock('../../features/forecasts/precipitation/usePrecipitationTimeline', () => ({
  ...jest.requireActual('../../features/forecasts/precipitation/usePrecipitationTimeline'),
  usePrecipitationTimeline: () => mockTimeline(),
}));

/* eslint-disable import/first -- these must sit below the hoisted jest.mock
   calls above, so the mocks are registered before the component is imported. */
import type { PrecipitationTimeline } from '../../shared/domain/precipitationTimeline';
import { MapPreviewCard } from '../../features/forecasts/components/MapPreviewCard';
import { ThemeProvider } from '../../shared/theme/ThemeProvider';
/* eslint-enable import/first */

const NOW = '2026-08-26T12:00:00.000Z';

/** Three frames spanning now: two behind it and one ahead, so `openingIndex`
 * has a real choice to make rather than falling through to the last one. */
const TIMELINE: PrecipitationTimeline = {
  frames: [
    {
      validAt: '2026-08-26T10:00:00.000Z',
      stepMinutes: 30,
      kind: 'observed',
      render: { type: 'raster', tileUrlTemplate: 'tiles/10/{z}/{y}/{x}.png', maxZoom: 6 },
    },
    {
      validAt: '2026-08-26T12:00:00.000Z',
      stepMinutes: 60,
      kind: 'analysis',
      render: { type: 'cells', valueRow: 0 },
    },
    {
      validAt: '2026-08-26T13:00:00.000Z',
      stepMinutes: 60,
      kind: 'forecast',
      render: { type: 'cells', valueRow: 1 },
    },
  ],
  nowIso: NOW,
  grid: [{ lat: 5.6, lng: -0.19 }],
  cellSizeDeg: 0.25,
  values: [[1.2], [3.4]],
  breaks: [0.1, 2, 10, 20],
  attributions: ['NASA GIBS / GPM IMERG'],
  notices: [],
};

/** Accra, matching what `conditions` carries for the default town. */
const CENTER = { lat: 5.6037, lng: -0.187 };

function renderCard() {
  return render(
    <ThemeProvider>
      <MapPreviewCard center={CENTER} locationName="Accra" temperatureC={25.4} />
    </ThemeProvider>,
  );
}

type JsonNode = { props?: Record<string, unknown>; children?: JsonNode[] } | null;

function findWebViewProps(tree: unknown): Record<string, unknown> | null {
  const visit = (node: JsonNode): Record<string, unknown> | null => {
    if (!node || typeof node !== 'object') return null;
    const source = node.props?.source as { html?: string } | undefined;
    if (typeof source?.html === 'string') return node.props ?? null;
    for (const child of node.children ?? []) {
      const found = visit(child);
      if (found) return found;
    }
    return null;
  };
  return visit(tree as JsonNode);
}

function htmlOf(tree: unknown): string {
  const props = findWebViewProps(tree);
  if (!props) throw new Error('no WebView document rendered');
  return (props.source as { html: string }).html;
}

/** Nothing is pushed into the document until it reports itself up, so a test
 * that wants to see the bridge has to play that part. */
function signalReady(tree: unknown) {
  const props = findWebViewProps(tree);
  const onMessage = props?.onMessage as ((e: unknown) => void) | undefined;
  act(() => onMessage?.({ nativeEvent: { data: JSON.stringify({ type: 'ready' }) } }));
}

beforeEach(() => {
  mockPush.mockClear();
  mockInject.mockClear();
  mockIsOnline.mockReturnValue(true);
  mockTimeline.mockReturnValue({ data: TIMELINE, status: 'success' });
});

describe('MapPreviewCard', () => {
  it('opens the full rain map when the card is pressed', () => {
    const view = renderCard();

    fireEvent.press(view.getByLabelText('Open the rain map'));

    expect(mockPush).toHaveBeenCalledWith('/rain-map');
  });

  /* The map is behind `pointerEvents="none"` so the card can own the tap. That
     only works if the press still reaches the Pressable from over the map, so
     the map subtree must not be a target itself. */
  it('keeps the map out of the touch and accessibility trees', () => {
    const view = renderCard();
    const props = findWebViewProps(view.toJSON());

    expect(props).not.toBeNull();
    expect(view.queryAllByLabelText('Open the rain map')).toHaveLength(1);
  });

  /* A preview centred on the country would show the reader's own town as a few
     pixels. The document has to be looking at where they are. */
  it('fits a box around the given centre rather than the whole country', () => {
    const html = htmlOf(renderCard().toJSON());

    // 2.5 degrees wide, so 1.25 either side of Accra.
    expect(html).toContain('bounds: [[-1.437, 4.3537], [1.063, 6.8537]]');
    expect(html).toContain('interactive: false');
    // The thumbnail rounds its own corners inside the document. An Android
    // WebView does not reliably clip to its parent's borderRadius, so without
    // this the map paints square corners inside a rounded card.
    expect(html).toContain('border-radius:');
    expect(html).toContain('overflow: hidden;');
  });

  /* A credits line at this size is unreadable, and the card cannot be tapped
     through to reach a collapsed one. The full-screen map is where the licence
     conditions are met; see MapLibrePrecipitation's own suite. */
  it('carries no attribution control at thumbnail size', () => {
    const html = htmlOf(renderCard().toJSON());

    expect(html).toContain('attributionControl: false');
    expect(html).not.toContain('new maplibregl.AttributionControl');
  });

  /* The whole reason a live thumbnail is affordable. If this ever starts
     shipping the timeline, the card is fetching three hours of tiles behind a
     card nobody has tapped. */
  it('sends exactly one frame, the one nearest now', () => {
    const view = renderCard();
    signalReady(view.toJSON());

    const setFrames = mockInject.mock.calls.map((call) => String(call[0])).filter((script) => script.includes('setFrames'));

    expect(setFrames).toHaveLength(1);
    const payload = JSON.parse(setFrames[0].match(/args:(\[.*?\])\}/s)![1]) as { id: string }[][];
    expect(payload[0]).toHaveLength(1);
    expect(payload[0][0].id).toBe(NOW);
  });

  /* Said before the WebView mounts rather than after, so the card never shows a
     blank rectangle while MapLibre works out it cannot reach its basemap. */
  it('says why instead of mounting a map when there is no connection', () => {
    mockIsOnline.mockReturnValue(false);

    const view = renderCard();

    expect(findWebViewProps(view.toJSON())).toBeNull();
    expect(view.getByText('The map is satellite imagery, so it needs a connection.')).toBeTruthy();
  });
});

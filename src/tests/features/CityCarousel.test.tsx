import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { CityCarousel } from '../../features/home/components/CityCarousel';
import { cityCardWidth, citySnapOffsets } from '../../features/home/cityCarouselLayout';
import { HOME_LOCATIONS } from '../../shared/data/mockWeather';
import { useLocationStore } from '../../shared/state/locationStore';
import { useSettingsStore } from '../../shared/state/settingsStore';
import { ThemeProvider } from '../../shared/theme/ThemeProvider';
import { typeScale } from '../../shared/theme/tokens';

/* The flow runs under `useFocusEffect`, which needs a navigation context this
   bare render does not have. Stubbed as a no-op rather than as a plain effect:
   an endless `Animated.loop` under real timers spins the worker hot enough to
   time out unrelated suites running in parallel, and Jest can observe nothing
   about the animation anyway. Every assertion below is about what renders —
   the duplicated pass, the hand-off to a scroller — which is state-driven and
   unaffected. */
jest.mock('expo-router', () => ({ useFocusEffect: () => {} }));

const TEST_SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

let client: QueryClient;

function renderCarousel() {
  return render(
    <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
      <ThemeProvider>
        <QueryClientProvider client={client}>
          <CityCarousel />
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

/**
 * A prop off the scroller itself.
 *
 * Reached by its accessibility label rather than a `testID` — this codebase has
 * none anywhere and queries by role and label throughout. By label and not by
 * role because RNTL's role query skips a host ScrollView, which is not marked
 * `accessible` even though it carries the role.
 *
 * The scroll props are not observable any other way: Jest runs no scroll
 * physics, so what the ScrollView was *asked* to do is the only evidence there
 * is that a flick will land flush.
 */
function scrollerProp<T>(name: string): T | undefined {
  return screen.getByLabelText('Choose a town').props?.[name] as T | undefined;
}

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  // Seeded directly rather than awaited: zustand's persist middleware hydrates
  // from the AsyncStorage mock asynchronously, and every assertion here depends
  // on the carousel believing hydration is done.
  useLocationStore.setState({ selectedLocationId: 'accra', hasHydrated: true });
  // textSize is reset too: it is a persisted store shared across tests, and a
  // leaked 'extra-large' silently changes every card width and snap offset.
  useSettingsStore.setState({ dataSaverEnabled: false, textSize: 'standard' });
});

afterEach(() => {
  client.clear();
});

describe('CityCarousel', () => {
  it('lists every town', () => {
    renderCarousel();
    HOME_LOCATIONS.forEach((location) => {
      expect(screen.getByText(location.name)).toBeTruthy();
    });
  });

  /* The condition string used to set the card width, with no cap — so
     "Thunderstorms likely" made one card half again as wide as its neighbour
     and the strip scanned as a ragged pile. It is still shown in full for the
     selected town on the card directly below this one. */
  it('does not print the weather condition on the cards', () => {
    renderCarousel();
    expect(screen.queryByText('Thunderstorms likely')).toBeNull();
    expect(screen.queryByText('Partly cloudy')).toBeNull();
  });

  it('offers the towns as one choice, not ten loose buttons', () => {
    renderCarousel();
    expect(scrollerProp<string>('accessibilityRole')).toBe('radiogroup');
    expect(screen.getByLabelText(/^Accra/)).toBeTruthy();
  });

  /** Touch it once to stop the flow and get the snapping scroller. */
  function handOver() {
    fireEvent(screen.getByLabelText('Choose a town'), 'touchStart');
  }

  /* The offsets are what make a flick land flush instead of stopping halfway
     across a card. Nothing else in Jest can observe the snapping, so this is
     the assertion that has to carry it. */
  it('snaps to one offset per town, matching the layout maths', () => {
    renderCarousel();
    handOver();

    const expected = citySnapOffsets(
      HOME_LOCATIONS.length,
      cityCardWidth(typeScale.bodyStrong.fontSize),
      8,
    );

    expect(scrollerProp<number[]>('snapToOffsets')).toEqual(expected);
    expect(scrollerProp<string>('decelerationRate')).toBe('fast');
  });

  it('widens the snap step when the farmer asks for larger text', () => {
    useSettingsStore.setState({ textSize: 'extra-large' });
    renderCarousel();
    handOver();

    const offsets = scrollerProp<number[]>('snapToOffsets') ?? [];
    const standardStep = cityCardWidth(typeScale.bodyStrong.fontSize) + 8;

    expect(offsets[1]).toBeGreaterThan(standardStep);
  });

  it('records the town the farmer taps', () => {
    renderCarousel();

    fireEvent.press(screen.getAllByLabelText(/^Tamale/)[0]);
    expect(useLocationStore.getState().selectedLocationId).toBe('tamale');
  });

  it('marks the selected town for a screen reader', () => {
    useLocationStore.setState({ selectedLocationId: 'kumasi', hasHydrated: true });
    renderCarousel();

    expect(screen.getByLabelText(/^Kumasi/).props.accessibilityState).toEqual(
      expect.objectContaining({ selected: true }),
    );
    expect(screen.getByLabelText(/^Accra/).props.accessibilityState).toEqual(
      expect.objectContaining({ selected: false }),
    );
  });

  describe('flowing on its own', () => {
    /* The row renders the towns twice and slides by exactly one cycle, so the
       loop restarts on an identical frame. A single copy would visibly rewind
       at the end of every pass. */
    it('renders a second pass of the towns so the loop is seamless', () => {
      renderCarousel();
      // includeHiddenElements, because the second pass is deliberately hidden
      // from the accessibility tree and RNTL's queries honour that by default.
      expect(screen.getAllByText('Accra', { includeHiddenElements: true })).toHaveLength(2);
      expect(screen.getAllByText('Yendi', { includeHiddenElements: true })).toHaveLength(2);
    });

    /* Twenty towns on screen must still be ten towns to a screen reader. */
    it('hides the second pass from assistive tech', () => {
      renderCarousel();
      expect(screen.getAllByLabelText(/^Accra/)).toHaveLength(1);
    });

    /* Flowing content cannot also be swiped, so while it flows there is no
       scroller — and therefore nothing that snaps. */
    it('is not a scroller while it flows', () => {
      renderCarousel();
      expect(scrollerProp<number[]>('snapToOffsets')).toBeUndefined();
    });

    /* A flow that resumed after the farmer took hold of it would be fighting
       them, so the first touch hands over permanently. */
    it('hands over to a snapping scroller at the first touch', () => {
      renderCarousel();

      fireEvent(screen.getByLabelText('Choose a town'), 'touchStart');

      // Even counting hidden nodes there is now exactly one pass: the duplicate
      // existed only to make the loop seamless.
      expect(screen.getAllByText('Accra', { includeHiddenElements: true })).toHaveLength(1);
      expect(scrollerProp<number[]>('snapToOffsets')).toEqual(
        citySnapOffsets(HOME_LOCATIONS.length, cityCardWidth(typeScale.bodyStrong.fontSize), 8),
      );
    });

    it('hands over when a town is tapped, and records the town', () => {
      renderCarousel();

      fireEvent.press(screen.getAllByLabelText(/^Tamale/)[0]);

      expect(useLocationStore.getState().selectedLocationId).toBe('tamale');
      expect(screen.getAllByText('Tamale')).toHaveLength(1);
    });

    /* The whole point of the chosen behaviour: the strip may move, the farmer's
       choice may not. Everything below Home reads this value. */
    it('never changes which town is selected', () => {
      renderCarousel();
      expect(useLocationStore.getState().selectedLocationId).toBe('accra');
    });

    /* Idle motion is exactly what the setting asks the app to stop doing, so
       the strip renders as a plain scroller from the outset. */
    it('never flows when the device asks for reduced motion', async () => {
      (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValueOnce(true);
      renderCarousel();

      // The setting is read asynchronously; without letting that settle this
      // would pass on a component that ignores it entirely.
      await act(async () => {});

      expect(screen.getAllByText('Accra')).toHaveLength(1);
      expect(scrollerProp<number[]>('snapToOffsets')).toBeDefined();
    });
  });

  /* Every other Home consumer gates on hydration. Without it a cold start with
     data-saver on fetches the default town and then the restored one, and the
     strip positions itself on the wrong card before correcting. */
  it('asks for nothing until the stored town has loaded', () => {
    useLocationStore.setState({ selectedLocationId: 'accra', hasHydrated: false });
    renderCarousel();

    expect(client.getQueryCache().getAll().every((query) => query.state.fetchStatus === 'idle')).toBe(
      true,
    );
  });
});

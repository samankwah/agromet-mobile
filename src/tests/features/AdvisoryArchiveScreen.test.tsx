import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

import { AdvisoryArchiveScreen } from '../../features/advisories/archive/AdvisoryArchiveScreen';
import { ThemeProvider } from '../../shared/theme/ThemeProvider';

jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));

// See HomeScreen.test.tsx for why initialMetrics is required in Jest.
const TEST_SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 360, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

/**
 * A client per test with retries off. The shared app client retries twice,
 * which is right on a phone and wrong here: a rejected fetch then leaves
 * backoff timers outliving the test and hanging the worker.
 */
let client: QueryClient;

function renderScreen() {
  return render(
    <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
      <ThemeProvider>
        <QueryClientProvider client={client}>
          <AdvisoryArchiveScreen />
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

function respondWith(body: unknown) {
  globalThis.fetch = jest.fn(() =>
    Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) } as Response),
  ) as unknown as typeof fetch;
}

/**
 * Drives a filter dropdown the way a farmer does: open it, pick the option.
 *
 * The option is found by its `menuitem` role rather than by text, because the
 * archive renders year headings in the list as well — so a plain text lookup
 * for "2025" matches the sheet option *and* a group heading, and
 * CalendarScreens' "take the last match" trick would press the heading, which
 * is not pressable.
 */
function choose(fieldLabel: string, current: string, option: string) {
  // The place and time pickers are folded away by default — content leads.
  const disclosure = screen.queryByLabelText('Show place and time filters');
  if (disclosure) fireEvent.press(disclosure);

  fireEvent.press(screen.getByLabelText(`${fieldLabel}: ${current}`));
  fireEvent.press(screen.getByRole('menuitem', { name: option }));
}

beforeEach(async () => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  // The offline cache is AsyncStorage, not memory — it outlives the client, so
  // a later test would otherwise inherit an earlier one's payload.
  await AsyncStorage.clear();
  jest.clearAllMocks();
  // Rejected by default so the tests exercise the seeded-sample path
  // deterministically, without depending on a server.
  globalThis.fetch = jest.fn(() =>
    Promise.reject(new TypeError('Network request failed')),
  ) as unknown as typeof fetch;
});

afterEach(() => {
  client.clear();
  jest.restoreAllMocks();
});

describe('AdvisoryArchiveScreen', () => {
  it('lists the samples grouped by year, newest first', async () => {
    renderScreen();
    await screen.findByText('2026');

    expect(screen.getByText('2025')).toBeTruthy();
    expect(screen.getByText('Rice advisory — major season')).toBeTruthy();
    expect(screen.getByText('Cowpea advisory')).toBeTruthy();
  });

  /* "Nobody has published anything" and "your phone has no signal" are not the
     same news, and a farmer needs to be able to tell them apart. */
  it('says the server was unreachable rather than that nothing is published', async () => {
    renderScreen();
    await screen.findByText(/could not be reached/i);

    expect(screen.queryByText(/Nothing has been published yet/i)).toBeNull();
  });

  it('says nothing is published when the server answers with an empty archive', async () => {
    respondWith({ success: true, data: [] });
    renderScreen();
    await screen.findByText(/Nothing has been published yet/i);

    expect(screen.getByText(/once your extension office uploads an advisory/i)).toBeTruthy();
  });

  it('renders real records without any sample notice', async () => {
    respondWith({
      success: true,
      data: [
        {
          id: 42,
          title: 'Cassava advisory',
          advisoryType: 'agromet-advisory',
          region: 'REG05/Volta Region',
          district: 'DS009/Ho Municipal',
          crop: 'Cassava',
          year: 2026,
          created_at: '2026-05-01 06:00:00',
          activityCount: 1,
          activities: ['Land preparation'],
          weekLabels: ['Weeks 1-4'],
        },
      ],
    });
    renderScreen();
    await screen.findByText('Cassava advisory');

    // readableName strips the "REG05/" prefix the uploader leaves behind.
    expect(screen.getByText(/Ho Municipal, Volta Region/)).toBeTruthy();
    expect(screen.queryByText(/could not be reached/i)).toBeNull();
    expect(screen.queryByText(/Nothing has been published yet/i)).toBeNull();
  });

  describe('narrowing', () => {
    it('searches activity names, not just titles', async () => {
      renderScreen();
      await screen.findByText('Rice advisory — major season');

      fireEvent.changeText(screen.getByLabelText('Search advisories'), 'armyworm');

      // Only the maize sample lists a fall armyworm watch.
      expect(screen.getByText('Maize advisory — minor season')).toBeTruthy();
      expect(screen.queryByText('Rice advisory — major season')).toBeNull();
    });

    it('reports when a search matches nothing, and offers a way out', async () => {
      renderScreen();
      await screen.findByText('Rice advisory — major season');

      fireEvent.changeText(screen.getByLabelText('Search advisories'), 'zzzz');

      expect(screen.getByText('No advisories match')).toBeTruthy();
      expect(screen.getByLabelText('Clear all filters')).toBeTruthy();
    });

    it('clears every filter at once', async () => {
      renderScreen();
      await screen.findByText('Rice advisory — major season');

      fireEvent.changeText(screen.getByLabelText('Search advisories'), 'zzzz');
      fireEvent.press(screen.getByLabelText('Clear all filters'));

      expect(screen.getByText('Rice advisory — major season')).toBeTruthy();
    });

    it('narrows to one region', async () => {
      renderScreen();
      await screen.findByText('Rice advisory — major season');

      choose('Region', 'All regions', 'Upper East Region');

      expect(screen.getByText('Tomato advisory — irrigated')).toBeTruthy();
      expect(screen.queryByText('Rice advisory — major season')).toBeNull();
    });

    /* Facets narrow as other facets are set, so a selection can fall out of
       its own option list. When that happens the control must still show what
       it is filtering by, not label itself "Select". */
    it('keeps a selected year visible after narrowing the region', async () => {
      renderScreen();
      await screen.findByText('Rice advisory — major season');

      choose('Year', 'Any year', '2025');
      // Upper East has a 2025 cowpea advisory, Ashanti has none.
      choose('Region', 'All regions', 'Ashanti Region');

      expect(screen.getByLabelText('Year: 2025')).toBeTruthy();
      expect(screen.getByText('No advisories match')).toBeTruthy();
    });

    /* A crop is not a bird: switching kind must not leave a crop selected, or
       the result is a filter combination that matches nothing. */
    it('keeps poultry and crops apart', async () => {
      renderScreen();
      await screen.findByText('Rice advisory — major season');

      fireEvent.press(screen.getByLabelText('Poultry'));

      expect(screen.getByText('Broiler advisory — brooding to finishing')).toBeTruthy();
      expect(screen.queryByText('Rice advisory — major season')).toBeNull();
    });
  });

  it('opens the tapped record rather than the newest for its district', async () => {
    renderScreen();
    const row = await screen.findByLabelText(/Cowpea advisory\./);

    fireEvent.press(row);

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/advisory/[kind]',
      params: { kind: 'crop', advisoryId: '5' },
    });
  });
});

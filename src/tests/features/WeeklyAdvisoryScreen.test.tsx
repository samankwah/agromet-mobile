import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { WeeklyAdvisoryScreen } from '../../features/advisories/weekly/WeeklyAdvisoryScreen';
import { queryClient } from '../../shared/api/queryClient';
import { ThemeProvider } from '../../shared/theme/ThemeProvider';

jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));

// Every request is refused, so the screen exercises the seeded-fallback path
// deterministically. That is also the real state of the backend today: the
// weekly_advisories table is empty in every database.
const mockFetch = jest.fn(() => Promise.reject(new TypeError('Network request failed')));
globalThis.fetch = mockFetch as unknown as typeof fetch;

const TEST_SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 360, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function renderScreen(kind: 'crop' | 'poultry') {
  return render(
    <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <WeeklyAdvisoryScreen kind={kind} />
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

/**
 * Drives a panel cell the way a farmer does: tap it, pick the option.
 *
 * Every field on this screen is its own control — there is no separate row of
 * filter dropdowns — so the trigger is the cell showing the current value.
 *
 * The options that follow are all near the head of their list on purpose. The
 * sheet renders a FlatList, which virtualises: Ashanti has 43 districts and
 * only the first handful exist in the tree, so reaching for one further down
 * fails to find an element that a real user could simply scroll to.
 */
function choose(field: string, current: string, option: string) {
  fireEvent.press(screen.getByLabelText(`${field}: ${current}. Change it.`));
  fireEvent.press(screen.getByText(option));
}

/** Narrows to a district, which is what unlocks the rest of the screen. */
async function selectCrop() {
  choose('Region', 'All regions', 'Ashanti Region');
  choose('District', 'Select district', 'Adansi Akrofuom');
  choose('Commodity', 'All commodities', 'Maize');
  await screen.findByText('DETAILED FORECAST');
}

beforeEach(() => {
  queryClient.clear();
  jest.clearAllMocks();
});

describe('WeeklyAdvisoryScreen — before anything is narrowed', () => {
  /* Opening on a gate would leave a farmer with three questions and no
     advisory. Unset fields are simply not sent, so the same request asks the
     server for whatever it has published anywhere. */
  it('opens on the national view rather than asking for a district first', async () => {
    renderScreen('crop');

    // Both awaited, and both given room: this is the first render in the suite,
    // so it pays for module load and the first query on a machine that may be
    // busy. A bare getByText here fails on timing rather than on behaviour.
    expect(await screen.findByText('DETAILED FORECAST', {}, { timeout: 15000 })).toBeTruthy();
    expect(
      await screen.findByText(/latest bulletin published anywhere in Ghana/, {}, { timeout: 15000 }),
    ).toBeTruthy();
  });

  it('reads the unset fields as the whole country, not as unanswered questions', async () => {
    renderScreen('crop');
    await screen.findByText('DETAILED FORECAST');

    expect(screen.getByText('All zones')).toBeTruthy();
    expect(screen.getByText('All regions')).toBeTruthy();
    expect(screen.getByText('All districts')).toBeTruthy();
    expect(screen.getByText('All commodities')).toBeTruthy();
  });

  it('drops the national line once a district is chosen', async () => {
    renderScreen('crop');
    await selectCrop();

    expect(screen.queryByText(/latest bulletin published anywhere in Ghana/)).toBeNull();
  });

  /* A district belongs to exactly one region, and 261 of them mean nothing in
     a national list — so the field only becomes a control once a region
     narrows it. */
  it('will not offer districts until a region is chosen', () => {
    renderScreen('crop');

    // No chevron and no label suffix: the cell is plain text until it can act.
    expect(screen.getByText('All districts')).toBeTruthy();
    expect(screen.queryByLabelText('District: All districts. Change it.')).toBeNull();
  });
});

describe('WeeklyAdvisoryScreen — a crop advisory', () => {
  it('shows the forecast table, the summary and the per-parameter advice', async () => {
    renderScreen('crop');
    await selectCrop();

    expect(screen.getByText('DETAILED FORECAST')).toBeTruthy();
    expect(screen.getByText('DRY CONDITIONS WITH GOOD WORKING DAYLIGHT')).toBeTruthy();
    expect(screen.getByText('ADVISORY')).toBeTruthy();
  });

  it('lets the farmer switch between the activities in the bulletin', async () => {
    renderScreen('crop');
    await selectCrop();

    // The name shows twice by design: as a chip in the picker, and as the
    // heading of the panel describing whichever chip is chosen.
    expect(screen.getAllByText('Seed selection and seed treatment').length).toBeGreaterThan(1);

    fireEvent.press(screen.getByLabelText('Land preparation'));

    expect(await screen.findByText('SHOWERS RETURN, SOIL BECOMES WORKABLE')).toBeTruthy();
  });

  /* The whole bulletin arrives in one response, so changing activity is a
     local switch. A round trip per tap would break the moment signal did. */
  it('does not go back to the network to switch activity', async () => {
    renderScreen('crop');
    await selectCrop();

    const callsAfterLoad = mockFetch.mock.calls.length;
    fireEvent.press(screen.getByLabelText('Land preparation'));

    expect(mockFetch.mock.calls.length).toBe(callsAfterLoad);
  });

  /* The advisory is the answer to the column it sits in, so it stays in the
     table beside its own forecast rather than being lifted into cards below. */
  it('carries the advisory as a row of the table, not a separate section', async () => {
    renderScreen('crop');
    await selectCrop();

    expect(screen.getByText('ADVISORY')).toBeTruthy();
    expect(screen.getByText('Select good and viable seeds. Do your germination test for your variety and treat seeds.')).toBeTruthy();
  });

  /* Every parameter in the bulletin gets a column, in the sheet's own order —
     the table is not filtered down to the ones that happen to have advice. */
  it('gives every weather parameter in the bulletin a column', async () => {
    renderScreen('crop');
    await selectCrop();

    for (const parameter of ['RAINFALL', 'TEMP', 'HUMIDITY', 'SOIL MOISTURE', 'SOIL TEMP', 'EVAPO-TRANSP.']) {
      expect(screen.getByText(parameter)).toBeTruthy();
    }
    expect(screen.getByText('Moderate effect')).toBeTruthy(); // an implication cell
  });
});

describe('WeeklyAdvisoryScreen — a poultry advisory', () => {
  /* Poultry bulletins carry no forecast at all. Rendering an empty table would
     imply data that failed to load rather than data never collected. */
  it('shows management targets and actions, and no forecast table', async () => {
    renderScreen('poultry');
    choose('Region', 'All regions', 'Ashanti Region');
    choose('District', 'Select district', 'Adansi Akrofuom');
    choose('Bird', 'All birds', 'Broiler');

    expect(await screen.findByText('TARGETS THIS WEEK')).toBeTruthy();
    expect(screen.getByText('ADVISORY')).toBeTruthy();
    expect(screen.queryByText('DETAILED FORECAST')).toBeNull();
    expect(screen.queryByText('Activity')).toBeNull();
  });
});

describe('WeeklyAdvisoryScreen — every field is its own control', () => {
  /* The chip row picks an activity by name. These pick the same activities by
     when they happen, which is how a farmer asking about next week thinks. */
  it('switches activity from the week field', async () => {
    renderScreen('crop');
    await selectCrop();

    choose('Weeks', 'Weeks 5-8', 'Weeks 9-10');

    expect(await screen.findByText('SHOWERS RETURN, SOIL BECOMES WORKABLE')).toBeTruthy();
  });

  it('switches activity from the month field', async () => {
    renderScreen('crop');
    await selectCrop();

    choose('Month', 'Jan/Feb 2026', 'Feb 2026');

    expect(await screen.findByText('SHOWERS RETURN, SOIL BECOMES WORKABLE')).toBeTruthy();
  });

  /* The panel shows what the farmer chose, not what the stand-in bulletin says
     — otherwise an Ashanti search would silently relabel itself to Eastern. */
  it('shows the chosen district, not the one the stand-in bulletin was written for', async () => {
    renderScreen('crop');
    await selectCrop();

    expect(screen.getByText('Adansi Akrofuom')).toBeTruthy();
    expect(screen.queryByText('Abuakwa North')).toBeNull();
  });

  /* Zone narrows the region list. A region the new zone cannot reach has to go
     with it, or the panel would show a region the list no longer offers. */
  it('clears a region the newly chosen zone does not reach', async () => {
    renderScreen('crop');
    await selectCrop();

    choose('Zone', 'Semi-Deciduous Forest', 'Sudan Savannah');

    expect(screen.getByText('All regions')).toBeTruthy();
    expect(screen.queryByText('Ashanti Region')).toBeNull();
  });

  it('keeps a region the newly chosen zone still reaches', async () => {
    renderScreen('crop');
    await selectCrop();

    choose('Zone', 'Semi-Deciduous Forest', 'All zones');

    expect(screen.getByText('Ashanti Region')).toBeTruthy();
  });
});

describe('WeeklyAdvisoryScreen — saying where the data came from', () => {
  it('says the server could not be reached, rather than passing samples off as published', async () => {
    renderScreen('crop');
    await selectCrop();

    expect(screen.getByText(/could not be reached/)).toBeTruthy();
  });
});

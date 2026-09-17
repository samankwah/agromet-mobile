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
  /* Poultry bulletins are authored on the same district template as crop ones —
     one worksheet per activity, each with the nine-parameter forecast band. The
     screen used to branch on `kind` and send every poultry bulletin to the
     guidance card; it now branches on what the bulletin actually contains. The
     sample is four worksheets of a real Jasikan broiler bulletin. */
  it('gives a parsed poultry bulletin the same table a crop one gets', async () => {
    renderScreen('poultry');
    choose('Region', 'All regions', 'Ashanti Region');
    choose('District', 'Select district', 'Adansi Akrofuom');
    choose('Bird', 'All birds', 'Broiler');

    expect(await screen.findByText('DETAILED FORECAST')).toBeTruthy();
    // The activity chips, and the summary panel below the table.
    expect(screen.getByText('Activity')).toBeTruthy();
    // Twice over: the chip and the panel heading, as on the crop side. The
    // screen opens on the first stage of the programme.
    expect(screen.getAllByText('Site and housing').length).toBeGreaterThan(1);
    // And every other stage is reachable as a chip.
    expect(screen.getByText('Brooder management')).toBeTruthy();
    expect(screen.getByText('FORECAST AND ADVISORY')).toBeTruthy();
  });

  it('carries the bird bulletin own advice, not a crop one', async () => {
    renderScreen('poultry');

    await screen.findByText('DETAILED FORECAST');
    // Poultry advice, not crop advice — the opening stage of the bird programme.
    expect(
      screen.getByText(/Choose ground that drains, away from other poultry/),
    ).toBeTruthy();
  });

  /* Layer bulletins label their weeks in prose — "1 - End", "From point of lay
     to end of production" — and broiler sheets use ragged spacing. Anything
     that tries to make a number of those loses the only week information the
     sheet carries, so the label is passed through exactly as written. */
  it('shows a week label exactly as the sheet wrote it', async () => {
    renderScreen('poultry');

    await screen.findByText('DETAILED FORECAST');
    // The opening stage is labelled "Before Week 1" — prose, not a number, and
    // it has to survive to the panel exactly as the sheet wrote it.
    expect(screen.getByLabelText(/^Weeks: Before Week 1\./)).toBeTruthy();
  });

  /* The older generated template produces no worksheets, only a target table
     and a list of actions. That path is still supported, and is the one thing
     the guidance card now exists for. Driven through real responses rather than
     the seed, because the seed is deliberately a parsed bulletin. */
  it('falls back to management targets when the upload had no worksheets', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: [
          {
            id: 1,
            advisory_id: 7,
            activity: 'Brooding',
            week_label: '1-2',
            region: 'REG01/Oti',
            district: 'DS001/Jasikan',
            crop: 'Broiler',
            year: 2026,
          },
        ],
      }),
    } as never);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          id: 7,
          advisoryType: 'poultry-advisory',
          title: 'Broiler Advisory',
          region: 'REG01/Oti',
          district: 'DS001/Jasikan',
          crop: 'Broiler',
          // Plain strings, so they partition as recommendations and leave no
          // activities behind.
          advisories: ['Check the brooder guard twice daily.'],
          weatherForecast: { 'Brooding temperature': '32C' },
          created_at: '2026-01-26T06:00:00.000Z',
        },
      }),
    } as never);

    renderScreen('poultry');

    expect(await screen.findByText('TARGETS THIS WEEK')).toBeTruthy();
    expect(screen.getByText('Check the brooder guard twice daily.')).toBeTruthy();
    expect(screen.queryByText('DETAILED FORECAST')).toBeNull();
    // `source` and `parameters` are reserved in that column; neither should
    // ever surface as a management target.
    expect(screen.queryByText('spreadsheet')).toBeNull();
  });

  /* The stand-in bulletin is a real Jasikan one. Its worksheets are headed
     "...FOR BROILER FARMERS IN THE OTI REGION", which is true of the file and
     false on screen the moment it stands in for a district that has published
     nothing — a farmer who picked Ashanti got a card titled after Oti. Where
     the sample came from is the fallback notice's job to say, not the card's. */
  it('never titles the summary card after the sample own region', async () => {
    renderScreen('poultry');
    choose('Region', 'All regions', 'Ashanti Region');
    choose('District', 'Select district', 'Adansi Akrofuom');
    choose('Bird', 'All birds', 'Broiler');

    await screen.findByText('DETAILED FORECAST');
    expect(screen.getByText('FORECAST AND ADVISORY')).toBeTruthy();
    expect(screen.queryByText(/OTI REGION/i)).toBeNull();
  });

  /* A layer runs to point of lay and beyond: sixteen stages against the
     broiler's four, a year against eight weeks. One poultry stand-in cannot
     represent both, so the seed follows the chosen bird. */
  it('shows the layer programme, not the broiler one, when Layer is chosen', async () => {
    renderScreen('poultry');
    choose('Bird', 'All birds', 'Layer');

    await screen.findByText('DETAILED FORECAST');
    expect(screen.getAllByText('Debeaking').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Egg harvest and market').length).toBeGreaterThan(0);
    // Broiler-only stages must not leak into a layer bulletin.
    expect(screen.queryByText('Finisher feed')).toBeNull();
  });

  /* The district template is one sheet layout for both kinds, so a poultry
     workbook carries the soil columns and fills every cell with "-". Housed
     birds stand on litter: there is no reading to give, and two dead columns
     cost two sideways swipes in a table that already scrolls. Crop keeps its
     empty columns — see the crop suite above, where that is pinned. */
  it('leaves the soil columns out of a poultry table', async () => {
    renderScreen('poultry');

    await screen.findByText('DETAILED FORECAST');
    expect(screen.getByText('RAINFALL')).toBeTruthy();
    expect(screen.getByText('HUMIDITY')).toBeTruthy();
    expect(screen.queryByText('SOIL MOISTURE')).toBeNull();
    expect(screen.queryByText('SOIL TEMP')).toBeNull();
  });

  it('offers only the birds anyone publishes for', async () => {
    renderScreen('poultry');
    fireEvent.press(screen.getByLabelText('Bird: All birds. Change it.'));

    expect(screen.getAllByText('Broiler').length).toBeGreaterThan(0);
    expect(screen.getByText('Layer')).toBeTruthy();
    // Present in the backend catalogue, deliberately not offered here.
    expect(screen.queryByText('Guinea Fowl')).toBeNull();
    expect(screen.queryByText('Turkey')).toBeNull();
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
  it('says the server could not be reached, and which district the bulletin was written for', async () => {
    renderScreen('crop');
    await selectCrop();

    expect(screen.getByText(/Could not reach the AgroMet server/)).toBeTruthy();
    expect(screen.getByText(/The bulletin below was written for/)).toBeTruthy();
    expect(screen.queryByText(/sample/i)).toBeNull();
  });
});

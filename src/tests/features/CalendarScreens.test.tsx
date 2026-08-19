import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { CalendarDetailScreen } from '../../features/farm-tools/calendars/CalendarDetailScreen';
import { CalendarListScreen } from '../../features/farm-tools/calendars/CalendarListScreen';
import { FarmToolsScreen } from '../../features/farm-tools/FarmToolsScreen';
import { queryClient } from '../../shared/api/queryClient';
import { ThemeProvider } from '../../shared/theme/ThemeProvider';

jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));

// Every calendar read goes over HTTP now. Reject, so these tests exercise
// the sample-data path deterministically rather than depending on a server.
const mockFetch = jest.fn(() => Promise.reject(new TypeError('Network request failed')));
globalThis.fetch = mockFetch as unknown as typeof fetch;

// See HomeScreen.test.tsx for why initialMetrics is required.
const TEST_SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 360, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function renderScreen(node: React.ReactElement) {
  return render(
    <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>{node}</QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

describe('FarmToolsScreen', () => {
  beforeEach(() => {
    queryClient.clear();
    jest.clearAllMocks();
  });

  it('offers both calendars as real destinations, not placeholders', () => {
    renderScreen(<FarmToolsScreen />);

    fireEvent.press(screen.getByText('Browse crop calendars'));
    expect(router.push).toHaveBeenCalledWith('/calendars/crop');

    fireEvent.press(screen.getByText('Browse poultry calendars'));
    expect(router.push).toHaveBeenCalledWith('/calendars/poultry');
  });

  it('still marks the genuinely unbuilt tools as coming soon', () => {
    renderScreen(<FarmToolsScreen />);

    expect(screen.getByText('Market prices & trends')).toBeTruthy();
    expect(screen.getByText('Farm reminders')).toBeTruthy();
  });
});

describe('CalendarListScreen', () => {
  beforeEach(() => {
    queryClient.clear();
    jest.clearAllMocks();
  });

  /** Drives one of the filter dropdowns the way a farmer does: open it,
   * pick the option. */
  function choose(fieldLabel: string, placeholder: string, option: string) {
    fireEvent.press(screen.getByLabelText(`${fieldLabel}: ${placeholder}`));
    fireEvent.press(screen.getByText(option));
  }

  it('asks for season, crop, region and district before showing a calendar', async () => {
    renderScreen(<CalendarListScreen kind="crop" />);
    await screen.findByText('Season');

    // Nothing is shown on arrival — the same gate the web calendar has.
    expect(screen.queryByText('Tomato Calendar')).toBeNull();
    expect(screen.getByText(/Choose a season, a crop, region and district/)).toBeTruthy();

    choose('Season', 'Select season', 'Major Season');
    choose('Crop type *', 'Select crop', 'Tomato');
    choose('Region *', 'Select region', 'Ashanti Region');
    choose('District *', 'Select district', 'Adansi North');

    expect(screen.getByText('Tomato Calendar')).toBeTruthy();
  });

  it('does not ask poultry for a season, because poultry calendars have none', async () => {
    renderScreen(<CalendarListScreen kind="poultry" />);
    await screen.findByText('Bird type *');

    // A single production-cycle sheet, no major/minor split — offering the
    // choice would be a control that cannot do anything.
    expect(screen.queryByText('Season')).toBeNull();

    choose('Bird type *', 'Select bird', 'Broiler');
    choose('Region *', 'Select region', 'Greater Accra');
    choose('District *', 'Select district', 'Accra Metropolitan');

    expect(screen.getByText('Broiler Production Cycle')).toBeTruthy();
    // Layer is a different bird, so it is filtered out.
    expect(screen.queryByText('Layer Production Cycle')).toBeNull();
  });

  it('narrows the district list to the chosen region', async () => {
    renderScreen(<CalendarListScreen kind="poultry" />);
    await screen.findByText('Bird type *');

    choose('Bird type *', 'Select bird', 'Layer');
    fireEvent.press(screen.getByLabelText('District *: Select district'));

    // Only districts that actually have a Layer calendar are offered, so a
    // farmer cannot select a combination that returns nothing.
    expect(screen.getByText('Accra Metropolitan')).toBeTruthy();
    expect(screen.queryByText('Adansi North')).toBeNull();
  });

  it('offers Year only where a year was recorded, and filters by it', async () => {
    renderScreen(<CalendarListScreen kind="poultry" />);
    await screen.findByText('Bird type *');

    choose('Bird type *', 'Select bird', 'Broiler');
    choose('Region *', 'Select region', 'Greater Accra');
    choose('District *', 'Select district', 'Accra Metropolitan');

    // The broiler cycle is a 2026 calendar.
    expect(screen.getByText('Year')).toBeTruthy();
    choose('Year', 'Any year', '2026');
    expect(screen.getByText('Broiler Production Cycle')).toBeTruthy();
  });

  it('hides Year for a calendar with none, rather than offering a dead choice', async () => {
    // The live Tomato row has year: null — a Year dropdown there could only
    // ever exclude the one calendar it is meant to find.
    renderScreen(<CalendarListScreen kind="crop" />);
    await screen.findByText('Season');

    choose('Season', 'Select season', 'Major Season');
    choose('Crop type *', 'Select crop', 'Tomato');
    choose('Region *', 'Select region', 'Ashanti Region');
    choose('District *', 'Select district', 'Adansi North');

    expect(screen.getByText('Tomato Calendar')).toBeTruthy();
    expect(screen.queryByText('Year')).toBeNull();
  });

  it('opens a calendar once the filters are complete', async () => {
    renderScreen(<CalendarListScreen kind="crop" />);
    await screen.findByText('Season');

    choose('Season', 'Select season', 'Major Season');
    choose('Crop type *', 'Select crop', 'Tomato');
    choose('Region *', 'Select region', 'Ashanti Region');
    choose('District *', 'Select district', 'Adansi North');
    fireEvent.press(screen.getByText('Tomato Calendar'));

    expect(router.push).toHaveBeenCalledWith('/calendar/mock-tomato-adansi-north');
  });
});

describe('CalendarDetailScreen', () => {
  beforeEach(() => {
    queryClient.clear();
    jest.clearAllMocks();
  });

  it('renders every activity of the real Tomato calendar', async () => {
    renderScreen(<CalendarDetailScreen id="mock-tomato-adansi-north" />);

    expect(await screen.findByText('Tomato Calendar')).toBeTruthy();
    expect(screen.getAllByText('nursing').length).toBeGreaterThan(0);
    expect(screen.getAllByText('pest and disease management').length).toBeGreaterThan(0);
    expect(screen.getAllByText('post-harvest handling').length).toBeGreaterThan(0);
  });

  it('speaks every week range, so the grid is never colour-alone', async () => {
    renderScreen(<CalendarDetailScreen id="mock-tomato-adansi-north" />);
    await screen.findByText('Tomato Calendar');

    // The bars carry no text of their own at narrow widths, so the row's
    // accessible name is what has to hold the facts. "nursing" runs weeks
    // 4-6; "pest and disease management" weeks 4-17.
    expect(screen.getByLabelText('nursing. weeks 4 to 6 of 28.')).toBeTruthy();
    expect(screen.getByLabelText('pest and disease management. weeks 4 to 17 of 28.')).toBeTruthy();
    expect(screen.getByLabelText('transplanting. week 7 of 28.')).toBeTruthy();
  });

  it('offers the three views, including a list for screen-reader users', async () => {
    renderScreen(<CalendarDetailScreen id="mock-tomato-adansi-north" />);
    await screen.findByText('Tomato Calendar');

    expect(screen.getByText('Season')).toBeTruthy();
    expect(screen.getByText('Weeks')).toBeTruthy();

    fireEvent.press(screen.getByText('List'));
    expect(screen.getByText('Weeks 4–6')).toBeTruthy();
  });

  it('opens an activity with its full name and duration', async () => {
    renderScreen(<CalendarDetailScreen id="mock-tomato-adansi-north" />);
    await screen.findByText('Tomato Calendar');

    // The grid truncates this one; the sheet is where it is readable.
    fireEvent.press(screen.getByLabelText(/earthening-up.*week 9 of 28/i));

    expect(screen.getByText('Week 9')).toBeTruthy();
    expect(screen.getByText('1 week')).toBeTruthy();
  });

  it('does not present week numbers as dates when the calendar has no anchor', async () => {
    // The real Tomato row has year: null, so there is no date to show and
    // inventing one would tell a farmer to plant on the wrong day.
    renderScreen(<CalendarDetailScreen id="mock-tomato-adansi-north" />);
    await screen.findByText('Tomato Calendar');

    expect(screen.getByText(/counted from the start of the cycle/)).toBeTruthy();
  });

  it('labels sample data rather than passing it off as live', async () => {
    renderScreen(<CalendarDetailScreen id="mock-broiler-cycle" />);

    expect(await screen.findByText('Broiler Production Cycle')).toBeTruthy();
    expect(screen.getByText('Mock data')).toBeTruthy();
  });
});

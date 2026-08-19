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

/** The real provider order, from app/_layout.tsx. Exposed separately so a
 * rerender can re-wrap — rerendering the bare screen drops the providers
 * and it throws out of useTheme. */
function wrap(node: React.ReactElement) {
  return (
    <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>{node}</QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function renderScreen(node: React.ReactElement) {
  return render(wrap(node));
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
    await screen.findByText('Season *');

    // Nothing is shown on arrival — the same gate the web calendar has.
    expect(screen.queryByText('Tomato Calendar')).toBeNull();
    expect(screen.getByText(/Choose a season, a crop, region and district/)).toBeTruthy();

    choose('Season *', 'Select season', 'Major Season');
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
    expect(screen.queryByText('Season *')).toBeNull();

    choose('Bird type *', 'Select bird', 'Broiler');
    choose('Region *', 'Select region', 'Greater Accra Region');
    choose('District *', 'Select district', 'Accra Metropolitan');

    expect(screen.getByText('Broiler Production Cycle')).toBeTruthy();
    // Layer is a different bird, so it is filtered out.
    expect(screen.queryByText('Layer Production Cycle')).toBeNull();
  });

  it('offers the whole national catalogue, not only places with a calendar', async () => {
    renderScreen(<CalendarListScreen kind="poultry" />);
    await screen.findByText('Bird type *');

    // A farmer in a district with nothing published still has to be able to
    // find their own district and be told so.
    // Regions with no calendar at all are still offered. (The menu is a
    // FlatList, so only the first page is rendered — these are within it.)
    fireEvent.press(screen.getByLabelText('Region *: Select region'));
    expect(screen.getByText('Ahafo Region')).toBeTruthy();
    expect(screen.getByText('Central Region')).toBeTruthy();
    expect(screen.getByText('Eastern Region')).toBeTruthy();
  });

  it('narrows districts to the chosen region, and asks for a region first', async () => {
    renderScreen(<CalendarListScreen kind="poultry" />);
    await screen.findByText('Bird type *');

    expect(screen.getByLabelText('District *: Select a region first')).toBeTruthy();

    choose('Region *', 'Select region', 'Ashanti Region');
    fireEvent.press(screen.getByLabelText('District *: Select district'));

    // A district belongs to exactly one region.
    expect(screen.getByText('Adansi North')).toBeTruthy();
    expect(screen.queryByText('Accra Metropolitan')).toBeNull();
  });

  it('says plainly when a real district has no calendar', async () => {
    renderScreen(<CalendarListScreen kind="poultry" />);
    await screen.findByText('Bird type *');

    choose('Bird type *', 'Select bird', 'Broiler');
    choose('Region *', 'Select region', 'Central Region');
    choose('District *', 'Select district', 'Agona East');

    expect(screen.getByText('No calendar for Agona East yet')).toBeTruthy();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('offers Year only where a year was recorded, and filters by it', async () => {
    renderScreen(<CalendarListScreen kind="poultry" />);
    await screen.findByText('Bird type *');

    choose('Bird type *', 'Select bird', 'Broiler');
    choose('Region *', 'Select region', 'Greater Accra Region');
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
    await screen.findByText('Season *');

    choose('Season *', 'Select season', 'Major Season');
    choose('Crop type *', 'Select crop', 'Tomato');
    choose('Region *', 'Select region', 'Ashanti Region');
    choose('District *', 'Select district', 'Adansi North');

    expect(screen.getByText('Tomato Calendar')).toBeTruthy();
    expect(screen.queryByText('Year')).toBeNull();
  });

  it('opens the calendar itself once the filters leave only one, with no extra tap', async () => {
    renderScreen(<CalendarListScreen kind="crop" />);
    await screen.findByText('Season *');

    choose('Season *', 'Select season', 'Major Season');
    choose('Crop type *', 'Select crop', 'Tomato');
    choose('Region *', 'Select region', 'Ashanti Region');
    choose('District *', 'Select district', 'Adansi North');

    // No tap on a result row — completing the filters is the whole action.
    expect(router.push).toHaveBeenCalledWith('/calendar/sample-tomato-adansi-north');
  });

  it('opens it exactly once, so Back is not swallowed by an immediate re-open', async () => {
    // The filters are still complete after Back, so the condition that
    // opened the calendar is still true. Without guarding, the screen would
    // push straight back in and the user could never leave.
    const { rerender } = renderScreen(<CalendarListScreen kind="crop" />);
    await screen.findByText('Season *');

    choose('Season *', 'Select season', 'Major Season');
    choose('Crop type *', 'Select crop', 'Tomato');
    choose('Region *', 'Select region', 'Ashanti Region');
    choose('District *', 'Select district', 'Adansi North');

    expect(router.push).toHaveBeenCalledTimes(1);

    // Coming back re-renders this screen with the filters untouched. The
    // effect must not fire again.
    rerender(wrap(<CalendarListScreen kind="crop" />));

    expect(router.push).toHaveBeenCalledTimes(1);
  });

  it('opens it again if the filters are changed and re-completed', async () => {
    // The guard must remember one specific calendar, not disable itself —
    // picking a different district and coming back should still work.
    renderScreen(<CalendarListScreen kind="crop" />);
    await screen.findByText('Season *');

    choose('Season *', 'Select season', 'Major Season');
    choose('Crop type *', 'Select crop', 'Tomato');
    choose('Region *', 'Select region', 'Ashanti Region');
    choose('District *', 'Select district', 'Adansi North');
    expect(router.push).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByLabelText('District *: Adansi North'));
    // The name now appears twice — on the closed trigger and in the open
    // menu. The menu option is the later of the two.
    const options = screen.getAllByText('Adansi North');
    fireEvent.press(options[options.length - 1]);

    expect(router.push).toHaveBeenCalledTimes(2);
  });

  it('still lists results when more than one calendar matches', async () => {
    // Two poultry calendars share a district; with no bird chosen there is
    // a genuine choice to make, so the list stays.
    renderScreen(<CalendarListScreen kind="poultry" />);
    await screen.findByText('Bird type *');

    choose('Region *', 'Select region', 'Greater Accra Region');
    choose('District *', 'Select district', 'Accra Metropolitan');

    expect(router.push).not.toHaveBeenCalled();
  });
});

describe('CalendarDetailScreen', () => {
  beforeEach(() => {
    queryClient.clear();
    jest.clearAllMocks();
  });

  it('renders every activity of the real Tomato calendar', async () => {
    renderScreen(<CalendarDetailScreen id="sample-tomato-adansi-north" />);

    expect(await screen.findByText('Tomato Calendar')).toBeTruthy();
    expect(screen.getAllByText('nursing').length).toBeGreaterThan(0);
    expect(screen.getAllByText('pest and disease management').length).toBeGreaterThan(0);
    expect(screen.getAllByText('post-harvest handling').length).toBeGreaterThan(0);
  });

  it('speaks every week range, so the grid is never colour-alone', async () => {
    renderScreen(<CalendarDetailScreen id="sample-tomato-adansi-north" />);
    await screen.findByText('Tomato Calendar');

    // The bars carry no text of their own at narrow widths, so the row's
    // accessible name is what has to hold the facts. "nursing" runs weeks
    // 4-6; "pest and disease management" weeks 4-17.
    expect(screen.getByLabelText('nursing. weeks 4 to 6 of 28.')).toBeTruthy();
    expect(screen.getByLabelText('pest and disease management. weeks 4 to 17 of 28.')).toBeTruthy();
    expect(screen.getByLabelText('transplanting. week 7 of 28.')).toBeTruthy();
  });

  it('offers a timeline and a list, the list being the screen-reader path', async () => {
    renderScreen(<CalendarDetailScreen id="sample-tomato-adansi-north" />);
    await screen.findByText('Tomato Calendar');

    expect(screen.getByText('Timeline')).toBeTruthy();

    fireEvent.press(screen.getByText('List'));
    expect(screen.getByText('Weeks 4–6')).toBeTruthy();
  });

  it('opens an activity with its full name and duration', async () => {
    renderScreen(<CalendarDetailScreen id="sample-tomato-adansi-north" />);
    await screen.findByText('Tomato Calendar');

    // The grid truncates this one; the sheet is where it is readable.
    fireEvent.press(screen.getByLabelText(/earthening-up.*week 9 of 28/i));

    expect(screen.getByText('Week 9')).toBeTruthy();
    expect(screen.getByText('1 week')).toBeTruthy();
  });

  it('does not present week numbers as dates when the calendar has no anchor', async () => {
    // The real Tomato row has year: null, so there is no date to show and
    // inventing one would tell a farmer to plant on the wrong day.
    renderScreen(<CalendarDetailScreen id="sample-tomato-adansi-north" />);
    await screen.findByText('Tomato Calendar');

    expect(screen.getByText(/counted from the start of the cycle/)).toBeTruthy();
  });

  it('renders the maize schedule as the printed calendar does', async () => {
    renderScreen(<CalendarDetailScreen id="sample-maize-ejura" />);
    await screen.findByText('Maize Calendar');

    // The published calendar's ten rows, including the two harvest blocks.
    expect(screen.getAllByText('Site Selection').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Sowing / Planting').length).toBeGreaterThan(0);
    expect(screen.getAllByText('1st Fertilizer Application (NPK)').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Post-harvest Handling').length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText(/^Harvesting\./)).toHaveLength(1);
  });

  it('labels the months across the season, like the desktop header', async () => {
    renderScreen(<CalendarDetailScreen id="sample-maize-ejura" />);
    await screen.findByText('Maize Calendar');

    // 34 weeks from the first week of January run into August, so the
    // merged month band has to span the whole season rather than restart.
    for (const month of ['Jan', 'Mar', 'Jun', 'Aug']) {
      expect(screen.getAllByText(month).length).toBeGreaterThan(0);
    }
  });

  it('shows week numbers and day ranges, as the printed calendar does', async () => {
    renderScreen(<CalendarDetailScreen id="sample-maize-ejura" />);
    await screen.findByText('Maize Calendar');

    // Always present now — there is no compressed view left that has to
    // drop them for want of room.
    expect(screen.getByText('Stage of activity')).toBeTruthy();
    expect(screen.getAllByText(/^\d{2}-\d{2}$/).length).toBeGreaterThan(10);
  });

  it('shows one harvest row covering the whole window', async () => {
    renderScreen(<CalendarDetailScreen id="sample-maize-ejura" />);
    await screen.findByText('Maize Calendar');

    // The workbook splits it across two rows; the app joins them, so no
    // row needs a week-span qualifier to be told from its twin.
    // Anchored to a date, so the spoken label carries real dates too.
    expect(screen.getByLabelText(/^Harvesting\. weeks 27 to 31 of 34\./)).toBeTruthy();
    expect(screen.queryByText('W27–29')).toBeNull();
    expect(screen.queryByText('W30–31')).toBeNull();
  });

  it('does not date a calendar that carries no anchor', async () => {
    // The live Tomato row has no season start month, so week numbers stay
    // relative rather than being dressed up as dates.
    renderScreen(<CalendarDetailScreen id="sample-tomato-adansi-north" />);
    await screen.findByText('Tomato Calendar');

    expect(screen.queryByText(/^\d{2}-\d{2}$/)).toBeNull();
  });

  it('labels sample data rather than passing it off as live', async () => {
    renderScreen(<CalendarDetailScreen id="sample-broiler-cycle" />);

    expect(await screen.findByText('Broiler Production Cycle')).toBeTruthy();
    expect(screen.getByText('Mock data')).toBeTruthy();
  });
});

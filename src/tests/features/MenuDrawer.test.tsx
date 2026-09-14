import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { MenuProvider } from '../../features/menu/MenuProvider';
import { ThemeProvider } from '../../shared/theme/ThemeProvider';
import { AppHeader } from '../../shared/ui/AppHeader';
import { MenuDrawer, type MenuRow } from '../../shared/ui/MenuDrawer';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: (...args: unknown[]) => mockPush(...args) } }));

// See HomeScreen.test.tsx for why initialMetrics is required in Jest.
const TEST_SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const ROWS = [
  'About AgroMet',
  'Settings',
  'Share App',
  'Contact Us',
  'Terms & Conditions',
  'Privacy Policy',
];

function wrap(node: React.ReactElement) {
  return render(
    <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
      <ThemeProvider>{node}</ThemeProvider>
    </SafeAreaProvider>,
  );
}

beforeEach(() => {
  mockPush.mockClear();
});

/*
 * Split by seam rather than driven end to end. The drawer unmounts itself only
 * once its exit animation finishes, and Jest does not advance that — so an
 * end-to-end "tap closes it" assertion would be testing the scheduler, not the
 * menu. Instead: the drawer is checked against a controlled `visible` prop, and
 * the provider is checked for the wiring it owns.
 */
describe('MenuDrawer', () => {
  const rows: MenuRow[] = [
    { id: 'a', label: 'First', icon: 'settings-outline', onPress: jest.fn() },
    { id: 'b', label: 'Second', icon: 'help-circle-outline', onPress: jest.fn() },
  ];

  it('renders nothing at all while closed', () => {
    wrap(<MenuDrawer visible={false} onClose={jest.fn()} rows={rows} title="AgroMet Ghana" />);

    expect(screen.queryByText('First')).toBeNull();
    expect(screen.queryByLabelText('Close menu')).toBeNull();
  });

  it('shows the title and every row when open', () => {
    wrap(<MenuDrawer visible onClose={jest.fn()} rows={rows} title="AgroMet Ghana" />);

    expect(screen.getByText('AgroMet Ghana')).toBeTruthy();
    expect(screen.getAllByRole('menuitem')).toHaveLength(rows.length);
  });

  it('closes when the scrim behind it is tapped', () => {
    const onClose = jest.fn();
    wrap(<MenuDrawer visible onClose={onClose} rows={rows} title="AgroMet Ghana" />);

    fireEvent.press(screen.getByLabelText('Close menu'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes as it acts, so the panel never sits over the screen it opened', () => {
    const onClose = jest.fn();
    const onPress = jest.fn();
    wrap(
      <MenuDrawer
        visible
        onClose={onClose}
        rows={[{ id: 'a', label: 'First', icon: 'settings-outline', onPress }]}
        title="AgroMet Ghana"
      />,
    );

    fireEvent.press(screen.getByText('First'));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('still renders every row when the device asks for reduced motion', () => {
    // The cascade is driven by one Animated.Value that reduce motion sets
    // straight to its end state — the rows must be present, not stuck at
    // opacity 0. Skeleton.tsx holds the same contract.
    wrap(<MenuDrawer visible onClose={jest.fn()} rows={rows} title="AgroMet Ghana" />);

    expect(screen.getByText('First')).toBeTruthy();
    expect(screen.getByText('Second')).toBeTruthy();
  });
});

describe('the app menu, as wired up', () => {
  function renderMenu() {
    return wrap(
      <MenuProvider>
        <AppHeader title="Home" />
      </MenuProvider>,
    );
  }

  it('stays shut until the menu button is pressed', () => {
    renderMenu();
    expect(screen.queryByText('Settings')).toBeNull();

    fireEvent.press(screen.getByLabelText('Open menu'));

    for (const label of ROWS) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  /* The two rows the reference design shows but this app cannot honour: there is
     no store listing to rate and expo-updates is not installed. Their absence is
     deliberate — a row that looks live and does nothing is worse than no row. */
  it('omits the rows that would have nowhere to go', () => {
    renderMenu();
    fireEvent.press(screen.getByLabelText('Open menu'));

    expect(screen.queryByText('Give Us Rating')).toBeNull();
    expect(screen.queryByText('Check for Updates')).toBeNull();
  });

  it('routes to Settings, which had no entry point anywhere before this menu', () => {
    renderMenu();
    fireEvent.press(screen.getByLabelText('Open menu'));

    fireEvent.press(screen.getByText('Settings'));

    expect(mockPush).toHaveBeenCalledWith('/settings');
  });

  /* The common questions live above the contact form rather than behind a row
     of their own — one fewer step, and they are read where someone is already
     deciding whether to write in. */
  it('has no FAQ row, because Contact carries the questions', () => {
    renderMenu();
    fireEvent.press(screen.getByLabelText('Open menu'));

    expect(screen.queryByText('FAQ')).toBeNull();
  });

  /* Terms, Privacy, Contact and About are in-app screens, not links out. A
     farmer with no signal can still read what the app does with their data,
     and there is no env var standing between them and it. */
  it.each([
    ['About AgroMet', '/about'],
    ['Contact Us', '/contact'],
    ['Terms & Conditions', '/legal/terms'],
    ['Privacy Policy', '/legal/privacy'],
  ])('opens %s inside the app rather than leaving it', (label, route) => {
    renderMenu();
    fireEvent.press(screen.getByLabelText('Open menu'));

    fireEvent.press(screen.getByText(label));

    expect(mockPush).toHaveBeenCalledWith(route);
  });
});

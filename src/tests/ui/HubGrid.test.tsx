import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Drop, Leaf } from 'phosphor-react-native';
import { router } from 'expo-router';

import { HubGrid, HubTile } from '../../shared/ui/HubGrid';
import { ThemeProvider } from '../../shared/theme/ThemeProvider';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

function renderGrid(node: React.ReactElement) {
  return render(<ThemeProvider>{node}</ThemeProvider>);
}

describe('HubGrid', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows each tile by name, with its live figure', () => {
    renderGrid(
      <HubGrid>
        <HubTile icon={Leaf} title="Crop advisory" actionLabel="Open crop advisory" route="/advisory/crop" />
        <HubTile
          icon={Drop}
          title="Flood & drought"
          hint="5 on flood alert · 0 in drought stress"
          actionLabel="Open flood & drought"
          route="/flood-drought"
        />
      </HubGrid>,
    );

    expect(screen.getByText('Crop advisory')).toBeTruthy();
    expect(screen.getByText('Flood & drought')).toBeTruthy();
    expect(screen.getByText('5 on flood alert · 0 in drought stress')).toBeTruthy();
  });

  /* The whole tile is one button, and its "Take a look ›" link is decorative
     — every tile's reads the same, so the only thing telling a screen reader
     which one it is, and the only thing telling these tests apart, is the
     tile's own accessibility label. */
  it('is one button per tile, named for a screen reader, routing where it says', () => {
    renderGrid(
      <HubGrid>
        <HubTile icon={Leaf} title="Crop advisory" actionLabel="Open crop advisory" route="/advisory/crop" />
        <HubTile icon={Drop} title="Flood & drought" actionLabel="Open flood & drought" route="/flood-drought" />
      </HubGrid>,
    );

    // Two buttons, not four: the decorative link inside each tile must not
    // announce itself on top of the tile that contains it.
    expect(screen.getAllByRole('button')).toHaveLength(2);
    expect(screen.queryByText('Take a look')).toBeNull();

    fireEvent.press(screen.getByLabelText('Open crop advisory'));
    expect(router.push).toHaveBeenCalledWith('/advisory/crop');

    fireEvent.press(screen.getByLabelText('Open flood & drought'));
    expect(router.push).toHaveBeenCalledWith('/flood-drought');
  });

  it('hides the attention badge at zero and shows it above', () => {
    const { rerender } = renderGrid(
      <HubGrid>
        <HubTile icon={Leaf} title="Farm reminders" actionLabel="Open reminders" route="/reminders" badge={0} />
      </HubGrid>,
    );

    expect(screen.queryByLabelText(/needing attention/)).toBeNull();

    rerender(
      <ThemeProvider>
        <HubGrid>
          <HubTile icon={Leaf} title="Farm reminders" actionLabel="Open reminders" route="/reminders" badge={3} />
        </HubGrid>
      </ThemeProvider>,
    );

    expect(screen.getByLabelText('3 needing attention')).toBeTruthy();
  });
});

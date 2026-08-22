import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { RegionRiskRow } from '../../features/advisories/flood-drought/components/RegionRiskRow';
import type { HazardRegion } from '../../shared/domain/hazard';
import { spacing } from '../../shared/theme/tokens';
import { ThemeProvider } from '../../shared/theme/ThemeProvider';

function region(name: string, band: string, drivers: HazardRegion['flood']['drivers'] = []): HazardRegion {
  const block = { score: 69, band, drivers, advisories: [], overridden: false, source: 'open-meteo' };
  return {
    region: name,
    agroZone: 'Deciduous Forest',
    centroid: [6.2, -0.48],
    riverPoint: [6.38, 0.07],
    riverine: true,
    flood: block,
    drought: { ...block, band: 'normal', score: 6 },
    dominant: 'flood',
  } as unknown as HazardRegion;
}

const DISCHARGE = [
  {
    key: 'discharge',
    label: 'River discharge',
    value: 5128,
    unit: 'm3/s',
    score: 80,
    weight: 0.4,
    percentile: 89,
    gloss: 'Higher than 89% of daily flows on this reach since 1995',
  },
];

function renderRow(node: React.ReactElement) {
  return render(<ThemeProvider>{node}</ThemeProvider>);
}

/**
 * The style of the View that actually carries the row's chrome.
 *
 * Deliberately NOT the Pressable's own style. Styling a Pressable directly
 * leaves padding, borders and flex direction unrendered on Android while the
 * text still draws (see shared/ui/Button.tsx), and react-test-renderer resolves
 * it anyway — so asserting on the Pressable passes while the device shows a
 * collapsed vertical stack. Reading the nested View is what makes these
 * assertions mean something.
 */
function rowStyle() {
  const chrome = screen.getByRole('button').children[0];
  if (typeof chrome === 'string') throw new Error('row chrome View not found');
  const flat = chrome.props.style;
  return Array.isArray(flat) ? Object.assign({}, ...flat) : flat;
}

describe('RegionRiskRow', () => {
  /* The bug this row shipped with: the chrome was on the Pressable, so on
     Android the whole style was dropped and the row collapsed into an
     unpadded vertical stack with no divider. If flexDirection is missing from
     the nested View, that has regressed. */
  it('puts its layout on a nested View so Android renders it', () => {
    renderRow(<RegionRiskRow region={region('Eastern', 'severe', DISCHARGE)} hazard="flood" first onPress={() => {}} />);

    expect(rowStyle().flexDirection).toBe('row');
    expect(rowStyle().alignItems).toBe('center');
  });

  /* Pinned because it has been reported twice as "too close to the card edge".
     The row owns all the horizontal padding — the card sets it to zero so the
     dividers span full width — so if this value is wrong nothing else
     compensates, and the severity rule ends up against the border. */
  it('keeps its content well clear of the card edge', () => {
    renderRow(<RegionRiskRow region={region('Eastern', 'severe', DISCHARGE)} hazard="flood" first onPress={() => {}} />);

    expect(rowStyle().paddingHorizontal).toBe(spacing['2xl']);
  });

  it('gives a full row more vertical room than a compact one', () => {
    renderRow(<RegionRiskRow region={region('Eastern', 'severe', DISCHARGE)} hazard="flood" first onPress={() => {}} />);
    const full = rowStyle().paddingVertical;

    screen.unmount();

    renderRow(
      <RegionRiskRow region={region('Ahafo', 'normal')} hazard="flood" first onPress={() => {}} compact />,
    );
    expect(rowStyle().paddingVertical).toBeLessThan(full);
  });

  it('meets the minimum touch target', () => {
    renderRow(<RegionRiskRow region={region('Eastern', 'severe', DISCHARGE)} hazard="flood" first onPress={() => {}} />);

    expect(rowStyle().minHeight).toBeGreaterThanOrEqual(44);
  });

  /* Matching the desktop row: the score is the right-hand anchor, with its
     unit stacked beneath so the number itself stays large. */
  it('shows the score against its unit', () => {
    renderRow(<RegionRiskRow region={region('Eastern', 'severe', DISCHARGE)} hazard="flood" first onPress={() => {}} />);

    expect(screen.getByText('69')).toBeTruthy();
    expect(screen.getByText('OF 100')).toBeTruthy();
  });

  it('identifies the region by band and agro-zone', () => {
    renderRow(<RegionRiskRow region={region('Eastern', 'severe', DISCHARGE)} hazard="flood" first onPress={() => {}} />);

    expect(screen.getByText(/Deciduous Forest/)).toBeTruthy();
  });

  /* Every row but the first carries a divider, and it spans the full card
     width because the card contributes no horizontal padding of its own.
     Without these the list read as one undivided wall. */
  it('separates rows with a divider, except the first', () => {
    renderRow(<RegionRiskRow region={region('Eastern', 'severe', DISCHARGE)} hazard="flood" first onPress={() => {}} />);
    expect(rowStyle().borderTopWidth).toBe(0);

    screen.unmount();

    renderRow(
      <RegionRiskRow region={region('Volta', 'severe', DISCHARGE)} hazard="flood" first={false} onPress={() => {}} />,
    );
    expect(rowStyle().borderTopWidth).toBe(1);
    expect(rowStyle().borderTopColor).toBeTruthy();
  });

  /* Severity is carried by the rule, the band word and the meter — never by
     colour alone. */
  it('names the band in text, not only in colour', () => {
    renderRow(<RegionRiskRow region={region('Eastern', 'severe', DISCHARGE)} hazard="flood" first onPress={() => {}} />);

    expect(screen.getByText('Severe')).toBeTruthy();
  });
});

import React from 'react';
import { Text as RNText } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import { AsyncStateView } from '../../shared/ui/AsyncStateView';
import { Skeleton, SkeletonScreen } from '../../shared/ui/Skeleton';
import { MarketGridSkeleton } from '../../features/market/components/MarketSkeletons';
import { ThemeProvider } from '../../shared/theme/ThemeProvider';

function renderWithTheme(node: React.ReactElement) {
  return render(<ThemeProvider>{node}</ThemeProvider>);
}

describe('Skeleton', () => {
  it('announces one "Loading" for the whole placeholder, not one per block', () => {
    renderWithTheme(
      <SkeletonScreen>
        <Skeleton width={100} height={12} />
        <Skeleton width={80} height={12} />
        <Skeleton width={60} height={12} />
      </SkeletonScreen>,
    );

    // Three blocks, one announcement — the blocks themselves are hidden from
    // assistive tech so they don't read out as meaningless items.
    expect(screen.getAllByLabelText('Loading')).toHaveLength(1);
  });
});

describe('AsyncStateView', () => {
  it('shows the skeleton instead of the spinner while pending, when given one', () => {
    renderWithTheme(
      <AsyncStateView status="pending" skeleton={<SkeletonScreen><Skeleton /></SkeletonScreen>}>
        <RNText>Loaded content</RNText>
      </AsyncStateView>,
    );

    expect(screen.getByLabelText('Loading')).toBeTruthy();
    expect(screen.queryByText('Loaded content')).toBeNull();
  });

  /* Every screen that hasn't opted in must keep the spinner it had before —
     the skeleton slot is additive, not a behaviour change. */
  it('still falls back to the spinner when no skeleton is passed', () => {
    renderWithTheme(
      <AsyncStateView status="pending">
        <RNText>Loaded content</RNText>
      </AsyncStateView>,
    );

    expect(screen.getByLabelText('Loading')).toBeTruthy();
    expect(screen.queryByText('Loaded content')).toBeNull();
  });

  it('renders the real content once the query succeeds', () => {
    renderWithTheme(
      <AsyncStateView status="success" skeleton={<SkeletonScreen><Skeleton /></SkeletonScreen>}>
        <RNText>Loaded content</RNText>
      </AsyncStateView>,
    );

    expect(screen.getByText('Loaded content')).toBeTruthy();
    expect(screen.queryByLabelText('Loading')).toBeNull();
  });
});

describe('MarketGridSkeleton', () => {
  /* The placeholder card has to reserve the same box the real card fills, or
     the grid jumps the moment prices arrive. */
  it('reserves the same 4:3 photograph box the real card uses', () => {
    const tree = renderWithTheme(<MarketGridSkeleton cardWidth={160} rows={1} />);

    // Walk the rendered styles looking for the image placeholder: 160 * 0.75
    // is the same arithmetic CommodityCard applies to its own photograph.
    const heights: number[] = [];
    const widths: number[] = [];
    const visit = (node: unknown): void => {
      if (!node || typeof node !== 'object') return;
      const element = node as { props?: Record<string, unknown>; children?: unknown[] };
      const style = element.props?.style;
      for (const entry of Array.isArray(style) ? style : [style]) {
        if (entry && typeof entry === 'object') {
          const box = entry as { width?: unknown; height?: unknown };
          if (typeof box.height === 'number') heights.push(box.height);
          if (typeof box.width === 'number') widths.push(box.width);
        }
      }
      element.children?.forEach(visit);
    };
    visit(tree.toJSON());

    expect(widths).toContain(160);
    expect(heights).toContain(120);
  });
});

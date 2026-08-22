import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { CommodityDetailScreen } from '../../features/market/CommodityDetailScreen';
import { MarketScreen } from '../../features/market/MarketScreen';
import { queryClient } from '../../shared/api/queryClient';
import { useCartStore } from '../../shared/state/cartStore';
import { useMarketRegionStore } from '../../shared/state/marketRegionStore';
import { ThemeProvider } from '../../shared/theme/ThemeProvider';

jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));

// Reject every request, so these tests exercise the offline path against the
// seeded copy deterministically rather than depending on a running backend.
const mockFetch = jest.fn(() => Promise.reject(new TypeError('Network request failed')));
globalThis.fetch = mockFetch as unknown as typeof fetch;

// The first render in this file pulls in the whole market feature plus the
// eighteen bundled commodity images, which comfortably outruns Jest's 5s
// default on a cold module registry. Everything after it is fast.
jest.setTimeout(30_000);

const TEST_SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 360, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

/** The real provider order, from app/_layout.tsx. */
function renderScreen(node: React.ReactElement) {
  return render(
    <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>{node}</QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

beforeEach(() => {
  queryClient.clear();
  jest.clearAllMocks();
  useCartStore.setState({ items: [] });
  useMarketRegionStore.setState({ region: '' });
});

describe('MarketScreen', () => {
  it('lists the catalogue with prices even with no network', async () => {
    renderScreen(<MarketScreen />);

    expect(await screen.findByText('Yellow Maize')).toBeTruthy();
    expect(screen.getByText('GH₵299.99')).toBeTruthy();
    expect(screen.getByText('18 commodities')).toBeTruthy();
  });

  it('opens a commodity page when a card is pressed', async () => {
    renderScreen(<MarketScreen />);
    await screen.findByText('Yellow Maize');

    fireEvent.press(screen.getByLabelText('Yellow Maize, GH₵299.99'));

    expect(router.push).toHaveBeenCalledWith('/commodity/yellow-maize');
  });

  it('opens the quick view without leaving the list', async () => {
    renderScreen(<MarketScreen />);
    await screen.findByText('Yellow Maize');

    fireEvent.press(screen.getByLabelText('Quick view of Yellow Maize prices'));

    expect(await screen.findByText('6-month change')).toBeTruthy();
    expect(screen.getByText('Full analysis')).toBeTruthy();
    // The quick view is a glance — the seasonal calendar belongs on the page.
    expect(screen.queryByText('Peak months')).toBeNull();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('adds to the cart from the quick view', async () => {
    renderScreen(<MarketScreen />);
    await screen.findByText('Yellow Maize');

    fireEvent.press(screen.getByLabelText('Quick view of Yellow Maize prices'));
    fireEvent.press(await screen.findByText('Add to cart'));

    await waitFor(() => expect(useCartStore.getState().items).toHaveLength(1));
    expect(useCartStore.getState().items[0]).toMatchObject({ slug: 'yellow-maize', price: 299.99, qty: 1 });
  });

  it('gives each pepper variety its own page rather than one shared price slug', async () => {
    renderScreen(<MarketScreen />);
    await screen.findByText('Black Cobra Pepper');

    fireEvent.press(screen.getByLabelText('Anaheim Pepper, GH₵59.99'));

    expect(router.push).toHaveBeenCalledWith('/commodity/anaheim-pepper');
  });
});

describe('CommodityDetailScreen', () => {
  it('shows the deep-dive the quick view withholds', async () => {
    renderScreen(<CommodityDetailScreen slug="yellow-maize" />);

    expect(await screen.findByText('Yellow Maize')).toBeTruthy();
    expect(screen.getByText('6-month price trend')).toBeTruthy();
    expect(screen.getByText('Peak months')).toBeTruthy();
    expect(screen.getByText('Price by market centre')).toBeTruthy();
    // All four centres, not just the selected one.
    expect(screen.getByText('Greater Accra')).toBeTruthy();
    expect(screen.getByText('Northern')).toBeTruthy();
  });

  it('reprices against a market centre when one is chosen', async () => {
    renderScreen(<CommodityDetailScreen slug="yellow-maize" />);
    await screen.findByText('Price by market centre');

    fireEvent.press(screen.getByLabelText('Greater Accra, GH₵329.99'));

    await waitFor(() => expect(useMarketRegionStore.getState().region).toBe('Greater Accra'));
  });

  it('prices poultry varieties, which the web market could not', async () => {
    renderScreen(<CommodityDetailScreen slug="dressed-chicken" />);

    expect(await screen.findByText('Dressed Chicken')).toBeTruthy();
    // The price shows twice — as the headline and as the single-unit line
    // total — so this asserts it is priced at all, not how often it is shown.
    expect(screen.getAllByText('GH₵45.00').length).toBeGreaterThan(0);
    expect(screen.queryByText('No price is published for this commodity yet.')).toBeNull();
  });

  it('says so plainly when the slug is not a commodity', () => {
    renderScreen(<CommodityDetailScreen slug="not-a-commodity" />);

    expect(screen.getByText('Unknown commodity')).toBeTruthy();
  });
});

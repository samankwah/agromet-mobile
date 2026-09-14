import type { MarketCenter, MarketTrend } from '../../shared/domain/market';
import {
  applyRegionPremium,
  formatCedi,
  formatMonths,
  getPriceChange,
  getRegionalPrices,
  getTimingSignal,
  resolveCommodity,
} from '../../shared/utils/marketInsights';
import { COMMODITY_CATALOGUE, catalogueEntryFor } from '../../shared/data/commodityCatalogue';
import { MOCK_COMMODITIES, MOCK_MARKET_CENTERS, MOCK_MARKET_TRENDS } from '../../shared/data/mockMarket';

const CENTERS: MarketCenter[] = MOCK_MARKET_CENTERS;

const MAIZE_TREND: MarketTrend = {
  commoditySlug: 'yellow-maize',
  monthPrices: [280, 285, 290, 295, 298, 299.99],
  seasonalPattern: 'test',
  peakMonths: [3, 4, 5],
  lowMonths: [7, 8, 9],
};

describe('getPriceChange', () => {
  it('reports the direction and size of a rise', () => {
    const change = getPriceChange(MAIZE_TREND.monthPrices)!;

    expect(change.direction).toBe('up');
    expect(change.delta).toBeCloseTo(19.99, 2);
    expect(change.high).toBe(299.99);
    expect(change.low).toBe(280);
  });

  it('reports a fall as a fall', () => {
    expect(getPriceChange([110, 102, 95, 90, 88, 89.99])!.direction).toBe('down');
  });

  it('says nothing rather than claiming no movement, when there is no series to read', () => {
    expect(getPriceChange(null)).toBeNull();
    expect(getPriceChange([250])).toBeNull();
  });
});

describe('getTimingSignal', () => {
  it('says sell in a peak month and hold in a trough month', () => {
    expect(getTimingSignal(MAIZE_TREND, 4).tone).toBe('sell');
    expect(getTimingSignal(MAIZE_TREND, 8).tone).toBe('hold');
  });

  it('falls back to watch for an ordinary month, or no seasonal history at all', () => {
    expect(getTimingSignal(MAIZE_TREND, 12).tone).toBe('watch');
    expect(getTimingSignal(null, 4).tone).toBe('watch');
  });
});

describe('regional pricing', () => {
  it('lists every market centre dearest first', () => {
    const rows = getRegionalPrices(299.99, CENTERS);

    expect(rows.map((row) => row.region)).toEqual(['Greater Accra', 'Ashanti', 'Western', 'Northern']);
    expect(rows[0].price).toBeCloseTo(329.99, 2);
    expect(rows[3].premiumPct).toBeCloseTo(-5, 5);
  });

  it('leaves the price alone when no region is selected', () => {
    expect(applyRegionPremium(299.99, CENTERS, '')).toBeCloseTo(299.99, 2);
    expect(applyRegionPremium(299.99, CENTERS, 'Northern')).toBeCloseTo(284.99, 2);
  });
});

describe('formatting', () => {
  it('always shows two decimals, and an em dash for no figure', () => {
    expect(formatCedi(299.99)).toBe('GH₵299.99');
    expect(formatCedi(45)).toBe('GH₵45.00');
    expect(formatCedi(undefined)).toBe('—');
  });

  it('turns month numbers into month names', () => {
    expect(formatMonths([12, 1, 2])).toBe('Dec, Jan, Feb');
    expect(formatMonths([])).toBe('—');
  });
});

describe('the catalogue', () => {
  it('gives every entry a unique route slug, including the pepper varieties', () => {
    const slugs = COMMODITY_CATALOGUE.map((entry) => entry.slug);

    expect(new Set(slugs).size).toBe(slugs.length);
    expect(catalogueEntryFor('black-cobra-pepper')!.commoditySlug).toBe('pepper');
    expect(catalogueEntryFor('anaheim-pepper')!.commoditySlug).toBe('pepper');
  });

  /* The web market shipped for months with fourteen of eighteen cards
     showing no sparkline and both chicken cards reading "Price unavailable".
     This is the assertion that stops the phone repeating it. */
  it('can price and chart every entry from the offline copy alone', () => {
    for (const entry of COMMODITY_CATALOGUE) {
      const resolved = resolveCommodity(entry, MOCK_COMMODITIES, MOCK_MARKET_TRENDS, MOCK_MARKET_CENTERS, '');

      expect(resolved.basePrice).not.toBeNull();
      expect(resolved.series).not.toBeNull();
      expect(resolved.change).not.toBeNull();
    }
  });

  it('prices a catalogue entry off its commodity slug, not its own', () => {
    const dressed = resolveCommodity(
      catalogueEntryFor('dressed-chicken')!,
      MOCK_COMMODITIES,
      MOCK_MARKET_TRENDS,
      MOCK_MARKET_CENTERS,
      'Greater Accra',
    );

    expect(dressed.market?.slug).toBe('poultry');
    expect(dressed.basePrice).toBe(45);
    expect(dressed.price).toBeCloseTo(49.5, 2);
  });
});

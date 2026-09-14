import type { HazardBlock, HazardRegion } from '../../shared/domain/hazard';
import {
  dominantDriver,
  driverSummary,
  rankRegions,
  regionsForDistricts,
  splitByAttention,
} from '../../features/advisories/flood-drought/hazardSelectors';

function block(band: string, score: number, drivers: HazardBlock['drivers'] = []): HazardBlock {
  return { score, band, drivers, advisories: [], overridden: false, source: 'open-meteo' } as HazardBlock;
}

function region(name: string, band: string, score: number, drivers: HazardBlock['drivers'] = []): HazardRegion {
  return {
    region: name,
    agroZone: 'Guinea Savannah',
    centroid: [9, -1],
    riverPoint: [9, -1],
    riverine: true,
    flood: block(band, score, drivers),
    drought: block('normal', 5),
    dominant: 'flood',
  } as HazardRegion;
}

const driver = (key: string, label: string, value: number, unit: string, score: number, weight: number) => ({
  key, label, value, unit, score, weight, percentile: null, gloss: '',
});

describe('rankRegions', () => {
  it('orders by band before score', () => {
    const ranked = rankRegions(
      [region('A', 'watch', 44), region('B', 'moderate', 45)],
      'flood',
    );
    expect(ranked.map((r) => r.region)).toEqual(['B', 'A']);
  });

  /* Without a stable tiebreak, equal-scoring rows swap places between refreshes
     and the list appears to shuffle for no reason a reader can see. */
  it('breaks ties on name so the order never shuffles between refreshes', () => {
    const ranked = rankRegions(
      [region('Volta', 'moderate', 52), region('Central', 'moderate', 52)],
      'flood',
    );
    expect(ranked.map((r) => r.region)).toEqual(['Central', 'Volta']);
  });

  it('does not mutate its input', () => {
    const input = [region('A', 'normal', 5), region('B', 'severe', 70)];
    rankRegions(input, 'flood');
    expect(input.map((r) => r.region)).toEqual(['A', 'B']);
  });
});

describe('splitByAttention', () => {
  it('puts moderate and above up front and leaves the rest folded away', () => {
    const { attention, rest } = splitByAttention(
      [
        region('Calm', 'normal', 10),
        region('Bad', 'severe', 70),
        region('Watching', 'watch', 30),
        region('Middling', 'moderate', 50),
      ],
      'flood',
    );
    expect(attention.map((r) => r.region)).toEqual(['Bad', 'Middling']);
    expect(rest.map((r) => r.region)).toEqual(['Watching', 'Calm']);
  });
});

describe('dominantDriver', () => {
  /* Dominance is score times weight. A term pinned at 100 can still be a minor
     contributor when it carries a tenth of the weight, and showing it as the
     reason would mislead. */
  it('weighs contribution, not raw score', () => {
    const chosen = dominantDriver(
      block('severe', 70, [
        driver('saturation', 'Soil saturation', 0.99, 'fraction', 100, 0.1), // 10
        driver('discharge', 'River discharge', 5127, 'm3/s', 80, 0.4), //        32
      ]),
    );
    expect(chosen?.key).toBe('discharge');
  });

  it('ignores drivers with no measurement', () => {
    const chosen = dominantDriver(
      block('watch', 30, [
        driver('rain7d', '7-day rainfall', null as unknown as number, 'mm', 100, 0.9),
        driver('rainMax1d', 'Heaviest forecast day', 28, 'mm', 50, 0.2),
      ]),
    );
    expect(chosen?.key).toBe('rainMax1d');
  });

  it('returns nothing when there is nothing measured', () => {
    expect(dominantDriver(block('unavailable', 0, []))).toBeNull();
    expect(driverSummary(block('unavailable', 0, []))).toBeNull();
  });
});

describe('driverSummary', () => {
  it('reads as a plain measurement', () => {
    const summary = driverSummary(
      block('severe', 70, [driver('rainMax1d', 'Heaviest forecast day', 28.4, 'mm', 90, 0.4)]),
    );
    expect(summary).toBe('Heaviest forecast day 28 mm');
  });

  /* "0.98 fraction" was the payload leaking onto the screen: `fraction` names
     the quantity's form, not a unit, and 0.98 of a thing is a percentage
     everywhere outside the JSON. */
  it('reads a fraction as the percentage it is', () => {
    const summary = driverSummary(
      block('watch', 30, [driver('saturation', 'Soil saturation', 0.98, 'fraction', 90, 0.4)]),
    );
    expect(summary).toBe('Soil saturation 98%');
  });

  it('writes cubic metres per second the way it is read', () => {
    const summary = driverSummary(
      block('severe', 70, [driver('discharge', 'River discharge', 6667.07, 'm3/s', 94, 0.4)]),
    );
    expect(summary).toBe('River discharge 6667 m³/s');
  });

  it('drops sigma, which is not a unit anyone reads', () => {
    const summary = driverSummary(
      block('watch', 30, [driver('spi90', 'Rainfall anomaly (SPI-90)', 1.32, 'sigma', 80, 0.4)]),
    );
    expect(summary).toBe('Rainfall anomaly (SPI-90) 1.32');
  });
});

describe('regionsForDistricts', () => {
  it('maps saved districts to their regions, worst first', () => {
    const entries = regionsForDistricts(
      [region('Northern', 'watch', 30), region('Upper East', 'severe', 70)],
      ['tamale-metropolitan', 'bolgatanga-municipal'],
      'flood',
    );
    expect(entries.map((e) => e.region.region)).toEqual(['Upper East', 'Northern']);
  });

  it('groups several saved districts under one region', () => {
    const entries = regionsForDistricts(
      [region('Northern', 'watch', 30)],
      ['tamale-metropolitan', 'yendi-municipal'],
      'flood',
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].districts).toEqual(['Tamale Metropolitan', 'Yendi Municipal']);
  });

  it('returns nothing when nothing is saved, so the caller can prompt', () => {
    expect(regionsForDistricts([region('Northern', 'watch', 30)], [], 'flood')).toEqual([]);
  });

  it('ignores unknown district ids', () => {
    expect(regionsForDistricts([region('Northern', 'watch', 30)], ['nope'], 'flood')).toEqual([]);
  });
});

import { buildSubseasonalCells, deterministicRange, selectionPlaceName } from '../../features/forecasts/subseasonal/cells';
import { GHANA_BOUNDARIES } from '../../shared/data/ghanaBoundaries';
import type { SubseasonalCell, SubseasonalVariable } from '../../shared/domain/subseasonalOutlook';
import { bandFor, paletteFor, RAINFALL_PALETTE, TEMPERATURE_PALETTE, TERCILE_BOUNDS } from '../../shared/utils/tercilePalette';

function variable(overrides: Partial<SubseasonalVariable> = {}): SubseasonalVariable {
  return {
    value: 68.9,
    members: 31,
    normal: 60,
    probabilities: { below: 0.1, normal: 0.2, above: 0.7 },
    category: 'above',
    confidence: 'high',
    noSignal: false,
    ...overrides,
  };
}

/** One model cell wide enough to cover the whole country, so a test does not
 * have to know which 0.5 degree cell a given display cell falls in. */
function blanketField(overrides: Partial<SubseasonalCell> = {}): SubseasonalCell[] {
  return [
    {
      id: '8.00,-1.00',
      lat: 8,
      lng: -1,
      rainfall: variable(),
      temperature: variable({ category: 'below', probabilities: { below: 0.8, normal: 0.15, above: 0.05 }, value: 31.4 }),
      ...overrides,
    },
  ];
}

/* Two grids are in play and conflating them is the trap. The display grid is 865
   cells at 0.15 degrees and already knows its admin units; the forecast is 165
   cells at 0.5 degrees. Each display cell takes the value of the model cell
   covering it, so the map fills without inventing anything. */
describe('buildSubseasonalCells', () => {
  it('paints the display grid from the model field', () => {
    const cells = buildSubseasonalCells(blanketField(), 'rainfall', 'probability', 'region');

    expect(cells.length).toBeGreaterThan(0);
    // One model cell covers everything here, so every display cell agrees —
    // which is exactly how a 55 km field should look drawn at 17 km.
    expect(new Set(cells.map((cell) => cell.value))).toEqual(new Set([4]));
  });

  it('draws nothing when the field is empty', () => {
    expect(buildSubseasonalCells([], 'rainfall', 'probability', 'region')).toEqual([]);
  });

  describe('geography', () => {
    it('requires a district in district view and only a region in region view', () => {
      const region = buildSubseasonalCells(blanketField(), 'rainfall', 'probability', 'region');
      const district = buildSubseasonalCells(blanketField(), 'rainfall', 'probability', 'district');

      expect(region.every((cell) => cell.regionName)).toBe(true);
      expect(district.every((cell) => cell.districtName)).toBe(true);
      // Some cells carry a region but no district, so district view draws fewer.
      expect(district.length).toBeLessThanOrEqual(region.length);
    });

    it('does not change the values, only which cells are drawn', () => {
      // The toggle clips the field to a different outline. It cannot make the
      // forecast finer, and a test is the place to hold that line.
      const region = buildSubseasonalCells(blanketField(), 'rainfall', 'probability', 'region');
      const district = buildSubseasonalCells(blanketField(), 'rainfall', 'probability', 'district');

      expect(new Set(district.map((cell) => cell.value))).toEqual(new Set(region.map((cell) => cell.value)));
    });
  });

  describe('view', () => {
    it('writes a band index for probability and the value itself for deterministic', () => {
      const probability = buildSubseasonalCells(blanketField(), 'rainfall', 'probability', 'region');
      const deterministic = buildSubseasonalCells(blanketField(), 'rainfall', 'deterministic', 'region');

      expect(probability[0].value).toBe(4);
      expect(deterministic[0].value).toBe(68.9);
    });

    it('still draws deterministically where no baseline exists', () => {
      // The ensemble mean needs no climatology. A cell whose bake failed must
      // not vanish from a map that can still say something true about it.
      const noBaseline = blanketField({
        rainfall: { value: 42, members: 31, normal: null },
      });

      expect(buildSubseasonalCells(noBaseline, 'rainfall', 'deterministic', 'region')[0].value).toBe(42);
      // ...but it has no split to colour, so probability view leaves it blank
      // rather than guessing at one.
      expect(buildSubseasonalCells(noBaseline, 'rainfall', 'probability', 'region')).toEqual([]);
    });
  });

  it('switches variable', () => {
    const rain = buildSubseasonalCells(blanketField(), 'rainfall', 'probability', 'region');
    const temp = buildSubseasonalCells(blanketField(), 'temperature', 'probability', 'region');

    expect(rain[0].value).toBe(4);
    expect(temp[0].value).toBe(0);
  });

  it('drops a variable the field does not carry', () => {
    expect(buildSubseasonalCells(blanketField({ temperature: null }), 'temperature', 'probability', 'region')).toEqual([]);
  });

  it('never draws a cell the boundary build could not place', () => {
    const cells = buildSubseasonalCells(blanketField(), 'rainfall', 'deterministic', 'region');
    const placeable = GHANA_BOUNDARIES.grid.filter((cell) => cell.regionName).length;

    expect(cells).toHaveLength(placeable);
    expect(cells.every((cell) => cell.regionName)).toBe(true);
  });
});

describe('deterministicRange', () => {
  it('spans the drawn values', () => {
    const cells = [
      { id: 1, lat: 0, lng: 0, regionName: null, districtName: null, value: 5 },
      { id: 2, lat: 0, lng: 0, regionName: null, districtName: null, value: 40 },
    ];
    expect(deterministicRange(cells)).toEqual({ min: 5, max: 40 });
  });

  it('gives an empty map a usable domain rather than NaN', () => {
    // Math.min of nothing is Infinity, which would blank the legend.
    expect(deterministicRange([])).toEqual({ min: 0, max: 1 });
  });
});

/* Depth carries strength, so the map can distinguish a forecast from a shrug.
   A three-way split floors at about 33%, so a sub-50% winner is barely a lean
   and must not be given a colour that implies a finding. */
describe('bandFor', () => {
  it('reads a decisive majority as the outer band', () => {
    expect(bandFor(variable({ category: 'above', probabilities: { below: 0.05, normal: 0.15, above: 0.8 } }))).toBe(4);
    expect(bandFor(variable({ category: 'below', probabilities: { below: 0.87, normal: 0.13, above: 0 } }))).toBe(0);
  });

  it('reads a working majority as the inner band', () => {
    expect(bandFor(variable({ category: 'above', probabilities: { below: 0.2, normal: 0.25, above: 0.55 } }))).toBe(3);
    expect(bandFor(variable({ category: 'below', probabilities: { below: 0.61, normal: 0.23, above: 0.16 } }))).toBe(1);
  });

  it('greys a lean too weak to act on', () => {
    expect(bandFor(variable({ category: 'below', probabilities: { below: 0.39, normal: 0.29, above: 0.32 } }))).toBe(2);
  });

  it('greys a dry season with no spread to measure', () => {
    expect(bandFor(variable({ noSignal: true, category: 'normal', probabilities: { below: 0, normal: 1, above: 0 } }))).toBe(2);
  });

  it('greys a cell with no baseline at all', () => {
    expect(bandFor({ value: 12, members: 31, normal: null })).toBe(2);
  });
});

describe('paletteFor', () => {
  /* Rainfall and temperature have different published conventions and a met
     reader knows both on sight. */
  it('gives each variable its own convention', () => {
    expect(paletteFor('rainfall')).toBe(RAINFALL_PALETTE);
    expect(paletteFor('temperature')).toBe(TEMPERATURE_PALETTE);
    expect(RAINFALL_PALETTE[0].color).not.toBe(TEMPERATURE_PALETTE[0].color);
  });

  it('runs dry to wet, and cool to warm', () => {
    expect(RAINFALL_PALETTE.map((entry) => entry.label)).toEqual(['Much drier', 'Drier', 'No signal', 'Wetter', 'Much wetter']);
    expect(TEMPERATURE_PALETTE.map((entry) => entry.label)).toEqual([
      'Much cooler',
      'Cooler',
      'No signal',
      'Warmer',
      'Much warmer',
    ]);
  });

  /* The key has to say where the bands cut, not only name them — a reader
     otherwise cannot tell a 51% lean from a 95% one. Derived from the same
     constants `bandFor` bins on, so the two cannot drift. */
  it('states each band as a share', () => {
    expect(RAINFALL_PALETTE.map((entry) => entry.sublabel)).toEqual(['70%+', '50%-70%', 'under 50%', '50%-70%', '70%+']);
    expect(TEMPERATURE_PALETTE.map((entry) => entry.sublabel)).toEqual(['70%+', '50%-70%', 'under 50%', '50%-70%', '70%+']);
  });

  it('shares one neutral middle, so no signal looks the same either way', () => {
    expect(RAINFALL_PALETTE[2].color).toBe(TEMPERATURE_PALETTE[2].color);
  });

  it('indexes both palettes the way the renderers key them', () => {
    expect(RAINFALL_PALETTE).toHaveLength(5);
    expect(TEMPERATURE_PALETTE).toHaveLength(5);
  });
});

/* The panel over the map has to name the same outline the map drew. */
describe('selectionPlaceName', () => {
  const tapped = { region: 'Ashanti', district: 'Ejura-Sekyedumase' };

  it('names the outline the map is actually drawing', () => {
    expect(selectionPlaceName(tapped, 'region')).toBe('Ashanti');
    expect(selectionPlaceName(tapped, 'district')).toBe('Ejura-Sekyedumase');
  });

  it('falls back to the name it has rather than to nothing', () => {
    // Coastal cells carry a region but no district. A coarser label beats an
    // unlabelled panel, which reads as a loading failure.
    expect(selectionPlaceName({ region: 'Greater Accra', district: null }, 'district')).toBe('Greater Accra');
    expect(selectionPlaceName({ region: null, district: 'Bongo' }, 'region')).toBe('Bongo');
  });

  it('still labels a cell that knows neither', () => {
    expect(selectionPlaceName({ region: null, district: null }, 'region')).toBe('Selected area');
  });
});

/* The stepped key labels boundaries, not blocks, so there is always one more
   number than there are colours. */
describe('TERCILE_BOUNDS', () => {
  it('gives every block two edges', () => {
    expect(TERCILE_BOUNDS).toHaveLength(RAINFALL_PALETTE.length + 1);
  });

  it('runs in from certainty to the neutral middle and back out', () => {
    expect(TERCILE_BOUNDS).toEqual(['100%', '70%', '50%', '50%', '70%', '100%']);
  });

  it('mirrors, because the colour carries direction and the number does not', () => {
    expect(TERCILE_BOUNDS).toEqual([...TERCILE_BOUNDS].reverse());
  });
});

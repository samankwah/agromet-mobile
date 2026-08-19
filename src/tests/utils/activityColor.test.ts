import { fallbackActivityColor, fitSwatchToScheme, parseHex, readableInkOn, relativeLuminance } from '../../shared/utils/activityColor';
import { classifyActivity, getActivityIcon } from '../../shared/utils/classifyActivity';

describe('parseHex', () => {
  it('accepts the forms spreadsheets produce', () => {
    expect(parseHex('#FF0000')).toEqual({ r: 255, g: 0, b: 0 });
    expect(parseHex('FF0000')).toEqual({ r: 255, g: 0, b: 0 });
    expect(parseHex('#f00')).toEqual({ r: 255, g: 0, b: 0 });
    expect(parseHex('  #4472C4 ')).toEqual({ r: 68, g: 114, b: 196 });
  });

  it('rejects anything else rather than rendering a broken colour', () => {
    expect(parseHex(null)).toBeNull();
    expect(parseHex('')).toBeNull();
    expect(parseHex('red')).toBeNull();
    expect(parseHex('#12345')).toBeNull();
    expect(parseHex('bg-[#FF0000]')).toBeNull(); // the web app's Tailwind form
  });
});

describe('relativeLuminance', () => {
  it('anchors at the extremes', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 5);
  });

  it('ranks the real palette as the eye does', () => {
    // #FFFF00 (yellow) is far brighter than #1F497D (navy), which is why
    // they need opposite ink.
    expect(relativeLuminance('#FFFF00')).toBeGreaterThan(relativeLuminance('#1F497D'));
  });
});

describe('readableInkOn', () => {
  it('picks dark ink on the bright fills and light ink on the dark ones', () => {
    expect(readableInkOn('#FFFF00', '#000000', '#FFFFFF')).toBe('#000000');
    expect(readableInkOn('#1F497D', '#000000', '#FFFFFF')).toBe('#FFFFFF');
    expect(readableInkOn('#000000', '#000000', '#FFFFFF')).toBe('#FFFFFF');
  });
});

describe('fitSwatchToScheme', () => {
  it('lifts a black fill in dark mode so the bar cannot vanish', () => {
    // #000000 is a real fill in the Tomato calendar ("transplanting"), and
    // the dark background is #111a18.
    const fitted = fitSwatchToScheme('#000000', 'dark', '#60d394');
    expect(relativeLuminance(fitted)).toBeGreaterThan(relativeLuminance('#111a18'));
  });

  it('drops a white fill in light mode for the same reason', () => {
    const fitted = fitSwatchToScheme('#FFFFFF', 'light', '#23785c');
    expect(relativeLuminance(fitted)).toBeLessThan(1);
  });

  it('leaves a usable colour alone — recognition matters more than polish', () => {
    expect(fitSwatchToScheme('#FF0000', 'light', '#000000')).toBe('#ff0000');
    expect(fitSwatchToScheme('#4472C4', 'dark', '#000000')).toBe('#4472c4');
  });

  it('falls back when there is no usable colour', () => {
    expect(fitSwatchToScheme(null, 'light', '#23785c')).toBe('#23785c');
    expect(fitSwatchToScheme('not-a-colour', 'dark', '#60d394')).toBe('#60d394');
  });
});

describe('classifyActivity', () => {
  it('reads the real crop calendar rows', () => {
    expect(classifyActivity('Site selection')).toBe('land');
    expect(classifyActivity('land preparation')).toBe('land');
    expect(classifyActivity('nursing')).toBe('planting');
    expect(classifyActivity('transplanting')).toBe('planting');
    expect(classifyActivity('1st fertilizer application (NPK)')).toBe('fertilizer');
    expect(classifyActivity('pest and disease management')).toBe('pest');
    expect(classifyActivity('harvesting')).toBe('harvest');
  });

  it('reads the real poultry rows', () => {
    expect(classifyActivity('1st Gumboro vaccine')).toBe('vaccination');
    expect(classifyActivity('2nd Newcastle (Lasota)')).toBe('vaccination');
    expect(classifyActivity('Brooder management')).toBe('brooding');
    expect(classifyActivity('Arrival of day-old chicks')).toBe('brooding');
    expect(classifyActivity('Feed (Starter Diet)')).toBe('feeding');
    expect(classifyActivity('Biosecurity measures')).toBe('biosecurity');
    expect(classifyActivity('Coccidiosis prevention')).toBe('pest');
  });

  it('distinguishes post-harvest handling from harvesting', () => {
    // Both contain "harvest"; they are different jobs weeks apart, and the
    // naive substring order would collapse them.
    expect(classifyActivity('harvesting')).toBe('harvest');
    expect(classifyActivity('post-harvest handling')).toBe('storage');
  });

  it('does not let a poultry harvest row shadow its bird-specific meaning', () => {
    expect(classifyActivity('Harvesting/live bird market')).toBe('harvest');
    expect(classifyActivity('Processing')).toBe('storage');
  });

  it('is case-insensitive and falls back rather than throwing', () => {
    expect(classifyActivity('HARVESTING')).toBe('harvest');
    expect(classifyActivity('earthening-up/staking/trellising/pruning')).toBe('general');
    expect(classifyActivity('')).toBe('general');
  });
});

describe('getActivityIcon', () => {
  it('gives every kind a distinct glyph, so the list view is not text-only', () => {
    const names = [
      'Site selection',
      'nursing',
      '1st fertilizer application (NPK)',
      'harvesting',
      '1st Gumboro vaccine',
      'Brooder management',
    ];
    const icons = names.map(getActivityIcon);

    expect(new Set(icons).size).toBe(names.length);
  });
});

describe('fallbackActivityColor', () => {
  it('colours by meaning when the spreadsheet supplied nothing', () => {
    expect(fallbackActivityColor('harvesting', '#000000')).toBe('#008000');
    expect(fallbackActivityColor('1st Gumboro vaccine', '#000000')).toBe('#FF6347');
  });

  it('uses the theme fallback for an unrecognised activity', () => {
    expect(fallbackActivityColor('earthening-up/staking', '#23785c')).toBe('#23785c');
  });
});

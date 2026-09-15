import { classifyCondition, isDaytime, type ConditionKind } from '../../shared/utils/classifyCondition';
import { glyphFromCondition, glyphFromWmo } from '../../shared/domain/weatherGlyph';
import { ALL_BACKDROPS, getWeatherBackdrop } from '../../shared/data/weatherBackdrops';

describe('classifyCondition', () => {
  it('classifies the conditions the mock data actually produces', () => {
    expect(classifyCondition('Thunderstorms likely')).toBe('thunderstorm');
    expect(classifyCondition('Heavy rain')).toBe('rain');
    expect(classifyCondition('Light rain')).toBe('rain');
    expect(classifyCondition('Scattered showers')).toBe('rain');
    expect(classifyCondition('Overcast')).toBe('overcast');
    expect(classifyCondition('Partly cloudy')).toBe('cloudy');
    expect(classifyCondition('Hazy sunshine')).toBe('cloudy');
    expect(classifyCondition('Sunny')).toBe('clear');
    expect(classifyCondition('Sunny, dry')).toBe('clear');
  });

  it('is case-insensitive and falls back rather than throwing', () => {
    expect(classifyCondition('HEAVY RAIN')).toBe('rain');
    expect(classifyCondition('something unrecognised')).toBe('cloudy');
  });

  it('treats rain as rain even when the word "sun" appears later', () => {
    // Ordering matters: "rain" must win over "sun" or a rainy day would
    // render a sunny backdrop.
    expect(classifyCondition('Rain, sun later')).toBe('rain');
  });
});

describe('isDaytime', () => {
  const at = (hour: number) => new Date(2026, 0, 15, hour, 0, 0).toISOString();

  it('treats 06:00-18:00 as daytime, which holds year-round at Ghana latitudes', () => {
    expect(isDaytime(at(6))).toBe(true);
    expect(isDaytime(at(12))).toBe(true);
    expect(isDaytime(at(17))).toBe(true);
  });

  it('treats early morning and evening as night', () => {
    expect(isDaytime(at(5))).toBe(false);
    expect(isDaytime(at(18))).toBe(false);
    expect(isDaytime(at(23))).toBe(false);
  });

  it('assumes day for an unreadable timestamp rather than showing a night sky', () => {
    expect(isDaytime('not-a-date')).toBe(true);
  });
});

describe('getWeatherBackdrop', () => {
  const noon = new Date(2026, 0, 15, 12).toISOString();
  const night = new Date(2026, 0, 15, 22).toISOString();

  it('shows a visibly different photo for clear vs rainy weather', () => {
    expect(getWeatherBackdrop('Sunny', noon)).not.toBe(getWeatherBackdrop('Heavy rain', noon));
  });

  it('uses one night photo regardless of condition', () => {
    expect(getWeatherBackdrop('Sunny', night)).toBe(getWeatherBackdrop('Heavy rain', night));
  });

  it('covers every condition kind without falling through to undefined', () => {
    for (const condition of ['Sunny', 'Partly cloudy', 'Overcast', 'Heavy rain', 'Thunderstorms likely', 'gibberish']) {
      expect(getWeatherBackdrop(condition, noon)?.source).toBeDefined();
    }
  });

  it('every backdrop carries the credit and licence its CC BY-SA terms require', () => {
    // Attribution is a legal obligation, not a nicety - if an image is ever
    // added without it, this fails rather than shipping uncredited.
    for (const backdrop of ALL_BACKDROPS) {
      expect(backdrop.credit).toMatch(/Wikimedia Commons/);
      expect(backdrop.licence).toMatch(/^CC /);
      expect(backdrop.place.length).toBeGreaterThan(0);
    }
  });
});

/**
 * The reason `classifyCondition` exists is that the icon and the photographic
 * backdrop must never disagree about what the weather is. The icon now reads a
 * WMO code where it has one, so this pins the two paths together: a code and
 * the string that code produces have to select the same picture, or the strip
 * can show a sun over a thunderstorm photograph.
 */
describe('the icon and the backdrop agree', () => {
  const cases: { code: number; condition: string; kind: ConditionKind }[] = [
    { code: 95, condition: 'Thunderstorms likely', kind: 'thunderstorm' },
    { code: 61, condition: 'Scattered showers', kind: 'rain' },
    { code: 3, condition: 'Overcast', kind: 'overcast' },
    { code: 1, condition: 'Partly cloudy', kind: 'cloudy' },
    { code: 0, condition: 'Sunny', kind: 'clear' },
  ];

  it('resolves the same glyph from the code and from its own condition string', () => {
    for (const { code, condition } of cases) {
      expect(glyphFromWmo(code)).toBe(glyphFromCondition(condition));
    }
  });

  it('classifies those same strings the way the backdrops expect', () => {
    for (const { condition, kind } of cases) {
      expect(classifyCondition(condition)).toBe(kind);
    }
  });
});

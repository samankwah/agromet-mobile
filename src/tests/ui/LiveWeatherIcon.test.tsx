import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { act, render } from '@testing-library/react-native';

import { glyphFromCondition, glyphFromWmo, hasNightForm } from '../../shared/domain/weatherGlyph';
import { ThemeProvider } from '../../shared/theme/ThemeProvider';
import { LiveWeatherIcon } from '../../shared/ui/weather/LiveWeatherIcon';

/* The mapping is the part worth pinning: it decides which picture a farmer
   sees for a given sky, and it is the one place the WMO codes are interpreted.
   The rendering tests below follow ui/DuotoneIcon.test.tsx's approach of
   walking the rendered tree, since there is no text to query for. */

describe('glyphFromWmo', () => {
  it('separates the rain intensities the condition string collapses', () => {
    // All four of these arrive as the single string "Scattered showers", which
    // is the loss this mapping exists to undo.
    expect(glyphFromWmo(53)).toBe('drizzle');
    expect(glyphFromWmo(63)).toBe('rain');
    expect(glyphFromWmo(65)).toBe('heavy-rain');
    expect(glyphFromWmo(81)).toBe('showers');
  });

  it('separates fog from overcast', () => {
    // Both are "Overcast" by the time the string is built.
    expect(glyphFromWmo(45)).toBe('fog');
    expect(glyphFromWmo(48)).toBe('fog');
    expect(glyphFromWmo(3)).toBe('overcast');
  });

  it('reads the cloud cover ladder', () => {
    expect(glyphFromWmo(0)).toBe('clear');
    expect(glyphFromWmo(1)).toBe('partly-cloudy');
    expect(glyphFromWmo(2)).toBe('cloudy');
  });

  it('shows snow as rain rather than drawing a snowflake', () => {
    // Ghana gets none, so a snowflake would only ever reach a user through a
    // mis-decoded code. Rain is the safer thing to be wrong with.
    expect(glyphFromWmo(73)).toBe('rain');
    expect(glyphFromWmo(86)).toBe('showers');
  });

  it('treats every thunderstorm code as a storm', () => {
    for (const code of [95, 96, 99]) {
      expect(glyphFromWmo(code)).toBe('thunderstorm');
    }
  });

  it('falls back to clear for a code it does not know', () => {
    expect(glyphFromWmo(-1)).toBe('clear');
    expect(glyphFromWmo(4)).toBe('clear');
  });
});

describe('glyphFromCondition', () => {
  it('still resolves every string the API can produce', () => {
    // The five-word vocabulary api/openMeteo.ts emits, plus its night forms.
    const strings = [
      'Sunny',
      'Partly cloudy',
      'Overcast',
      'Scattered showers',
      'Thunderstorms likely',
      'Clear night',
      'Partly cloudy night',
    ];
    for (const value of strings) {
      expect(glyphFromCondition(value)).toBeDefined();
    }
  });

  it('agrees with the code path on the unambiguous cases', () => {
    expect(glyphFromCondition('Thunderstorms likely')).toBe(glyphFromWmo(95));
    expect(glyphFromCondition('Overcast')).toBe(glyphFromWmo(3));
  });
});

describe('hasNightForm', () => {
  it('is true only where a moon would help', () => {
    expect(hasNightForm('clear')).toBe(true);
    expect(hasNightForm('partly-cloudy')).toBe(true);
  });

  it('is false for weather that looks the same after dark', () => {
    // Someone asking "is it raining at 2am" is not helped by a moon behind
    // the answer, which is the same line classifyCondition draws.
    for (const glyph of ['rain', 'thunderstorm', 'overcast', 'fog'] as const) {
      expect(hasNightForm(glyph)).toBe(false);
    }
  });
});

function renderIcon(props: React.ComponentProps<typeof LiveWeatherIcon>) {
  return render(
    <ThemeProvider>
      <LiveWeatherIcon {...props} />
    </ThemeProvider>,
  );
}

/** Every `d` attribute in the rendered tree, so a test can ask which shapes
 * were drawn without depending on the component's nesting. */
function pathData(node: unknown): string[] {
  const found: string[] = [];
  const walk = (current: any) => {
    if (!current || typeof current !== 'object') return;
    if (Array.isArray(current)) return current.forEach(walk);
    if (typeof current.props?.d === 'string') found.push(current.props.d);
    walk(current.children);
  };
  walk(node);
  return found;
}

/** Circles, which is how the sun is told apart from the moon: the sun has a
 * disc, the crescent is a single path. */
function circleCount(node: unknown): number {
  let count = 0;
  const walk = (current: any) => {
    if (!current || typeof current !== 'object') return;
    if (Array.isArray(current)) return current.forEach(walk);
    if (current.type === 'RNSVGCircle') count += 1;
    walk(current.children);
  };
  walk(node);
  return count;
}

describe('LiveWeatherIcon', () => {
  it('draws the sun by day and the moon by night for a clear sky', () => {
    const day = renderIcon({ weatherCode: 0, isDay: true, size: 24 });
    expect(circleCount(day.toJSON())).toBe(1); // the sun's disc

    const night = renderIcon({ weatherCode: 0, isDay: false, size: 24 });
    expect(circleCount(night.toJSON())).toBe(0);
    expect(pathData(night.toJSON()).length).toBeGreaterThan(0); // the crescent
  });

  it('ignores isDay for weather with no night form', () => {
    const day = renderIcon({ weatherCode: 63, isDay: true, size: 24 });
    const night = renderIcon({ weatherCode: 63, isDay: false, size: 24 });

    expect(pathData(night.toJSON())).toEqual(pathData(day.toJSON()));
  });

  it('draws more drops the heavier the rain', () => {
    const countDrops = (code: number) => {
      const tree = renderIcon({ weatherCode: code, size: 24 }).toJSON();
      let lines = 0;
      const walk = (current: any) => {
        if (!current || typeof current !== 'object') return;
        if (Array.isArray(current)) return current.forEach(walk);
        if (current.type === 'RNSVGLine') lines += 1;
        walk(current.children);
      };
      walk(tree);
      return lines;
    };

    expect(countDrops(53)).toBeLessThan(countDrops(63));
    expect(countDrops(63)).toBeLessThan(countDrops(65));
  });

  it('falls back to the condition string when no code is given', () => {
    const fromString = renderIcon({ condition: 'Thunderstorms likely', size: 24 });
    const fromCode = renderIcon({ weatherCode: 95, size: 24 });

    expect(pathData(fromString.toJSON())).toEqual(pathData(fromCode.toJSON()));
  });

  it('stays out of the accessibility tree', () => {
    // The condition is always written beside the icon, so announcing it here
    // would read the weather twice. Same contract as ui/DuotoneIcon.
    const tree = renderIcon({ weatherCode: 0, size: 24 }).toJSON() as any;
    expect(tree.props.accessibilityElementsHidden).toBe(true);
    expect(tree.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('still renders a legible icon when motion is switched off', async () => {
    (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValueOnce(true);

    const view = renderIcon({ weatherCode: 63, size: 24, animated: true });
    // The setting is read asynchronously; without letting that settle this
    // would pass on a component that ignores it entirely.
    await act(async () => {});

    // The rule the whole app follows: stop the motion, never hide the element.
    expect(pathData(view.toJSON()).length).toBeGreaterThan(0);
  });
});

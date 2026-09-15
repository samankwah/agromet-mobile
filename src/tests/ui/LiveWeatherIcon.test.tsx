import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { act, render } from '@testing-library/react-native';

import { glyphFromCondition, glyphFromWmo, hasNightForm } from '../../shared/domain/weatherGlyph';
import { ThemeProvider } from '../../shared/theme/ThemeProvider';
import { clayIcons, type ClayIconName } from '../../shared/ui/clay/clayIcons';
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

/**
 * The image the icon actually drew.
 *
 * Metro's jest transform turns a `require`d PNG into an opaque asset id, so the
 * only way to say *which* render appeared is to compare against the same entry
 * of `clayIcons`. That is a stronger check than it looks: it fails if the
 * registry is rewired as well as if the mapping is.
 */
function drawnIcon(node: unknown): unknown {
  let found: unknown;
  const walk = (current: any) => {
    if (found !== undefined || !current || typeof current !== 'object') return;
    if (Array.isArray(current)) return current.forEach(walk);
    if (current.props?.source !== undefined) {
      found = current.props.source;
      return;
    }
    walk(current.children);
  };
  walk(node);
  return found;
}

function expectIcon(props: React.ComponentProps<typeof LiveWeatherIcon>, name: ClayIconName) {
  expect(drawnIcon(renderIcon(props).toJSON())).toBe(clayIcons[name]);
}

describe('LiveWeatherIcon', () => {
  it('draws the sun by day and the moon by night for a clear sky', () => {
    expectIcon({ weatherCode: 0, isDay: true, size: 24 }, 'sun');
    expectIcon({ weatherCode: 0, isDay: false, size: 24 }, 'moon');
  });

  it('walks the cloud ladder as the WMO codes climb', () => {
    // The glyph names and the codes pull opposite ways here — `partly-cloudy`
    // is WMO 1, *mainly clear*, so it takes the smallest cloud of the three.
    expectIcon({ weatherCode: 1, size: 24 }, 'sun-small-cloud');
    expectIcon({ weatherCode: 2, size: 24 }, 'sun-cloud');
    expectIcon({ weatherCode: 3, size: 24 }, 'cloud');
  });

  it('gives rain, storms and fog their own renders', () => {
    expectIcon({ weatherCode: 63, size: 24 }, 'cloud-rain');
    expectIcon({ weatherCode: 95, size: 24 }, 'cloud-lightning-rain');
    expectIcon({ weatherCode: 45, size: 24 }, 'fog');
  });

  it('shows a lightly clouded night as cloud, never as sunshine', () => {
    // There is no moon-behind-cloud in the set. A plain cloud after dark is
    // incomplete; a sun behind a cloud at 2am would be wrong, and that is the
    // trade this asserts.
    expectIcon({ weatherCode: 1, isDay: false, size: 24 }, 'cloud');
  });

  it('ignores isDay for weather with no night form', () => {
    const day = drawnIcon(renderIcon({ weatherCode: 63, isDay: true, size: 24 }).toJSON());
    const night = drawnIcon(renderIcon({ weatherCode: 63, isDay: false, size: 24 }).toJSON());

    expect(night).toBe(day);
  });

  it('collapses the two pairs the set has no separate art for', () => {
    // Documented in LiveWeatherIcon's `iconFor`: a real cost, pinned here so it
    // stays a decision rather than drifting into a surprise. The WMO codes
    // still separate them everywhere upstream of the picture.
    const drizzle = drawnIcon(renderIcon({ weatherCode: 53, size: 24 }).toJSON());
    const showers = drawnIcon(renderIcon({ weatherCode: 81, size: 24 }).toJSON());
    expect(drizzle).toBe(showers);

    const rain = drawnIcon(renderIcon({ weatherCode: 63, size: 24 }).toJSON());
    const heavy = drawnIcon(renderIcon({ weatherCode: 65, size: 24 }).toJSON());
    expect(rain).toBe(heavy);
  });

  it('falls back to the condition string when no code is given', () => {
    const fromString = drawnIcon(renderIcon({ condition: 'Thunderstorms likely', size: 24 }).toJSON());
    const fromCode = drawnIcon(renderIcon({ weatherCode: 95, size: 24 }).toJSON());

    expect(fromString).toBe(fromCode);
  });

  it('stays out of the accessibility tree', () => {
    // The condition is always written beside the icon, so announcing it here
    // would read the weather twice. Same contract as ui/DuotoneIcon.
    const tree = renderIcon({ weatherCode: 0, size: 24 }).toJSON() as any;
    const walk = (current: any): any => {
      if (!current || typeof current !== 'object') return undefined;
      if (Array.isArray(current)) return current.map(walk).find(Boolean);
      if (current.props?.accessibilityElementsHidden === true) return current;
      return walk(current.children);
    };
    const hidden = walk(tree);
    expect(hidden).toBeTruthy();
    expect(hidden.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('still renders a legible icon when motion is switched off', async () => {
    (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValueOnce(true);

    const view = renderIcon({ weatherCode: 63, size: 24, animated: true });
    // The setting is read asynchronously; without letting that settle this
    // would pass on a component that ignores it entirely.
    await act(async () => {});

    // The rule the whole app follows: stop the motion, never hide the element.
    expect(drawnIcon(view.toJSON())).toBe(clayIcons['cloud-rain']);
  });
});

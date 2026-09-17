import { cast, lifted, neu, raised, sunken } from '../../shared/theme/tokens';

/* The depth builders are the whole neumorphic system in four functions, and
   every surface in the app reads its shadow from them. They are pure and take
   plain values, so they get tested directly here rather than through a
   rendered component — the same reasoning as scaleTypeScale and tint.

   `raised`/`sunken` are the paired ones, for a surface sitting in the page.
   The other two exist because a pair's white half assumes a page background of
   its own scheme behind it, and both of these break that assumption:
   `cast` for a panel pinned to a screen edge, where one half falls off-screen
   and the other takes the only visible side; `lifted` for a surface floating
   over content it does not control, where the highlight fogs the map or
   photograph instead of bevelling. */

describe('raised', () => {
  it('casts a dark shadow down-right and a light one up-left', () => {
    const [dark, light] = raised(neu.light, 'md');

    // The light source is top-left. That is the whole convention: get the
    // signs the wrong way round and every surface reads as a hole.
    expect(dark.offsetX).toBeGreaterThan(0);
    expect(dark.offsetY).toBeGreaterThan(0);
    expect(dark.color).toBe(neu.light.shadowDark);

    expect(light.offsetX).toBe(-dark.offsetX);
    expect(light.offsetY).toBe(-dark.offsetY);
    expect(light.color).toBe(neu.light.shadowLight);
  });

  it('never marks a shadow inset', () => {
    for (const shadow of raised(neu.dark, 'lg')) {
      expect(shadow.inset).toBeUndefined();
    }
  });

  it('grows with the depth step', () => {
    const small = raised(neu.light, 'sm')[0];
    const large = raised(neu.light, 'lg')[0];

    expect(large.offsetX).toBeGreaterThan(small.offsetX);
    expect(large.blurRadius).toBeGreaterThan(small.blurRadius);
  });

  it('blurs wider than it offsets, so the edge stays soft', () => {
    // A blur at or below the offset reads as a hard drop shadow, which is the
    // look this system is specifically not.
    for (const level of ['sm', 'md', 'lg'] as const) {
      const [dark] = raised(neu.light, level);
      expect(dark.blurRadius).toBeGreaterThan(dark.offsetX);
    }
  });

  it('defaults to the middle step', () => {
    expect(raised(neu.light)).toEqual(raised(neu.light, 'md'));
  });
});

describe('sunken', () => {
  it('is the raised pair thrown inward', () => {
    const out = raised(neu.light, 'md');
    const inward = sunken(neu.light, 'md');

    expect(inward).toEqual(out.map((shadow) => ({ ...shadow, inset: true })));
  });

  it('marks every shadow inset', () => {
    for (const shadow of sunken(neu.dark, 'sm')) {
      expect(shadow.inset).toBe(true);
    }
  });

  it('defaults to the middle step', () => {
    expect(sunken(neu.dark)).toEqual(sunken(neu.dark, 'md'));
  });
});

describe('lifted', () => {
  it('is the raised pair with the highlight dropped', () => {
    // The white half is the whole problem over foreign content: at
    // light.shadowLight's 0.9 alpha it fogs a map or a photograph instead of
    // bevelling against a page it can no longer assume is behind it.
    const [dark] = raised(neu.light, 'lg');
    expect(lifted(neu.light, 'lg')).toEqual([dark]);
  });

  it('keeps the light source where every other surface puts it', () => {
    const [only] = lifted(neu.light, 'md');
    expect(only.offsetX).toBeGreaterThan(0);
    expect(only.offsetY).toBeGreaterThan(0);
    expect(only.color).toBe(neu.light.shadowDark);
  });

  it('never carries the light token, in either scheme', () => {
    for (const tokens of [neu.light, neu.dark]) {
      for (const shadow of lifted(tokens, 'lg')) {
        expect(shadow.color).not.toBe(tokens.shadowLight);
      }
    }
  });

  it('defaults to the middle step', () => {
    expect(lifted(neu.light)).toEqual(lifted(neu.light, 'md'));
  });
});

describe('cast', () => {
  it('throws one shadow away from the edge the panel is pinned to', () => {
    // The bug this exists to prevent: a drawer pinned to the right edge took
    // `raised`, whose white half sits up-left — the only half still on screen.
    // It lit the app behind it instead of shadowing it.
    const [right] = cast(neu.light, 'right', 'lg');
    expect(right.offsetX).toBeLessThan(0);
    expect(right.offsetY).toBe(0);

    const [bottom] = cast(neu.light, 'bottom', 'lg');
    expect(bottom.offsetY).toBeLessThan(0);
    expect(bottom.offsetX).toBe(0);

    expect(cast(neu.light, 'left', 'lg')[0].offsetX).toBeGreaterThan(0);
    expect(cast(neu.light, 'top', 'lg')[0].offsetY).toBeGreaterThan(0);
  });

  it('is a single dark shadow, never a pair', () => {
    // A second, light shadow is exactly what went wrong at a screen edge.
    for (const from of ['top', 'bottom', 'left', 'right'] as const) {
      const shadows = cast(neu.light, from, 'md');
      expect(shadows).toHaveLength(1);
      expect(shadows[0].color).toBe(neu.light.shadowDark);
      expect(shadows[0].inset).toBeUndefined();
    }
  });

  it('blurs wider than raised at the same step, because it covers the page', () => {
    expect(cast(neu.light, 'bottom', 'lg')[0].blurRadius).toBeGreaterThan(raised(neu.light, 'lg')[0].blurRadius);
  });

  it('defaults to the middle step', () => {
    expect(cast(neu.dark, 'bottom')).toEqual(cast(neu.dark, 'bottom', 'md'));
  });
});

describe('the scheme tokens', () => {
  it('keeps the dark scheme’s highlight far weaker than its shadow', () => {
    // Over a near-black ground a white lift at light-mode strength stops
    // reading as a bevel and turns into a halo around every card.
    const alpha = (rgba: string) => Number(rgba.split(',').pop()?.replace(')', '').trim());

    expect(alpha(neu.dark.shadowLight)).toBeLessThan(alpha(neu.dark.shadowDark));
    expect(alpha(neu.dark.shadowLight)).toBeLessThan(alpha(neu.light.shadowLight));
  });

  it('defines both schemes', () => {
    expect(Object.keys(neu).sort()).toEqual(['dark', 'light']);
  });
});

describe('shadow identity', () => {
  /* Every Surface asks for its shadow on every render. A fresh array each time
     is a changed style prop each time, which re-sends the blurred shadow to the
     native side for nothing. */
  it('hands back the same array for the same scheme and level', () => {
    expect(raised(neu.light, 'md')).toBe(raised(neu.light, 'md'));
    expect(sunken(neu.dark, 'sm')).toBe(sunken(neu.dark, 'sm'));
    expect(lifted(neu.light, 'lg')).toBe(lifted(neu.light, 'lg'));
    expect(cast(neu.light, 'bottom', 'md')).toBe(cast(neu.light, 'bottom', 'md'));
  });

  it('keeps schemes, levels and edges apart', () => {
    expect(raised(neu.light, 'md')).not.toBe(raised(neu.dark, 'md'));
    expect(raised(neu.light, 'md')).not.toBe(raised(neu.light, 'lg'));
    expect(cast(neu.light, 'top', 'md')).not.toBe(cast(neu.light, 'bottom', 'md'));
  });
});

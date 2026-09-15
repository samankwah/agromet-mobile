import { neu, raised, sunken } from '../../shared/theme/tokens';

/* The depth builders are the whole neumorphic system in two functions, and
   every surface in the app reads its shadow from them. They are pure and take
   plain values, so they get tested directly here rather than through a
   rendered component — the same reasoning as scaleTypeScale and tint. */

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

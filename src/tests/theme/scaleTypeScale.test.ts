import { scaleTypeScale, typeScale } from '../../shared/theme/tokens';

describe('scaleTypeScale', () => {
  it('returns the base scale unchanged for "standard"', () => {
    expect(scaleTypeScale(typeScale, 'standard')).toEqual(typeScale);
  });

  it('scales fontSize and lineHeight together for "large"', () => {
    const scaled = scaleTypeScale(typeScale, 'large');
    expect(scaled.body.fontSize).toBe(Math.round(typeScale.body.fontSize * 1.15));
    expect(scaled.body.lineHeight).toBe(Math.round(typeScale.body.lineHeight * 1.15));
  });

  it('scales every variant, not just one', () => {
    const scaled = scaleTypeScale(typeScale, 'extra-large');
    for (const variant of Object.keys(typeScale) as (keyof typeof typeScale)[]) {
      expect(scaled[variant].fontSize).toBeGreaterThan(typeScale[variant].fontSize);
    }
  });

  it('preserves fontFamily unchanged while scaling size', () => {
    const scaled = scaleTypeScale(typeScale, 'large');
    expect(scaled.h1.fontFamily).toBe(typeScale.h1.fontFamily);
  });
});

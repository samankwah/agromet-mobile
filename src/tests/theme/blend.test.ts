import { tint } from '../../shared/theme/blend';

/* The point of this helper is that the result is opaque — an alpha suffix on
   the accent colour is what caused Android to paint an elevation shadow
   through a card's fill. */
describe('tint', () => {
  it('returns a six-digit opaque hex', () => {
    expect(tint('#23785c', '#ffffff', 0.09)).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('is the tint colour at full ratio and the backdrop at zero', () => {
    expect(tint('#23785c', '#ffffff', 1)).toBe('#23785c');
    expect(tint('#23785c', '#ffffff', 0)).toBe('#ffffff');
  });

  it('lands between the two at a partial ratio', () => {
    expect(tint('#000000', '#ffffff', 0.5)).toBe('#808080');
  });

  it('expands three-digit hex', () => {
    expect(tint('#fff', '#000', 1)).toBe('#ffffff');
  });

  it('clamps a ratio outside 0..1 rather than producing a bad hex', () => {
    expect(tint('#23785c', '#ffffff', 2)).toBe('#23785c');
    expect(tint('#23785c', '#ffffff', -1)).toBe('#ffffff');
  });
});

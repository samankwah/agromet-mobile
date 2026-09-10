import {
  buildColorClasses,
  DEFAULT_CLASS_COUNT,
  interpolateViridis,
  valueToClassColor,
  valueToViridis,
  RAINFALL_STOPS,
  TEMPERATURE_STOPS,
  VIRIDIS_STOPS,
} from '../../shared/utils/colorScale';

describe('interpolateViridis', () => {
  it('returns the dark purple stop at t=0 and the yellow stop at t=1', () => {
    expect(interpolateViridis(0)).toBe('rgb(68, 1, 84)');
    expect(interpolateViridis(1)).toBe('rgb(253, 231, 37)');
  });

  it('clamps out-of-range input instead of extrapolating', () => {
    expect(interpolateViridis(-5)).toBe(interpolateViridis(0));
    expect(interpolateViridis(5)).toBe(interpolateViridis(1));
  });

  it('produces a distinct color at the midpoint from either end', () => {
    const mid = interpolateViridis(0.5);
    expect(mid).not.toBe(interpolateViridis(0));
    expect(mid).not.toBe(interpolateViridis(1));
  });
});

describe('valueToViridis', () => {
  it('maps the minimum value to the scale start and the maximum to the scale end', () => {
    expect(valueToViridis(10, 10, 20)).toBe(interpolateViridis(0));
    expect(valueToViridis(20, 10, 20)).toBe(interpolateViridis(1));
  });

  it('does not divide by zero when min equals max', () => {
    expect(() => valueToViridis(5, 5, 5)).not.toThrow();
  });
});

describe('buildColorClasses', () => {
  it('produces the requested number of equal-interval classes', () => {
    const classes = buildColorClasses(0, 60, 6);
    expect(classes).toHaveLength(6);
    expect(classes[0]).toMatchObject({ from: 0, to: 10 });
    expect(classes[5]).toMatchObject({ from: 50, to: 60 });
  });

  it('spans exactly min..max with no gap between adjacent classes', () => {
    const classes = buildColorClasses(349, 906);
    expect(classes[0].from).toBe(349);
    expect(classes[classes.length - 1].to).toBe(906);
    for (let i = 0; i < classes.length - 1; i += 1) {
      expect(classes[i].to).toBeCloseTo(classes[i + 1].from, 6);
    }
  });

  it('gives every class a distinct colour — classes you cannot tell apart defeat the point', () => {
    const colors = buildColorClasses(0, 100).map((c) => c.color);
    expect(new Set(colors).size).toBe(colors.length);
  });

  it('collapses to a single class when the data is flat, rather than inventing breaks', () => {
    expect(buildColorClasses(5, 5)).toHaveLength(1);
  });

  it('defaults to a readable class count', () => {
    expect(buildColorClasses(0, 100)).toHaveLength(DEFAULT_CLASS_COUNT);
  });
});

describe('valueToClassColor', () => {
  it('bins a value into the class containing it', () => {
    const classes = buildColorClasses(0, 60, 6);
    expect(valueToClassColor(5, 0, 60, 6)).toBe(classes[0].color);
    expect(valueToClassColor(55, 0, 60, 6)).toBe(classes[5].color);
  });

  it('assigns the same colour across a whole class — that is what makes the legend readable', () => {
    expect(valueToClassColor(1, 0, 60, 6)).toBe(valueToClassColor(9, 0, 60, 6));
  });

  it('includes the maximum in the final class rather than falling off the end', () => {
    const classes = buildColorClasses(0, 60, 6);
    expect(valueToClassColor(60, 0, 60, 6)).toBe(classes[5].color);
  });
});

/* Rainfall and temperature must not look like the same map. The ramp is passed
   to the legend and both renderers from one place, so a colour on the map
   always means what the key says -- the drift this component has hit before. */
describe('per-variable sequential ramps', () => {
  it('gives rainfall and temperature different colours at the same level', () => {
    const wet = buildColorClasses(0, 100, 6, RAINFALL_STOPS);
    const hot = buildColorClasses(0, 100, 6, TEMPERATURE_STOPS);

    expect(wet.map((entry) => entry.color)).not.toEqual(hot.map((entry) => entry.color));
    expect(wet[wet.length - 1].color).not.toBe(hot[hot.length - 1].color);
  });

  it('runs water pale to blue and heat pale to red', () => {
    // Published convention: the top of the rainfall ramp is the bluest point,
    // the top of the temperature ramp the reddest.
    expect(interpolateViridis(1, RAINFALL_STOPS)).toBe('rgb(37, 52, 148)');
    expect(interpolateViridis(1, TEMPERATURE_STOPS)).toBe('rgb(189, 0, 38)');
  });

  it('still defaults to viridis for callers that name no ramp', () => {
    expect(buildColorClasses(0, 100, 6)).toEqual(buildColorClasses(0, 100, 6, VIRIDIS_STOPS));
  });

  it('keeps the legend and the fill on one scale', () => {
    // valueToClassColor is what the SVG map fills with; buildColorClasses is
    // what the legend keys. Same ramp in, same colour out.
    const classes = buildColorClasses(0, 100, 6, TEMPERATURE_STOPS);
    expect(valueToClassColor(5, 0, 100, 6, TEMPERATURE_STOPS)).toBe(classes[0].color);
    expect(valueToClassColor(95, 0, 100, 6, TEMPERATURE_STOPS)).toBe(classes[5].color);
  });
});

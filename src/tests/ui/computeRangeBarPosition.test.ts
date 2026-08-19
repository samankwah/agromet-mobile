import { computeRangeBarPosition } from '../../shared/ui/TemperatureRangeBar';

describe('computeRangeBarPosition', () => {
  it('positions a day matching the full week range as a full-width bar', () => {
    const { startPct, widthPct } = computeRangeBarPosition(20, 30, 20, 30);
    expect(startPct).toBe(0);
    expect(widthPct).toBe(100);
  });

  it('positions a day in the middle of the week range proportionally', () => {
    const { startPct, widthPct } = computeRangeBarPosition(24, 26, 20, 30);
    expect(startPct).toBe(40);
    expect(widthPct).toBe(20);
  });

  it('never returns a width under the 10% visibility floor for a narrow day range', () => {
    const { widthPct } = computeRangeBarPosition(25, 25, 20, 30);
    expect(widthPct).toBeGreaterThanOrEqual(10);
  });

  it('does not divide by zero when the week has no temperature spread', () => {
    const result = computeRangeBarPosition(25, 25, 25, 25);
    expect(Number.isFinite(result.startPct)).toBe(true);
    expect(Number.isFinite(result.widthPct)).toBe(true);
  });

  it('keeps the bar within 0-100% even for a day outside the given week range', () => {
    const { startPct, widthPct } = computeRangeBarPosition(15, 35, 20, 30);
    expect(startPct).toBeGreaterThanOrEqual(0);
    expect(startPct + widthPct).toBeLessThanOrEqual(100);
  });
});

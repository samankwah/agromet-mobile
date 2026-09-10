import { formatSpatialValue } from '../../shared/utils/formatSpatialValue';

/**
 * The one place a spatial-outlook value becomes reader-facing text, so the
 * legend, the map's tap popup and the detail panel cannot disagree.
 */
describe('formatSpatialValue', () => {
  describe('plain numbers', () => {
    it('rounds whole over a wide range', () => {
      expect(formatSpatialValue(68.94, 'number', 90)).toBe('69');
    });

    it('keeps a decimal over a narrow one, so adjacent breaks stay distinct', () => {
      expect(formatSpatialValue(6.94, 'number', 4)).toBe('6.9');
    });
  });

  /* Ghana's spread is only a few degrees, so the range rule above would always
     keep a decimal -- but a tenth of a degree sits well inside the ensemble's
     own spread, so it claims precision the forecast does not have. */
  describe('temperature', () => {
    it('is always whole, however narrow the range', () => {
      expect(formatSpatialValue(31.24, 'temperature', 4)).toBe('31');
      expect(formatSpatialValue(24.81, 'temperature', 90)).toBe('25');
    });

    it('rounds rather than truncates', () => {
      expect(formatSpatialValue(29.5, 'temperature', 6)).toBe('30');
    });
  });

  it('still refuses a value it cannot render', () => {
    expect(formatSpatialValue(Number.NaN, 'temperature', 6)).toBe('—');
  });
});

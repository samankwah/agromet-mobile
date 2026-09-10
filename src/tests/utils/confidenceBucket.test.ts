import { confidenceBucket } from '../../shared/utils/confidenceBucket';

/**
 * A classifier's score reported as the band it fell in.
 *
 * The tempting alternative is to pad the number into a range: 62% becomes
 * "55 to 70%". That invents an interval nobody computed and quietly claims a
 * calibration this model has never been checked for. The bucket is a true
 * statement about a number we actually have.
 */
describe('confidenceBucket', () => {
  it('reads a clear answer as high', () => {
    expect(confidenceBucket(0.82)).toEqual({ band: 'high', range: [70, 100] });
  });

  it('reads a lean as moderate', () => {
    expect(confidenceBucket(0.55)).toEqual({ band: 'moderate', range: [45, 70] });
  });

  it('puts the boundary in the higher band, not both', () => {
    // 70 exactly is high. Without this the two ranges would overlap and the
    // same score could be described two ways.
    expect(confidenceBucket(0.7).band).toBe('high');
    expect(confidenceBucket(0.699).band).toBe('moderate');
  });

  it('reports the same range for every score inside a band', () => {
    // The range is the band's own boundary, so it cannot move with the score.
    // If it did, it would be a confidence interval, which is the thing this
    // deliberately is not.
    expect(confidenceBucket(0.46).range).toEqual(confidenceBucket(0.69).range);
    expect(confidenceBucket(0.71).range).toEqual(confidenceBucket(0.99).range);
  });

  it('does not invent a band below the server floor', () => {
    // The server never reports under 45%: below it the response is
    // `status: "unavailable"` instead. A score here can only mean the two
    // thresholds have drifted apart, so report the floor rather than making up
    // a band nobody defined.
    expect(confidenceBucket(0.2)).toEqual({ band: 'moderate', range: [45, 70] });
  });
});

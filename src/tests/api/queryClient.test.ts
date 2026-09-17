import { NetworkError } from '../../shared/api/http';
import { ServiceError } from '../../shared/api/mockDelay';
import { shouldRetryQuery } from '../../shared/api/queryClient';

describe('shouldRetryQuery', () => {
  it('does not retry a refusal, which would only be refused again', () => {
    expect(shouldRetryQuery(0, new ServiceError('Not found', 404))).toBe(false);
    expect(shouldRetryQuery(0, new ServiceError('No forecast for "nowhere"'))).toBe(false);
  });

  it('retries an unreachable server once, not twice', () => {
    // Each attempt can cost the full ten-second budget; the third attempt is
    // what kept screens on a skeleton for over half a minute.
    expect(shouldRetryQuery(0, new NetworkError('offline'))).toBe(true);
    expect(shouldRetryQuery(1, new NetworkError('offline'))).toBe(false);
  });

  it('keeps two retries for a server fault or an unexpected error', () => {
    expect(shouldRetryQuery(1, new ServiceError('Bad gateway', 502))).toBe(true);
    expect(shouldRetryQuery(2, new ServiceError('Bad gateway', 502))).toBe(false);
    expect(shouldRetryQuery(1, new Error('boom'))).toBe(true);
    expect(shouldRetryQuery(2, new Error('boom'))).toBe(false);
  });
});

/** Simulates network latency for the mock services so loading states are
 * actually exercised during development, and gives the offline queue a
 * realistic "failed request" moment to fall back from. */
export function mockDelay<T>(value: T, ms = 400): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), ms);
  });
}

/** Thrown by mock services for expected failure cases (unknown location,
 * etc.) so callers can distinguish "no data for this input" from an
 * unexpected bug. */
export class ServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ServiceError';
  }
}

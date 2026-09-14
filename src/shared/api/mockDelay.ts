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
  /** HTTP status, when the error came from a real response. Lets a caller
   * distinguish "not found" from "not ready yet" without matching on the
   * message text. Absent for mock-service failures. */
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ServiceError';
    this.status = status;
  }
}

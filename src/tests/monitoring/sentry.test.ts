import * as Sentry from '@sentry/react-native';
import type { ErrorEvent } from '@sentry/react-native';

import { initMonitoring, reportError, scrubEvent } from '../../shared/monitoring/sentry';

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  wrap: jest.fn((component: unknown) => component),
}));

describe('crash reporting', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does not start without a DSN', () => {
    expect(initMonitoring({ dsn: '', isDev: false })).toBe(false);
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it('does not start in development, even with a DSN', () => {
    expect(initMonitoring({ dsn: 'https://key@o1.ingest.sentry.io/1', isDev: true })).toBe(false);
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it('sends nothing while it is off', () => {
    reportError(new Error('boom'));
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('starts once, without personal data, when a release build has a DSN', () => {
    expect(initMonitoring({ dsn: 'https://key@o1.ingest.sentry.io/1', isDev: false })).toBe(true);
    expect(initMonitoring({ dsn: 'https://key@o1.ingest.sentry.io/1', isDev: false })).toBe(true);
    expect(Sentry.init).toHaveBeenCalledTimes(1);
    expect(Sentry.init).toHaveBeenCalledWith(expect.objectContaining({ sendDefaultPii: false }));

    reportError(new Error('boom'), { boundary: 'root' });
    expect(Sentry.captureException).toHaveBeenCalledWith(expect.any(Error), { extra: { boundary: 'root' } });
  });
});

describe('scrubEvent', () => {
  it('removes the device identifier and any user from an event', () => {
    const event = {
      type: undefined,
      user: { id: 'guest-123' },
      request: { headers: { 'X-Device-Id': 'guest-123', Accept: 'application/json' } },
      breadcrumbs: [{ data: { url: '/api/chat', request_headers: { 'x-device-id': 'guest-123' } } }],
    } as unknown as ErrorEvent;

    const scrubbed = scrubEvent(event);

    expect(scrubbed.user).toBeUndefined();
    expect(scrubbed.request?.headers).toEqual({ Accept: 'application/json' });
    expect((scrubbed.breadcrumbs?.[0].data as { request_headers: object }).request_headers).toEqual({});
  });
});

import type React from 'react';
import * as Sentry from '@sentry/react-native';
import type { ErrorEvent } from '@sentry/react-native';

/**
 * Crash and error reporting.
 *
 * Without this, a crash on a farmer's phone is invisible: nobody files a bug
 * report from a field, they just stop opening the app. Sentry tells us it
 * happened, on which screen, on which phone.
 *
 * **Off unless a DSN is set, and always off in development.** The DSN comes from
 * `EXPO_PUBLIC_SENTRY_DSN`, set per build profile in `eas.json`. With it empty,
 * every function here is a no-op, so a build without an account behaves exactly
 * as the app did before this file existed. Development errors already reach the
 * developer through the red box; sending them too would only bury real ones.
 *
 * **Nothing that identifies a person leaves the phone.** `sendDefaultPii` is off,
 * and `scrubEvent` removes the one identifier the app attaches to requests (the
 * chat's `X-Device-Id`) plus any user record, in case a future integration adds
 * one. The contact form's name, email and phone travel in a POST body, which
 * Sentry does not capture.
 */

let enabled = false;

/** Headers that carry an identifier for this phone. Lower-case, compared
 * case-insensitively, because HTTP header names are. */
const IDENTIFYING_HEADERS = ['x-device-id', 'authorization', 'cookie'];

export function monitoringDsn(): string | undefined {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();
  return dsn ? dsn : undefined;
}

/** Strips anything that could identify the person from an event before it is
 * sent. Exported so the rule is tested rather than trusted. */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  delete event.user;

  const headers = event.request?.headers;
  if (headers) {
    for (const name of Object.keys(headers)) {
      if (IDENTIFYING_HEADERS.includes(name.toLowerCase())) delete headers[name];
    }
  }

  for (const crumb of event.breadcrumbs ?? []) {
    const data = crumb.data as Record<string, unknown> | undefined;
    const crumbHeaders = data?.request_headers as Record<string, unknown> | undefined;
    if (crumbHeaders) {
      for (const name of Object.keys(crumbHeaders)) {
        if (IDENTIFYING_HEADERS.includes(name.toLowerCase())) delete crumbHeaders[name];
      }
    }
  }
  return event;
}

/**
 * Starts reporting, once, at app start. Returns whether it did, which is what
 * the tests pin: no DSN or a development build must mean nothing starts.
 */
export function initMonitoring(options: { dsn?: string; isDev?: boolean } = {}): boolean {
  const dsn = options.dsn ?? monitoringDsn();
  const isDev = options.isDev ?? __DEV__;
  if (enabled || !dsn || isDev) return enabled;

  Sentry.init({
    dsn,
    sendDefaultPii: false,
    // A tenth of sessions traced is plenty to see slow screens, and keeps the
    // phone from spending data on performance events.
    tracesSampleRate: 0.1,
    // Crash-free rate per release is the number that says whether an update
    // made things better or worse.
    enableAutoSessionTracking: true,
    beforeSend: (event) => scrubEvent(event),
  });
  enabled = true;
  return true;
}

/** Sends one caught error, when reporting is on. Safe to call from anywhere,
 * including an error screen, because it can never throw itself. */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  if (!enabled) return;
  try {
    Sentry.captureException(error, context ? { extra: context } : undefined);
  } catch {
    // Reporting must never be the thing that breaks the app.
  }
}

/** Wraps the root component so Sentry can attach touch and navigation context
 * to what it reports. A plain pass-through when reporting is off. */
export function withMonitoring(Component: React.ComponentType): React.ComponentType {
  return enabled ? Sentry.wrap(Component) : Component;
}

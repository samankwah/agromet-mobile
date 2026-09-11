import { ALERT_SEVERITY_ORDER, type AlertSeverity } from './alertSeverity';
import type { WeatherAlert } from './weatherAlert';

/**
 * Which alerts are worth stopping a farmer to read, and when to stop them again.
 *
 * There are three tiers of loudness in this app and they are deliberately
 * different sizes:
 *
 *   1. **Flood & Drought** shows every region at every band. A monitoring
 *      surface; nothing is filtered.
 *   2. **The banner** (`reachesBanner`) shows severe and above, plus any issued
 *      bulletin. Persistent, but passive — it waits to be read.
 *   3. **The popup** — this module. It takes over the screen, so it has to be
 *      rarer than the banner or it becomes something people learn to swipe away
 *      without reading, which is worse than not having it.
 *
 * Modelled on how Apple Weather handles a European government alert: the pill
 * stays on the page, the sheet interrupts once, and a re-issue interrupts again.
 */

/** A record of an interruption the farmer has already seen. */
export type AlertAck = {
  severity: AlertSeverity;
  /** The `issuedAt` of the message that was acknowledged, so a forecaster
   * re-issuing is recognised as a new message rather than the same one. */
  issuedAt: string;
};

/**
 * Whether an alert is the kind that interrupts at all.
 *
 * Tighter than the banner on purpose. Today's live data has three regions at
 * band `extreme` and two at `severe`; popping for both tiers would mean a farmer
 * in Oti or Bono East gets a modal for a reading that has been steady for days.
 *
 * So: an **issued bulletin always interrupts** — a forecaster decided it
 * mattered, at whatever severity, and that is the one judgement the app does not
 * override. A **computed reading interrupts only at `emergency` and only when
 * it is happening now** (`urgency: 'immediate'`). A severe-weather alert for
 * *tomorrow* can be an emergency — a hail storm in the forecast — but it should
 * sit on the banner, not take the screen a day early. Everything else has the
 * banner.
 */
export function interrupts(alert: WeatherAlert): boolean {
  if (alert.provenance === 'issued') return true;
  return alert.severity === 'emergency' && alert.urgency === 'immediate';
}

/**
 * Whether to interrupt *now*, given what the farmer has already acknowledged.
 *
 * The caller has already established that the alert is live (`isCurrent`) — this
 * only decides whether it is new news.
 *
 * Two things count as new news:
 *
 *   - **An escalation.** Warning upgraded to emergency is a different
 *     instruction, so it interrupts again. A *de*-escalation never does; being
 *     told conditions have eased is not worth taking over the screen for.
 *   - **A re-issued bulletin.** A forecaster publishing again is a deliberate
 *     new message. A computed reading's `issuedAt` is only the model run time
 *     and moves every few hours, so it is expressly NOT treated this way —
 *     keying on it would pop the same warning at every refresh.
 */
export function shouldInterrupt(alert: WeatherAlert, ack: AlertAck | undefined): boolean {
  if (!interrupts(alert)) return false;
  if (!ack) return true;

  const escalated =
    ALERT_SEVERITY_ORDER.indexOf(alert.severity) > ALERT_SEVERITY_ORDER.indexOf(ack.severity);
  if (escalated) return true;

  return alert.provenance === 'issued' && alert.issuedAt !== ack.issuedAt;
}

/** The worst unacknowledged alert, or none. Worst first is already the order
 * `synthesiseAlerts` returns, so this is the first that qualifies. */
export function pickInterrupting(
  alerts: WeatherAlert[],
  acks: Record<string, AlertAck>,
): WeatherAlert | undefined {
  return alerts.find((alert) => shouldInterrupt(alert, acks[alert.id]));
}

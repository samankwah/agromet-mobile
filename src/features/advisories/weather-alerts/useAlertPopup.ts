import { useMemo } from 'react';

import { pickInterrupting } from '../../../shared/domain/alertInterrupt';
import type { WeatherAlert } from '../../../shared/domain/weatherAlert';
import { useAlertAckStore } from '../../../shared/state/alertAckStore';

/**
 * The alert that should take the screen right now, if any.
 *
 * Takes the alerts a screen already has rather than querying again, so mounting
 * the popup costs no request — `useAlerts` has done the fetching, the lapse
 * check (`isCurrent`) and the severity gate before anything gets here.
 *
 * `hasHydrated` is load-bearing. Before the acknowledgement record comes back
 * from AsyncStorage every alert looks unseen, so without this gate a popup the
 * farmer dismissed yesterday flashes up on launch and disappears a frame later.
 */
export function useAlertPopup(alerts: WeatherAlert[]) {
  const acks = useAlertAckStore((state) => state.acks);
  const hasHydrated = useAlertAckStore((state) => state.hasHydrated);
  const acknowledge = useAlertAckStore((state) => state.acknowledge);

  const alert = useMemo(
    () => (hasHydrated ? pickInterrupting(alerts, acks) : undefined),
    [alerts, acks, hasHydrated],
  );

  return {
    alert,
    /**
     * Records this alert as seen at its current severity.
     *
     * Writing the ack is what dismisses it: `pickInterrupting` reads the same
     * record, so the popup closes because it no longer qualifies rather than
     * because a separate "visible" flag was flipped. One source of truth, and no
     * way for the two to disagree.
     */
    dismiss: () => {
      if (!alert) return;
      acknowledge(alert.id, { severity: alert.severity, issuedAt: alert.issuedAt });
    },
  };
}

import React from 'react';

import { EmptyState } from './EmptyState';
import { Screen } from './Screen';

type Props = {
  title: string;
  message: string;
};

/** The one placeholder screen for tabs not built in this increment
 * (Forecast, Advisory, More) — a thin consumer of EmptyState, not a
 * separate hand-rolled layout. Rendered directly from the route file for
 * these tabs; there's no feature-folder screen file to go with it since
 * there's no logic to separate out yet. */
export function ComingSoon({ title, message }: Props) {
  return (
    <Screen scroll={false}>
      <EmptyState icon="construct-outline" title={title} message={message} />
    </Screen>
  );
}

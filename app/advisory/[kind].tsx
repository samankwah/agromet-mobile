import { useLocalSearchParams } from 'expo-router';

import { WeeklyAdvisoryScreen } from '../../src/features/advisories/weekly/WeeklyAdvisoryScreen';
import type { AdvisoryKind } from '../../src/shared/domain/weeklyAdvisory';

export default function AdvisoryRoute() {
  const { kind, advisoryId } = useLocalSearchParams<{ kind: string; advisoryId?: string }>();

  // Route params arrive as strings. A non-numeric one is dropped rather than
  // passed through as NaN, which would fetch /api/weekly-advisories/NaN.
  const id = Number(advisoryId);

  return (
    <WeeklyAdvisoryScreen
      kind={kind === 'poultry' ? 'poultry' : ('crop' as AdvisoryKind)}
      advisoryId={Number.isFinite(id) && id > 0 ? id : undefined}
    />
  );
}

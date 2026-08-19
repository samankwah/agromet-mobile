import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { getSpatialOutlookGrid, periodOptionsFor, SPATIAL_VARIABLES } from '../../../shared/api/spatialOutlookService';
import type { SpatialForecastView, SpatialGeography } from '../../../shared/domain/spatialOutlook';

/** Defaults match the reference screenshots' toggle state. */
const DEFAULT_VARIABLE = SPATIAL_VARIABLES[0];

export function useSpatialOutlookData() {
  const [forecastView, setForecastView] = useState<SpatialForecastView>('deterministic');
  const [geography, setGeography] = useState<SpatialGeography>('region');
  const [variableId, setVariableId] = useState(DEFAULT_VARIABLE.id);
  const [periodId, setPeriodId] = useState(periodOptionsFor(DEFAULT_VARIABLE)[0].id);

  const variable = SPATIAL_VARIABLES.find((entry) => entry.id === variableId) ?? DEFAULT_VARIABLE;
  const periodOptions = periodOptionsFor(variable);

  /**
   * Changing the variable can change which period vocabulary applies —
   * switching from Rainfall Total (trimesters) to Onset Date (seasons)
   * leaves the previous selection invalid. Reset to that vocabulary's
   * first option in the same update, so the pair is never briefly
   * mismatched and the query can't fire with a nonsense combination.
   */
  const selectVariable = useCallback((nextVariableId: string) => {
    const nextVariable = SPATIAL_VARIABLES.find((entry) => entry.id === nextVariableId);
    if (!nextVariable) return;

    const nextOptions = periodOptionsFor(nextVariable);
    setVariableId(nextVariableId);
    setPeriodId((current) => (nextOptions.some((option) => option.id === current) ? current : nextOptions[0].id));
  }, []);

  const query = useQuery({
    queryKey: ['spatialOutlook', forecastView, geography, variableId, periodId],
    queryFn: () => getSpatialOutlookGrid({ forecastView, geography, variableId, periodId }),
  });

  return {
    forecastView,
    setForecastView,
    geography,
    setGeography,
    variableId,
    setVariableId: selectVariable,
    periodId,
    setPeriodId,
    variables: SPATIAL_VARIABLES,
    /** The options and label for the *current* variable's period selector —
     * "Season" or "Sub-season" depending on what was picked. */
    periodOptions,
    periodLabel: variable.periodKind === 'season' ? 'SEASON' : 'SUB-SEASON',
    dataset: query.data,
    status: query.status,
    error: query.error,
    refetch: query.refetch,
  };
}

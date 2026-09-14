import { useQuery } from '@tanstack/react-query';

import { GIBS_ATTRIBUTION, observedFrames, resolveHorizon } from '../../../shared/api/precipitation/gibsSource';
import {
  fetchPrecipField,
  OPEN_METEO_ATTRIBUTION,
} from '../../../shared/api/precipitation/openMeteoPrecipSource';
import type {
  PrecipFrame,
  PrecipitationTimeline,
  TimelineSpan,
} from '../../../shared/domain/precipitationTimeline';
import { buildFixedClasses, IMERG_STOPS, PRECIP_RATE_BREAKS } from '../../../shared/utils/colorScale';
import { LOOK_AHEAD_HOURS, OBSERVED_FRAME_COUNT } from './frames';
import { CELL_SIZE_DEG, modelGrid } from './grid';

const HOUR_MS = 60 * 60 * 1000;

/**
 * The rain timeline: measured, then modelled, then forecast, on one axis.
 *
 * Deliberately a plain `useQuery` rather than `useCachedQuery`. Half the payload
 * is tile URLs whose imagery cannot be fetched offline, so a cached copy would
 * be a cache of nothing; the offline story here is the honest message.
 */
export function usePrecipitationTimeline(span: TimelineSpan) {
  return useQuery<PrecipitationTimeline>({
    queryKey: ['precipitationTimeline', span],
    // Ten minutes: IMERG publishes every thirty, and the model hourly, so
    // anything tighter re-fetches for a frame that cannot have appeared yet.
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const now = new Date();
      const grid = modelGrid();

      // Neither half is allowed to take the other down. A satellite outage
      // should still leave the forecast, and vice versa, with the timeline
      // saying which is missing.
      const [horizonResult, fieldResult] = await Promise.allSettled([
        resolveHorizon(now),
        fetchPrecipField(grid, { pastDays: 1, forecastDays: 2, stepDeg: CELL_SIZE_DEG }),
      ]);

      // Only what is actually wrong. The satellite's lag is permanent and is
      // already said by the frame labels, which name every frame Measured,
      // Estimated or Forecast; repeating it as a standing paragraph over the
      // map was noise.
      const notices: string[] = [];
      const attributions: string[] = [];
      const frames: PrecipFrame[] = [];

      if (horizonResult.status === 'fulfilled') {
        frames.push(...observedFrames(horizonResult.value, OBSERVED_FRAME_COUNT));
        attributions.push(GIBS_ATTRIBUTION);
      } else {
        notices.push('Satellite imagery is unavailable just now, so this is the forecast model only.');
      }

      const horizonMs = horizonResult.status === 'fulfilled' ? horizonResult.value.getTime() : -Infinity;
      const field = fieldResult.status === 'fulfilled' ? fieldResult.value : null;
      const values: number[][] = [];

      if (field) {
        attributions.push(OPEN_METEO_ATTRIBUTION);
        const aheadLimit = now.getTime() + LOOK_AHEAD_HOURS[span] * HOUR_MS;

        field.times.forEach((time, row) => {
          const at = Date.parse(time);
          // Model hours the satellite has already covered are redundant, and
          // hours past the chosen look-ahead are not being asked for.
          if (at <= horizonMs || at > aheadLimit) return;

          values.push(field.values[row]);
          frames.push({
            validAt: time,
            stepMinutes: 60,
            // Before now it is the model's account of the recent past, which is
            // not a measurement and must not be labelled as one.
            kind: at <= now.getTime() ? 'analysis' : 'forecast',
            render: { type: 'cells', valueRow: values.length - 1 },
          });
        });
      } else {
        notices.push('The forecast is unavailable just now, so this is the measured past only.');
      }

      frames.sort((a, b) => Date.parse(a.validAt) - Date.parse(b.validAt));

      return {
        frames,
        nowIso: now.toISOString(),
        // Whichever source answered owns the lattice, because the grid and the
        // values are positional. Falling back to the locally built one only
        // when there is no field at all.
        grid: field ? field.grid : grid,
        cellSizeDeg: field ? field.stepDeg : CELL_SIZE_DEG,
        values,
        breaks: PRECIP_RATE_BREAKS,
        attributions,
        notices,
      };
    },
  });
}

/** The classes the map fill and the legend both key off, so a colour cannot
 * mean one rate on the map and another in the key. */
export const PRECIP_CLASSES = buildFixedClasses(PRECIP_RATE_BREAKS, IMERG_STOPS);

export { CELL_SIZE_DEG };

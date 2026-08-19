import type { MapLayer } from '../domain/forecastMap';

/** Placeholder only — the "Maps and Notifications" milestone builds real
 * map UI against mapService.ts. `imageUrl` is a placeholder path, not a
 * real tile/image asset. */
export const MOCK_MAP_LAYERS: MapLayer[] = [
  {
    id: 'layer-rainfall-national',
    label: 'National Rainfall (7-day)',
    layerType: 'rainfall',
    imageUrl: 'placeholder://rainfall-national',
    legend: [
      { label: 'Low', color: '#a8d5ba' },
      { label: 'Moderate', color: '#f2c14e' },
      { label: 'High', color: '#c0392b' },
    ],
    updatedAt: new Date().toISOString(),
    source: 'Ghana Meteorological Agency (GMet)',
  },
];

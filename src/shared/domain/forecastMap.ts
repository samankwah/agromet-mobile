/**
 * Tier B this increment — type + placeholder mock only (future "Maps"
 * milestone). Shared by the Forecast Centre's forecast maps and the
 * Library's regional/district maps — one layer shape, two future
 * consumers, rather than duplicating it per screen.
 */
export type MapLayerType = 'rainfall' | 'temperature' | 'forecast' | 'flood' | 'drought' | 'advisory';

export type ForecastMapLayer = {
  id: string;
  label: string;
  layerType: MapLayerType;
  imageUrl: string;
  legend: { label: string; color: string }[];
  updatedAt: string; // ISO 8601
  source: string;
};

/** Alias, not a duplicate type — the Library's map area uses the same
 * shape as forecast maps. */
export type MapLayer = ForecastMapLayer;

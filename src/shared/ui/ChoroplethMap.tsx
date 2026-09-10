import React, { useMemo } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { GHANA_BOUNDARIES } from '../data/ghanaBoundaries';
import type { SpatialGeography, SpatialGridCell } from '../domain/spatialOutlook';
import { useTheme } from '../theme/ThemeProvider';
import { TERCILE_CATEGORIES, valueToClassColor, type ColorStops } from '../utils/colorScale';
import { createProjector, polygonToSvgPath } from '../utils/geoProjection';

type Props = {
  cells: SpatialGridCell[];
  min: number;
  max: number;
  geography: SpatialGeography;
  height: number;
  /** Probability view: values are indices into a categorical palette, not
   * points on a numeric ramp — must match the MapLibre renderer so switching
   * online/offline never changes what a colour means. */
  isTercile?: boolean;
  /** Overrides `TERCILE_CATEGORIES` when the variable has a published colour
   * convention of its own. The Subseasonal map passes rainfall and temperature
   * ramps; Seasonal omits it and keeps the neutral default, because "above" has
   * no agreed colour for a variable like dry-spell length. */
  palette?: { label: string; color: string; sublabel?: string }[];
  /** The continuous ramp, so the offline renderer follows the same per-variable
   * convention the online one does. */
  stops?: ColorStops;
};

/**
 * The gridded choropleth itself — real, simplified Ghana boundaries
 * (shared/data/ghanaBoundaries.ts) with colored grid cells over them,
 * rendered as SVG (react-native-svg), not a map-tile library: this is a
 * static country-scale illustration, not a pannable/zoomable slippy map,
 * so a full map library would be unjustified weight for what's actually
 * needed here.
 */
export function ChoroplethMap({ cells, min, max, geography, height, isTercile = false, palette, stops }: Props) {
  const theme = useTheme();
  const { width } = useWindowDimensions();

  const project = useMemo(() => createProjector(GHANA_BOUNDARIES.bounds, { width, height, padding: 12 }), [width, height]);

  const countryPath = useMemo(() => polygonToSvgPath(GHANA_BOUNDARIES.country.geometry, project), [project]);

  const categories = palette ?? TERCILE_CATEGORIES;
  // The middle of whatever palette is in use, which is the honest fallback for a
  // value that does not resolve.
  const neutralIndex = Math.floor(categories.length / 2);

  const boundaryFeatures = geography === 'region' ? GHANA_BOUNDARIES.regions : GHANA_BOUNDARIES.districts;
  const internalBoundaryPath = useMemo(
    () => boundaryFeatures.map((feature) => polygonToSvgPath(feature.geometry, project)).join(' '),
    [boundaryFeatures, project],
  );

  const cellSizePx = useMemo(() => {
    const origin = project(GHANA_BOUNDARIES.bounds.minLng, GHANA_BOUNDARIES.bounds.minLat);
    const adjacent = project(
      GHANA_BOUNDARIES.bounds.minLng + GHANA_BOUNDARIES.gridResolutionDeg,
      GHANA_BOUNDARIES.bounds.minLat + GHANA_BOUNDARIES.gridResolutionDeg,
    );
    return Math.max(Math.abs(adjacent.x - origin.x), Math.abs(origin.y - adjacent.y));
  }, [project]);

  return (
    <View style={{ width: '100%', height, backgroundColor: theme.colors.bg }}>
      <Svg width={width} height={height}>
        {cells.map((cell) => {
          const point = project(cell.lng, cell.lat);
          return (
            <Rect
              key={cell.id}
              x={point.x - cellSizePx / 2}
              y={point.y - cellSizePx / 2}
              width={cellSizePx}
              height={cellSizePx}
              fill={
                isTercile
                  ? (categories[cell.value]?.color ?? categories[neutralIndex].color)
                  : valueToClassColor(cell.value, min, max, undefined, stops)
              }
            />
          );
        })}
        <Path d={internalBoundaryPath} stroke={theme.colors.surfaceStrong} strokeWidth={0.75} fill="none" opacity={0.6} />
        <Path d={countryPath} stroke={theme.colors.text} strokeWidth={1.5} fill="none" />
      </Svg>
    </View>
  );
}

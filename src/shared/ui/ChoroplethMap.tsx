import React, { useMemo } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { GHANA_BOUNDARIES } from '../data/ghanaBoundaries';
import type { SpatialGeography, SpatialGridCell } from '../domain/spatialOutlook';
import { useTheme } from '../theme/ThemeProvider';
import { TERCILE_CATEGORIES, valueToClassColor } from '../utils/colorScale';
import { createProjector, polygonToSvgPath } from '../utils/geoProjection';

type Props = {
  cells: SpatialGridCell[];
  min: number;
  max: number;
  geography: SpatialGeography;
  height: number;
  /** Probability view: values are tercile indices, coloured by category —
   * must match the MapLibre renderer so switching online/offline never
   * changes what a colour means. */
  isTercile?: boolean;
};

/**
 * The gridded choropleth itself — real, simplified Ghana boundaries
 * (shared/data/ghanaBoundaries.ts) with colored grid cells over them,
 * rendered as SVG (react-native-svg), not a map-tile library: this is a
 * static country-scale illustration, not a pannable/zoomable slippy map,
 * so a full map library would be unjustified weight for what's actually
 * needed here.
 */
export function ChoroplethMap({ cells, min, max, geography, height, isTercile = false }: Props) {
  const theme = useTheme();
  const { width } = useWindowDimensions();

  const project = useMemo(() => createProjector(GHANA_BOUNDARIES.bounds, { width, height, padding: 12 }), [width, height]);

  const countryPath = useMemo(() => polygonToSvgPath(GHANA_BOUNDARIES.country.geometry, project), [project]);

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
                isTercile ? (TERCILE_CATEGORIES[cell.value]?.color ?? TERCILE_CATEGORIES[1].color) : valueToClassColor(cell.value, min, max)
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

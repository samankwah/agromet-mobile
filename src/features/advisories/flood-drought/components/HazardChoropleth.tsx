import React, { useMemo } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Svg, { Path, Text as SvgText } from 'react-native-svg';

import { GHANA_BOUNDARIES } from '../../../../shared/data/ghanaBoundaries';
import type { HazardKind, HazardRegion } from '../../../../shared/domain/hazard';
import { getHazardBandMeta, isElevatedBand, hazardBandColor } from '../../../../shared/domain/hazardBand';
import { useTheme } from '../../../../shared/theme/ThemeProvider';
import { createProjector, polygonToSvgPath } from '../../../../shared/utils/geoProjection';

/** Higher bands sit heavier on the page, so severity reads as weight even
 * before hue is considered. */
const BAND_FILL_OPACITY: Record<string, number> = {
  normal: 0.22,
  watch: 0.34,
  moderate: 0.46,
  severe: 0.58,
  extreme: 0.75,
};

/**
 * Shortened names for the labels that will not fit their region.
 *
 * Ghana's regions differ enormously in drawn size — Northern is roughly twenty
 * times the area of Greater Accra — so the longest names sit on some of the
 * smallest shapes. Abbreviating beats truncating: "Gt. Accra" is still
 * recognisable, "Greater A…" is not.
 */
const LABEL_ABBREVIATIONS: Record<string, string> = {
  'Greater Accra': 'Gt. Accra',
  'Western North': 'W. North',
  'Upper East': 'U. East',
  'Upper West': 'U. West',
  'North East': 'N. East',
  'Bono East': 'Bono E.',
};

const LABEL_FONT_SIZE = 9;

/**
 * Ghana is portrait: about 6.43 degrees of latitude against 4.45 of longitude,
 * which after the projector's latitude-cosine correction is an aspect of ~1.46.
 *
 * The height is derived from that rather than fixed, because `createProjector`
 * fits by the smaller of the two scales — hand a portrait country a landscape
 * box and it fills the height and leaves a third of the width as dead space.
 */
const GHANA_ASPECT = (() => {
  const b = GHANA_BOUNDARIES.bounds;
  const cos = Math.cos((((b.minLat + b.maxLat) / 2) * Math.PI) / 180);
  return (b.maxLat - b.minLat) / ((b.maxLng - b.minLng) * cos);
})();

/** Tall enough for the country to fill its box, capped so the map cannot push
 * the ranked lists — which are the primary view — off the screen. */
const MAX_MAP_HEIGHT = 430;

type Props = {
  regions: HazardRegion[];
  hazard: HazardKind;
  /** Defaults to the window less the screen gutter. Pass it when the map sits
   * inside a padded card, or the SVG overflows its container. */
  width?: number;
  selectedRegion?: string | null;
  onSelectRegion: (region: string) => void;
};

/**
 * Ghana shaded by hazard band, one fill per region.
 *
 * Written separately from `shared/ui/ChoroplethMap` rather than extending it.
 * That component paints ~865 grid-cell squares over outline-only boundaries and
 * is driven by a continuous viridis ramp; this one fills whole region polygons
 * from five discrete bands. They share the projection helpers but nothing else,
 * and bending one component around both jobs would make the seasonal-outlook
 * map worse to serve this screen.
 *
 * The boundary asset carries 26 polygon features across the 16 regions (several
 * regions are multi-part), and `properties.name` matches the API's region names
 * exactly — verified against a live `/api/hazards/summary`, 16 for 16, no
 * normalisation needed. Features are grouped by name so every part of a region
 * takes the same fill.
 */
export function HazardChoropleth({
  regions,
  hazard,
  width: widthProp,
  selectedRegion,
  onSelectRegion,
}: Props) {
  const theme = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const width = widthProp ?? windowWidth - theme.spacing.lg * 2;
  const height = Math.min(Math.round(width * GHANA_ASPECT), MAX_MAP_HEIGHT);

  const project = useMemo(
    () => createProjector(GHANA_BOUNDARIES.bounds, { width, height, padding: 8 }),
    [width, height],
  );

  const countryPath = useMemo(
    () => polygonToSvgPath(GHANA_BOUNDARIES.country.geometry, project),
    [project],
  );

  const bandByRegion = useMemo(() => {
    const map = new Map<string, string>();
    regions.forEach((region) => map.set(region.region, region[hazard].band));
    return map;
  }, [regions, hazard]);

  /** One merged path per region name, so a multi-part region is a single fill
   * and a single tap target. */
  const shapes = useMemo(() => {
    const byName = new Map<string, string[]>();

    GHANA_BOUNDARIES.regions.forEach((feature) => {
      const name = feature.properties?.name;
      if (!name) return;
      const path = polygonToSvgPath(feature.geometry, project);
      byName.set(name, [...(byName.get(name) ?? []), path]);
    });

    return Array.from(byName.entries()).map(([name, paths]) => ({
      name,
      d: paths.join(' '),
    }));
  }, [project]);

  /**
   * Where each region's name goes.
   *
   * Placed at the centroid the API publishes — the mean of the region's
   * district centroids — rather than a bounding-box centre, which for a
   * concave region like Volta can land outside the shape entirely.
   *
   * No collision avoidance: at this scale the closest pair of centroids
   * (Greater Accra and Eastern) is ~36px apart vertically, four times the
   * text height. Speculative de-overlap code that never fires would be worse
   * than none.
   */
  const labels = useMemo(
    () =>
      regions.map((region) => {
        const point = project(region.centroid[1], region.centroid[0]);
        return {
          region: region.region,
          text: LABEL_ABBREVIATIONS[region.region] ?? region.region,
          x: point.x,
          y: point.y,
        };
      }),
    [regions, project],
  );

  if (__DEV__) {
    const unmatched = shapes.filter((shape) => regions.length > 0 && !bandByRegion.has(shape.name));
    if (unmatched.length > 0) {
      console.warn(
        `HazardChoropleth: no reading for ${unmatched.map((s) => s.name).join(', ')} — ` +
          'the boundary asset and the API region names have drifted apart.',
      );
    }
  }

  /* SVG is effectively invisible to a screen reader, and making 16 paths
     individually focusable would be a poor experience even if it worked. The
     map is described as one image, and the ranked list above it is the
     accessible equivalent of the same data — which is also why the list comes
     first on the screen. */
  const elevated = regions.filter((region) => isElevatedBand(region[hazard].band));
  const summary =
    elevated.length === 0
      ? `Map of Ghana. No region is above normal ${hazard} risk.`
      : `Map of Ghana. ${elevated.length} ${
          elevated.length === 1 ? 'region is' : 'regions are'
        } above normal ${hazard} risk: ${elevated.map((region) => region.region).join(', ')}.`;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={summary}
      style={{
        width,
        height,
        borderRadius: theme.radii.md,
        overflow: 'hidden',
        backgroundColor: theme.colors.bg,
      }}
    >
      <Svg width={width} height={height}>
        {shapes.map((shape) => {
          const band = bandByRegion.get(shape.name);
          const meta = getHazardBandMeta(band);
          const selected = shape.name === selectedRegion;

          return (
            <Path
              key={shape.name}
              d={shape.d}
              fill={band ? hazardBandColor(band, theme) : theme.colors.border}
              // Bands already differ in hue; the opacity ramp adds a second,
              // redundant channel so the ordering survives a colour-blind read.
              fillOpacity={band ? BAND_FILL_OPACITY[meta.band] : 0.18}
              // Selection is shown by outlining in the text colour, never by
              // changing the fill — otherwise selection and severity would be
              // competing for the same channel.
              stroke={selected ? theme.colors.text : theme.colors.surfaceStrong}
              strokeWidth={selected ? 2 : 0.75}
              onPress={() => onSelectRegion(shape.name)}
            />
          );
        })}
        <Path d={countryPath} stroke={theme.colors.text} strokeWidth={1.25} fill="none" />

        {/* Drawn last so nothing paints over them. Each label is rendered
            twice: a thick stroked copy underneath acts as a halo, then the
            solid glyphs on top. SVG paints stroke over fill within one
            element, so a single stroked Text would have the halo eating into
            the letterforms — two passes is the standard fix, and it is what
            keeps the names readable over both a pale "normal" fill and a
            saturated "extreme" one, in either colour scheme. */}
        {labels.map((label) => {
          const selected = label.region === selectedRegion;
          return (
            <React.Fragment key={label.region}>
              <SvgText
                x={label.x}
                y={label.y}
                textAnchor="middle"
                fontSize={LABEL_FONT_SIZE}
                fontWeight={selected ? '700' : '600'}
                stroke={theme.colors.bg}
                strokeWidth={2.5}
                fill={theme.colors.bg}
              >
                {label.text}
              </SvgText>
              <SvgText
                x={label.x}
                y={label.y}
                textAnchor="middle"
                fontSize={LABEL_FONT_SIZE}
                fontWeight={selected ? '700' : '600'}
                fill={theme.colors.text}
              >
                {label.text}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}


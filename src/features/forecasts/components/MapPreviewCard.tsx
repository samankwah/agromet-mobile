import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useNetworkStatus } from '../../../shared/net/useNetworkStatus';
import { useSettingsStore } from '../../../shared/state/settingsStore';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { Card } from '../../../shared/ui/Card';
import { MapLibrePrecipitation } from '../../../shared/ui/MapLibrePrecipitation';
import { Text } from '../../../shared/ui/Text';
import { formatDegrees } from '../../../shared/utils/formatTemperature';
import { openingIndex } from '../precipitation/frames';
import {
  CELL_SIZE_DEG,
  PRECIP_CLASSES,
  usePrecipitationTimeline,
} from '../precipitation/usePrecipitationTimeline';

type Props = {
  /** Where to look. The selected town, straight off the conditions the Daily
   * section already has. */
  center: { lat: number; lng: number };
  locationName: string;
  temperatureC: number;
};

/** How much ground the thumbnail covers, in degrees. About 280km, which is the
 * extent the reference app shows: far enough that a squall line approaching
 * from the next region is on the map, close enough that the reader's own town
 * is somewhere they can point at. */
const SPAN_DEG = 2.5;

/** Tall enough to read weather in, short enough that the action card below it
 * is still on screen on a small phone. */
const MAP_HEIGHT = 200;

/**
 * The rain map, previewed and opened.
 *
 * This card used to show the colour key and a sentence instead of a map, on the
 * argument that a miniature of a WebView map inside a scrolling list means a
 * second MapLibre instance and a second set of tile requests. Both halves of
 * that cost turned out to be avoidable, so the card now shows the thing it is
 * about:
 *
 *  - It renders **one frame**, the one nearest now, not the timeline. There is
 *    no playback loop, no timer, and at most one raster source, so the tiles it
 *    fetches are a single frame's worth rather than three hours of them.
 *  - It reads the same `usePrecipitationTimeline('12h')` the full screen opens
 *    on, so the two share one react-query entry: the preview warms the cache
 *    the map then opens from, rather than costing a second fetch.
 *
 * The whole card is one tap target. The map is behind `pointerEvents="none"`
 * because a WebView otherwise eats the touch and the Pressable never fires. It
 * carries no attribution control for the same reason and one more: there is no
 * room here for a legible credits line, and the card's whole purpose is to open
 * the map that does show them.
 */
export function MapPreviewCard({ center, locationName, temperatureC }: Props) {
  const theme = useTheme();
  const { isOnline } = useNetworkStatus();
  const dataSaverEnabled = useSettingsStore((state) => state.dataSaverEnabled);

  // Nothing here is cacheable imagery, so neither of these is a degraded map:
  // both are a sentence instead of one. Deciding before the WebView mounts is
  // what stops a blank rectangle sitting in the card while MapLibre works out
  // it cannot reach its basemap.
  const canRenderMap = isOnline && !dataSaverEnabled;

  const { data } = usePrecipitationTimeline('12h');

  /**
   * The single frame the card paints.
   *
   * `values` is passed whole rather than sliced alongside it: a cells frame's
   * `valueRow` indexes the full matrix, and the map writes every row onto the
   * geometry as its own property, so cutting the frames down does not mean
   * cutting the values down too.
   */
  const frames = useMemo(() => {
    if (!data || data.frames.length === 0) return [];
    return [data.frames[openingIndex(data.frames, data.nowIso)]];
  }, [data]);

  return (
    <Pressable onPress={() => router.push('/rain-map')} accessibilityRole="button" accessibilityLabel="Open the rain map">
      {({ pressed }) => (
        // Chrome on a nested surface, never on the Pressable: Android drops a
        // Pressable's own background while still drawing its children, and a
        // pressed state makes the style a function, which is the case that
        // breaks. Button.tsx documents it.
        <Card translucent style={{ gap: theme.spacing.md, opacity: pressed ? 0.75 : 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <Ionicons name="rainy-outline" size={16} color={theme.colors.accent} />
            <Text variant="caption" color={theme.colors.accent} style={{ flex: 1, letterSpacing: 0.8 }}>
              PRECIPITATION
            </Text>
            {/* Decorative: the Pressable above already carries the spoken label,
                so reading this again would say the card twice. */}
            <Ionicons
              name="chevron-forward"
              size={13}
              color={theme.colors.accent}
              importantForAccessibility="no"
              accessibilityElementsHidden
            />
          </View>

          {canRenderMap ? (
            <View style={{ height: MAP_HEIGHT }}>
              {/* Hidden from assistive technology as well as from touch: a
                  WebView the reader cannot operate should not be offered to
                  them as though they could. */}
              <View
                pointerEvents="none"
                importantForAccessibility="no-hide-descendants"
                accessibilityElementsHidden
              >
                <MapLibrePrecipitation
                  frames={frames}
                  index={0}
                  grid={data?.grid}
                  values={data?.values}
                  classes={PRECIP_CLASSES}
                  cellSizeDeg={data?.cellSizeDeg ?? CELL_SIZE_DEG}
                  attributions={data?.attributions ?? []}
                  height={MAP_HEIGHT}
                  center={center}
                  spanDeg={SPAN_DEG}
                  interactive={false}
                  chamfer={theme.cardShape.nestedChamfer}
                />
              </View>

              <View
                pointerEvents="none"
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(10,18,26,0.72)',
                  }}
                >
                  <Text variant="bodyStrong" color="#ffffff">
                    {formatDegrees(temperatureC)}
                  </Text>
                </View>
                <Text variant="caption" color="rgba(255,255,255,0.75)" style={{ marginTop: 4 }}>
                  {locationName}
                </Text>
              </View>
            </View>
          ) : (
            <Text variant="body" muted>
              {dataSaverEnabled
                ? 'Data saver is on, so the map is not loaded here. Tap to open it.'
                : 'The map is satellite imagery, so it needs a connection.'}
            </Text>
          )}
        </Card>
      )}
    </Pressable>
  );
}

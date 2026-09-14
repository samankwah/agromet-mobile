import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import type { TimelineSpan } from '../../../shared/domain/precipitationTimeline';
import { useNetworkStatus } from '../../../shared/net/useNetworkStatus';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { MapLibrePrecipitation } from '../../../shared/ui/MapLibrePrecipitation';
import { Screen } from '../../../shared/ui/Screen';
import { Text } from '../../../shared/ui/Text';
import { PlaybackBar } from './PlaybackBar';
import { PrecipitationLegend } from './PrecipitationLegend';
import { usePrecipitationPlayback } from './usePrecipitationPlayback';
import { CELL_SIZE_DEG, PRECIP_CLASSES, usePrecipitationTimeline } from './usePrecipitationTimeline';

/** The map is the page, so the chrome floats over it with its own gutter. */
const GUTTER = 16;

/**
 * The rain map: measured rainfall running into the coming hours, on a map that
 * fills the screen.
 *
 * Laid out like the reference app rather than like the rest of this app. There
 * is no page header and no drawer: a close control, a key, and a playback bar,
 * all floating over a full-bleed map. The screen's own header is turned off in
 * `app/_layout.tsx` for the same reason.
 *
 * The close control is not a nicety. This route can be reached by a deep link
 * as well as by a push, and in the deep-link case there is no navigation stack
 * to go back through, so a stack header would render without a back arrow and
 * strand the reader.
 */
export function RainMapScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { isOnline } = useNetworkStatus();
  const [span, setSpan] = useState<TimelineSpan>('12h');

  /** Which satellite frames' imagery has arrived, and which failed. */
  const [ready, setReady] = useState<Set<string>>(new Set());
  const [failed, setFailed] = useState<Set<string>>(new Set());

  const { data, status, refetch } = usePrecipitationTimeline(span);

  // A frame whose tiles failed is dropped rather than shown blank. Done here so
  // the scrubber's ticks stay honest: a frame the reader cannot see should not
  // have a mark on the timeline.
  const frames = useMemo(
    () => (data?.frames ?? []).filter((frame) => !failed.has(frame.validAt)),
    [data?.frames, failed],
  );

  const nowIso = data?.nowIso ?? new Date(0).toISOString();

  const { index, playing, canPlay, reduceMotion, toggle, seek } = usePrecipitationPlayback({
    frames,
    span,
    ready,
    nowIso,
  });

  const onFrameReady = useCallback((validAt: string) => {
    setReady((current) => (current.has(validAt) ? current : new Set(current).add(validAt)));
  }, []);

  const onFrameFailed = useCallback((validAt: string) => {
    setFailed((current) => (current.has(validAt) ? current : new Set(current).add(validAt)));
  }, []);

  const changeSpan = useCallback((next: TimelineSpan) => {
    // A new span is a new set of frames, so what was loaded no longer describes
    // what is on screen.
    setReady(new Set());
    setFailed(new Set());
    setSpan(next);
  }, []);

  /** Back where possible, and out to Forecasts when this screen was opened
   * cold and there is nothing behind it. */
  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/forecasts');
  }, []);

  // No cached imagery is possible, so offline is a message rather than a
  // degraded map. Saying it before the WebView mounts avoids a blank rectangle
  // while MapLibre works out it cannot reach its basemap.
  if (!isOnline) {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm }}>
          <Text variant="h3">Rain map needs a connection</Text>
          <Text variant="body" muted style={{ textAlign: 'center' }}>
            The imagery is satellite tiles, so there is nothing saved on this phone to show you.
          </Text>
          <Pressable onPress={close} accessibilityRole="button" style={{ paddingVertical: theme.spacing.sm }}>
            <Text variant="bodyStrong" color={theme.colors.accent}>
              Go back
            </Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={false} padded={false} fullBleed>
      <View style={{ flex: 1 }}>
        <MapLibrePrecipitation
          frames={frames}
          index={index}
          grid={data?.grid}
          values={data?.values}
          classes={PRECIP_CLASSES}
          cellSizeDeg={data?.cellSizeDeg ?? CELL_SIZE_DEG}
          attributions={data?.attributions ?? []}
          onFrameReady={onFrameReady}
          onFrameFailed={onFrameFailed}
        />

        {/* Chrome, floating. Absolutely positioned rather than laid out around
            the map, because the map is the page and everything else sits on
            top of it. */}
        <View
          pointerEvents="box-none"
          style={{ position: 'absolute', top: insets.top + GUTTER, left: GUTTER, gap: 12 }}
        >
          <Pressable
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel="Close the rain map"
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(10,18,26,0.72)',
            }}
          >
            <Ionicons name="close" size={22} color="#ffffff" />
          </Pressable>

          <PrecipitationLegend />
        </View>

        <View
          pointerEvents="box-none"
          style={{ position: 'absolute', left: GUTTER, right: GUTTER, bottom: insets.bottom + GUTTER, gap: 8 }}
        >
          {frames.length > 0 ? (
            <PlaybackBar
              frames={frames}
              index={index}
              playing={playing}
              canPlay={canPlay}
              reduceMotion={reduceMotion}
              span={span}
              nowIso={nowIso}
              onToggle={toggle}
              onSeek={seek}
              onChangeSpan={changeSpan}
              notice={data?.notices[data.notices.length - 1]}
            />
          ) : (
            <View style={{ alignItems: 'center' }}>
              <Text variant="caption" color="rgba(255,255,255,0.75)">
                {status === 'error' ? 'Rainfall could not load.' : 'Loading rainfall'}
              </Text>
              {status === 'error' ? (
                <Pressable onPress={() => refetch()} accessibilityRole="button">
                  <Text variant="bodyStrong" color="#ffffff">
                    Try again
                  </Text>
                </Pressable>
              ) : null}
            </View>
          )}
        </View>
      </View>
    </Screen>
  );
}

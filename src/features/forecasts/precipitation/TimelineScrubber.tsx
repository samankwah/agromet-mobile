import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, View } from 'react-native';

import type { PrecipFrame, TimelineSpan } from '../../../shared/domain/precipitationTimeline';
import { Text } from '../../../shared/ui/Text';
import { dwellMs, frameIndexForFraction, nowFraction, timeFraction } from './frames';

type Props = {
  frames: PrecipFrame[];
  index: number;
  playing: boolean;
  reduceMotion: boolean;
  span: TimelineSpan;
  nowIso: string;
  onSeek: (index: number) => void;
};

const TRACK_HEIGHT = 36;
const LINE_HEIGHT = 4;
/** At most this many times printed under the track. More than five and they
 * collide at phone width; fewer and the axis stops being readable. */
const MAX_LABELS = 5;

function clockTime(iso: string): string {
  return iso.slice(11, 16);
}

/**
 * The track: frame ticks on a time axis, a fill that grows to the current
 * frame, and times printed beneath.
 *
 * Hand built on `PanResponder` because there is no slider in this app's
 * dependency tree and neither is `react-native-gesture-handler`. That suits the
 * problem: a stock slider is index-linear, and this axis has to be time-linear
 * so a gap in the satellite record reads as a gap rather than being quietly
 * closed up.
 */
export function TimelineScrubber({ frames, index, playing, reduceMotion, span, nowIso, onSeek }: Props) {
  const [trackWidth, setTrackWidth] = useState(0);
  const fillWidth = useRef(new Animated.Value(0)).current;

  const fractions = useMemo(() => frames.map((_, i) => timeFraction(frames, i)), [frames]);

  /** Evenly spaced along the axis, always including both ends, so the reader
   * can see the range without reading every tick. */
  const labelled = useMemo(() => {
    if (frames.length <= MAX_LABELS) return frames.map((_, i) => i);
    const step = (frames.length - 1) / (MAX_LABELS - 1);
    return Array.from({ length: MAX_LABELS }, (_, i) => Math.round(i * step));
  }, [frames]);

  // The fill glides on the frame's own dwell so it arrives exactly as the next
  // frame paints. Under reduced motion, and when paused, it simply jumps.
  useEffect(() => {
    const target = (fractions[index] ?? 0) * trackWidth;
    if (reduceMotion || !playing) {
      fillWidth.setValue(target);
      return;
    }
    Animated.timing(fillWidth, {
      toValue: target,
      duration: dwellMs(frames[index] ?? frames[0], span),
      easing: Easing.linear,
      // Width cannot be driven natively, so this one stays on the JS driver.
      useNativeDriver: false,
    }).start();
  }, [index, fractions, trackWidth, reduceMotion, playing, fillWidth, frames, span]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          if (trackWidth > 0) onSeek(frameIndexForFraction(frames, event.nativeEvent.locationX / trackWidth));
        },
        onPanResponderMove: (event) => {
          if (trackWidth > 0) onSeek(frameIndexForFraction(frames, event.nativeEvent.locationX / trackWidth));
        },
      }),
    [frames, trackWidth, onSeek],
  );

  const current = frames[index];
  const now = nowFraction(frames, nowIso);

  return (
    <View>
      <View
        {...panResponder.panHandlers}
        onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
        // One adjustable control rather than a row of tick buttons: a screen
        // reader user wants to step through time, not hunt for a two-pixel
        // target.
        accessibilityRole="adjustable"
        accessibilityLabel="Rainfall timeline"
        accessibilityValue={{
          min: 0,
          max: Math.max(0, frames.length - 1),
          now: index,
          text: current ? `${clockTime(current.validAt)} GMT, ${current.kind}` : '',
        }}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'increment') onSeek(Math.min(frames.length - 1, index + 1));
          if (event.nativeEvent.actionName === 'decrement') onSeek(Math.max(0, index - 1));
        }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        style={{ height: TRACK_HEIGHT, justifyContent: 'center' }}
      >
        <View
          style={{
            height: LINE_HEIGHT,
            borderRadius: LINE_HEIGHT / 2,
            backgroundColor: 'rgba(255,255,255,0.18)',
          }}
        />

        {/* The fill is the thumb: the reference app has no separate handle, and
            a growing bar says "elapsed" more directly than a dot does. */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            height: LINE_HEIGHT,
            width: fillWidth,
            borderRadius: LINE_HEIGHT / 2,
            backgroundColor: '#ffffff',
          }}
        />

        {frames.map((frame, i) => (
          <View
            key={frame.validAt}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: fractions[i] * Math.max(0, trackWidth - 1),
              width: 1,
              // Measured frames get a taller, brighter tick than modelled ones.
              // The difference between a measurement and a forecast is the most
              // important thing this strip has to say.
              height: frame.kind === 'observed' ? 12 : 8,
              backgroundColor:
                frame.kind === 'observed' ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.28)',
            }}
          />
        ))}

        {/* Now, drawn rather than implied. On an axis that runs from measured
            through modelled to forecast, this is the reference point every
            other tick is read against. */}
        {now !== null ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: now * Math.max(0, trackWidth - 2),
              width: 2,
              height: 18,
              borderRadius: 1,
              backgroundColor: '#ffffff',
            }}
          />
        ) : null}
      </View>

      <View style={{ height: 14 }}>
        {labelled.map((i) => (
          <Text
            key={frames[i].validAt}
            variant="caption"
            color="rgba(255,255,255,0.7)"
            style={{
              position: 'absolute',
              // Nudged so the middle labels centre on their tick while the two
              // ends stay inside the bar rather than hanging off it.
              left: fractions[i] * Math.max(0, trackWidth - 34),
              width: 34,
              textAlign: i === 0 ? 'left' : i === frames.length - 1 ? 'right' : 'center',
            }}
          >
            {clockTime(frames[i].validAt)}
          </Text>
        ))}
      </View>
    </View>
  );
}

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, View } from 'react-native';

import type { PrecipFrame, TimelineSpan } from '../../../shared/domain/precipitationTimeline';
import { Text } from '../../../shared/ui/Text';
import { dwellMs, frameIndexForFraction, nowFraction, timeFraction, timelineAxis } from './frames';
import type { MapChrome } from './mapChrome';
import { MAP_CHROME } from './mapChrome';

type Props = {
  frames: PrecipFrame[];
  index: number;
  playing: boolean;
  reduceMotion: boolean;
  span: TimelineSpan;
  nowIso: string;
  onSeek: (index: number) => void;
  /** Colours for the map's light or dark look. Dark when not given. */
  chrome?: MapChrome;
};

const TRACK_HEIGHT = 24;
const LINE_HEIGHT = 6;
/** At most this many times printed under the track. More than five and they
 * collide at phone width; fewer and the axis stops being readable. */
const MAX_LABELS = 5;
/** At most this many ticks: enough to read the scale, few enough to stay apart. */
const MAX_TICKS = 36;
const LABEL_WIDTH = 44;

function clockTime(iso: string): string {
  return iso.slice(11, 16);
}

/** "4 PM" on the hour, "4:30" off it, as the phone's own weather app labels
 * its timeline. Ghana keeps GMT all year, so the UTC clock is the local one. */
export function axisLabel(atMs: number): string {
  const date = new Date(atMs);
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const twelve = hours % 12 === 0 ? 12 : hours % 12;
  return minutes === 0 ? `${twelve} ${hours < 12 ? 'AM' : 'PM'}` : `${twelve}:${String(minutes).padStart(2, '0')}`;
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
export function TimelineScrubber({ frames, index, playing, reduceMotion, span, nowIso, onSeek, chrome = MAP_CHROME.dark }: Props) {
  const [trackWidth, setTrackWidth] = useState(0);
  /** How far along the fill is, 0 to 1. A fraction rather than a width, so a
   * relayout does not leave it pointing at the old track. */
  const progress = useRef(new Animated.Value(0)).current;

  const fractions = useMemo(() => frames.map((_, i) => timeFraction(frames, i)), [frames]);

  /** Ticks and times on a regular clock grid (see `timelineAxis`), so they sit
   * evenly along the strip whatever the frames' own spacing. */
  const axis = useMemo(() => timelineAxis(frames, MAX_TICKS, MAX_LABELS), [frames]);

  // The fill glides on the frame's own dwell so it arrives exactly as the next
  // frame paints. Under reduced motion, and when paused, it simply jumps.
  useEffect(() => {
    const target = fractions[index] ?? 0;
    if (reduceMotion || !playing) {
      progress.setValue(target);
      return;
    }
    Animated.timing(progress, {
      toValue: target,
      duration: dwellMs(frames[index] ?? frames[0], span),
      easing: Easing.linear,
      // A scale, not a width, so this runs on the native driver. Animating the
      // width meant a JavaScript tick and a layout pass on every frame for as
      // long as the timeline played, on the same thread that is also stepping
      // the map through its frames.
      useNativeDriver: true,
    }).start();
  }, [index, fractions, reduceMotion, playing, progress, frames, span]);

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

  /** The clock labels, with "Now" at the now marker. A clock label too close
   * to it to fit beside it gives way, so the two never overlap. */
  const labels = useMemo(() => {
    const clock = axis.labels.map((label) => ({
      key: String(label.atMs),
      fraction: label.fraction,
      text: axisLabel(label.atMs),
      isNow: false,
    }));
    if (now === null || trackWidth <= 0) return clock;
    const clear = LABEL_WIDTH / trackWidth;
    return [...clock.filter((label) => Math.abs(label.fraction - now) >= clear), { key: 'now', fraction: now, text: 'Now', isNow: true }];
  }, [axis.labels, now, trackWidth]);

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
            backgroundColor: chrome.track,
          }}
        />

        {/* Ticks inside the grey track, one per clock interval, so the scale
            reads without crowding the labels. Drawn before the fill, which
            covers the ones already played, as the phone's own weather app
            does. */}
        {axis.ticks.map((tick) => (
          <View
            key={tick.atMs}
            testID="timeline-tick"
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: tick.fraction * Math.max(0, trackWidth - 1.5),
              width: 1.5,
              height: LINE_HEIGHT,
              backgroundColor: chrome.tickForecast,
            }}
          />
        ))}

        {/* The fill is the thumb: the reference app has no separate handle, and
            a growing bar says "elapsed" more directly than a dot does. */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            height: LINE_HEIGHT,
            width: trackWidth,
            // Grows from the left edge rather than from the middle.
            transformOrigin: 'left',
            transform: [{ scaleX: progress }],
            borderRadius: LINE_HEIGHT / 2,
            backgroundColor: chrome.fill,
          }}
        />

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
              height: 14,
              borderRadius: 1,
              backgroundColor: chrome.now,
            }}
          />
        ) : null}
      </View>

      <View style={{ height: 16 }}>
        {labels.map((label) => {
          // "4 PM" with the AM/PM set smaller, as the reference app prints it.
          const suffix = / (AM|PM)$/.exec(label.text);
          return (
            <Text
              key={label.key}
              variant="caption"
              color={label.isNow ? chrome.text : chrome.muted}
              style={{
                position: 'absolute',
                // Centred on its tick, but kept inside the bar at either end.
                left: Math.min(Math.max(0, label.fraction * trackWidth - LABEL_WIDTH / 2), Math.max(0, trackWidth - LABEL_WIDTH)),
                width: LABEL_WIDTH,
                textAlign: 'center',
                fontSize: 12,
                fontWeight: label.isNow ? '700' : '600',
              }}
            >
              {suffix ? label.text.slice(0, suffix.index) : label.text}
              {suffix ? (
                <Text style={{ fontSize: 9, fontWeight: '600' }} color={label.isNow ? chrome.text : chrome.muted}>{` ${suffix[1]}`}</Text>
              ) : null}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

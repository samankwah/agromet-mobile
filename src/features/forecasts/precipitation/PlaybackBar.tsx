import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { PrecipFrame, TimelineSpan } from '../../../shared/domain/precipitationTimeline';
import { Card } from '../../../shared/ui/Card';
import { Text } from '../../../shared/ui/Text';
import { TimelineScrubber } from './TimelineScrubber';

type Props = {
  frames: PrecipFrame[];
  index: number;
  playing: boolean;
  canPlay: boolean;
  reduceMotion: boolean;
  span: TimelineSpan;
  onToggle: () => void;
  onSeek: (index: number) => void;
  onChangeSpan: (span: TimelineSpan) => void;
  nowIso: string;
  /** The one thing the reader most needs told about what they are looking at,
   * usually the satellite's lag and, when a source is down, which half of the
   * timeline is missing. */
  notice?: string;
};

/** How far ahead the timeline runs, matching the reference app's control. */
const SPANS: { id: TimelineSpan; label: string }[] = [
  { id: '1h', label: '1h' },
  { id: '12h', label: '12h' },
];

/** What the current frame actually is. A forecast presented as a measurement is
 * the one thing this screen must never do. */
const KIND_LABEL = {
  observed: 'Measured rainfall',
  analysis: 'Estimated rainfall',
  forecast: 'Forecast rainfall',
} as const;

/**
 * Fixed colours, not theme tokens.
 *
 * This bar floats on dark glass over a map that may be either light or dark, so
 * it is on a backdrop in the same sense the Daily view's photograph is, and
 * `AppHeader` already carries an `onBackdrop` prop for exactly this. Reading
 * `theme.colors.text` here would turn the label near-black in light mode, on a
 * panel that stays dark in both.
 */
const ON_MAP = {
  text: '#ffffff',
  muted: 'rgba(255,255,255,0.62)',
  control: 'rgba(255,255,255,0.14)',
  controlSelected: 'rgba(255,255,255,0.9)',
  controlSelectedText: '#101820',
};

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * The playback bar: what you are looking at, when it was, and the controls for
 * moving through it, in one panel floating over the bottom of the map.
 *
 * Replaces the `Drawer` this screen used to sit in. A drawer is right when a
 * map has filters to hide; this one has a scrubber that must stay visible and
 * reachable while the map fills the screen behind it.
 */
export function PlaybackBar({
  frames,
  index,
  playing,
  canPlay,
  reduceMotion,
  span,
  onToggle,
  onSeek,
  onChangeSpan,
  nowIso,
  notice,
}: Props) {
  const current = frames[index];

  return (
    <Card translucent style={{ padding: 14, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable
          onPress={onToggle}
          disabled={!canPlay}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canPlay }}
          accessibilityLabel={playing ? 'Pause rainfall animation' : 'Play rainfall animation'}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: ON_MAP.control,
            opacity: canPlay ? 1 : 0.45,
          }}
        >
          <Ionicons name={playing ? 'pause' : 'play'} size={18} color={ON_MAP.text} />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong" color={ON_MAP.text}>
            {current ? KIND_LABEL[current.kind] : 'Rainfall'}
          </Text>
          <Text variant="caption" color={ON_MAP.muted} numberOfLines={1}>
            {current ? formatDay(current.validAt) : ''}
          </Text>
        </View>

        <View
          accessibilityRole="tablist"
          accessibilityLabel="How far ahead to show"
          style={{ flexDirection: 'row', backgroundColor: ON_MAP.control, borderRadius: 999, padding: 3 }}
        >
          {SPANS.map((option) => {
            const selected = option.id === span;
            return (
              <Pressable
                key={option.id}
                onPress={() => onChangeSpan(option.id)}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                accessibilityLabel={option.id === '1h' ? 'Show 1 hour ahead' : 'Show 12 hours ahead'}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: selected ? ON_MAP.controlSelected : 'transparent',
                }}
              >
                <Text variant="caption" color={selected ? ON_MAP.controlSelectedText : ON_MAP.muted}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <TimelineScrubber
        frames={frames}
        index={index}
        playing={playing}
        reduceMotion={reduceMotion}
        span={span}
        nowIso={nowIso}
        onSeek={onSeek}
      />

      {notice ? (
        <Text variant="caption" color="rgba(255,255,255,0.75)">
          {notice}
        </Text>
      ) : null}

    </Card>
  );
}

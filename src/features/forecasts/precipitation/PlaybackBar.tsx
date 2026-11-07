import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { PrecipFrame, TimelineSpan } from '../../../shared/domain/precipitationTimeline';
import { Card } from '../../../shared/ui/Card';
import { Text } from '../../../shared/ui/Text';
import { MAP_CHROME, type MapChrome } from './mapChrome';
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
  /** Colours for the map's light or dark look. Dark when not given. */
  chrome?: MapChrome;
};

/** How far ahead the timeline runs, matching the reference app's control. */
const SPANS: { id: TimelineSpan; label: string }[] = [
  { id: '1h', label: '1h' },
  { id: '12h', label: '12h' },
];

/** What the current frame actually is, short as the phone's own weather app
 * titles its timeline. A forecast presented as a measurement is the one thing
 * this screen must never do. */
const KIND_LABEL = {
  observed: 'Measured',
  analysis: 'Estimated',
  forecast: 'Forecast',
} as const;

/** "Saturday 4:44 PM": the day and the time of the frame on screen. Ghana keeps
 * GMT all year, so the UTC clock is the local one. */
export function formatFrameTime(iso: string): string {
  const date = new Date(iso);
  const day = date.toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' });
  const hours = date.getUTCHours();
  const twelve = hours % 12 === 0 ? 12 : hours % 12;
  return `${day} ${twelve}:${String(date.getUTCMinutes()).padStart(2, '0')} ${hours < 12 ? 'AM' : 'PM'}`;
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
  chrome = MAP_CHROME.dark,
}: Props) {
  const ON_MAP = {
    text: chrome.text,
    muted: chrome.muted,
    control: chrome.control,
    controlSelected: chrome.controlSelected,
    controlSelectedText: chrome.controlSelectedText,
  };
  const current = frames[index];

  return (
    <Card translucent style={{ padding: 14, gap: 10, backgroundColor: chrome.card, borderColor: chrome.border }}>
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
            {current ? formatFrameTime(current.validAt) : ''}
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
        chrome={chrome}
      />

      {notice ? (
        <Text variant="caption" color={chrome.muted}>
          {notice}
        </Text>
      ) : null}
    </Card>
  );
}

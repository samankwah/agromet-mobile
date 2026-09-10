import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { useReduceMotion } from '../../../shared/a11y/useReduceMotion';
import type { PrecipFrame, TimelineSpan } from '../../../shared/domain/precipitationTimeline';
import { dwellMs, MIN_FRAMES_TO_PLAY, nextPlayableIndex, openingIndex } from './frames';

type Options = {
  frames: PrecipFrame[];
  span: TimelineSpan;
  /** `validAt` of every frame whose imagery has arrived. */
  ready: Set<string>;
  /** Used to open on the frame nearest now rather than at either end. */
  nowIso: string;
};

/**
 * The clock behind the rain animation.
 *
 * A chained `setTimeout` rather than a `setInterval`, because the interval is
 * not constant: a half-hour satellite frame is held for half as long as an
 * hourly model frame, so that the animation reads at one speed across a
 * timeline built from two cadences. A chain also cancels cleanly on unmount, on
 * blur, and on every scrub, which an interval does not.
 */
export function usePrecipitationPlayback({ frames, span, ready, nowIso }: Options) {
  const reduceMotion = useReduceMotion();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  /**
   * Readiness is read at fire time rather than depended on.
   *
   * It changes once per frame as imagery lands, and putting it in the effect's
   * dependencies would cancel and reschedule the pending timeout on every one
   * of those — so during loading, when frames are arriving fastest, the
   * animation would keep restarting its own dwell and never advance.
   */
  const readyRef = useRef(ready);
  readyRef.current = ready;

  /** Cell frames carry no imagery of their own, so they are playable the moment
   * the timeline exists; only the satellite frames have tiles to wait for. */
  const rasterCount = frames.filter((frame) => frame.render.type === 'raster').length;
  const canPlay =
    frames.length > 1 && (rasterCount === 0 || ready.size >= Math.min(MIN_FRAMES_TO_PLAY, rasterCount));

  // Open on the frame nearest now, and re-seat when a refresh or a span change
  // rebuilds the timeline. Also the guard against an index left dangling past
  // the end of a shorter list.
  useEffect(() => {
    setIndex(openingIndex(frames, nowIso));
  }, [frames, nowIso]);

  useEffect(() => {
    if (!playing || frames.length < 2) return undefined;

    const timer = setTimeout(() => {
      setIndex((current) =>
        nextPlayableIndex(
          frames,
          current,
          (frame) => frame.render.type === 'cells' || readyRef.current.has(frame.validAt),
        ),
      );
    }, dwellMs(frames[index] ?? frames[0], span));

    return () => clearTimeout(timer);
  }, [playing, index, frames, span]);

  /** Someone who has left the screen is not watching it, and a loop that keeps
   * running is a loop that keeps fetching tiles. */
  useFocusEffect(
    useCallback(() => {
      return () => setPlaying(false);
    }, []),
  );

  /** Reduced motion never autoplays, but the button still works: an animation
   * the reader explicitly asked for is not unwanted motion, and hiding the
   * control would remove the feature rather than calm it. */
  useEffect(() => {
    if (reduceMotion) setPlaying(false);
  }, [reduceMotion]);

  const toggle = useCallback(() => setPlaying((current) => !current), []);

  /** Scrubbing is a seek, and a seek pauses. Letting playback carry on would
   * fight the finger that is dragging the thumb. */
  const seek = useCallback((next: number) => {
    setPlaying(false);
    setIndex(next);
  }, []);

  return { index, playing, canPlay, reduceMotion, toggle, seek };
}

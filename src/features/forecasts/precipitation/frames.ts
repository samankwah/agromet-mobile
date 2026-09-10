import type { PrecipFrame, TimelineSpan } from '../../../shared/domain/precipitationTimeline';

/**
 * The pure arithmetic of the rain timeline: how long a frame is held, where it
 * sits on the axis, and which frame comes next.
 *
 * Kept apart from the clock and from the map on purpose. Everything here is a
 * function of its arguments, so the awkward cases — a timeline of one frame, a
 * scrub that lands inside a gap in the data, a loop where half the frames have
 * not loaded — are testable without a device or a WebView.
 */

/**
 * Weather-minutes played per second of real time.
 *
 * Pacing on weather-time rather than on frames is what stops the animation
 * visibly changing speed when it crosses from satellite frames, which are half
 * an hour apart, to model frames, which are an hour apart. The longer span runs
 * faster because it has more ground to cover and a reader watching a whole day
 * wants the shape of it, not every step.
 */
export const PLAYBACK_RATE: Record<TimelineSpan, number> = { '1h': 90, '12h': 150 };

/**
 * How many satellite frames the timeline reaches back for.
 *
 * Fixed rather than per-span, because the span now governs how far *ahead* the
 * timeline runs, matching the reference app's 1h/12h control. The measured past
 * is a constant three hours: enough to see a squall line moving, not so much
 * that it crowds out the forecast the reader came for.
 */
export const OBSERVED_FRAME_COUNT = 6;

/** How many hours past now each span shows. */
export const LOOK_AHEAD_HOURS: Record<TimelineSpan, number> = { '1h': 1, '12h': 12 };

/**
 * Enough frames loaded to be worth starting.
 *
 * Playing from the first frame the moment it arrives means the loop spends its
 * opening seconds skipping frames that are still downloading, which reads as a
 * stutter rather than as weather.
 */
export const MIN_FRAMES_TO_PLAY = 3;

/** How long this frame is held on screen. */
export function dwellMs(frame: PrecipFrame, span: TimelineSpan): number {
  return (frame.stepMinutes / PLAYBACK_RATE[span]) * 1000;
}

/**
 * Where a frame sits on the axis, as a fraction from 0 to 1.
 *
 * Linear in clock time, not in frame index. The frames are unevenly spaced —
 * two cadences, and a gap of several hours where the satellite has stopped but
 * the forecast has not started — and an index-linear axis would hide exactly
 * the thing the reader most needs to see.
 */
export function timeFraction(frames: PrecipFrame[], index: number): number {
  if (frames.length < 2) return 0;
  const first = Date.parse(frames[0].validAt);
  const span = Date.parse(frames[frames.length - 1].validAt) - first;
  if (span <= 0) return 0;
  return (Date.parse(frames[index].validAt) - first) / span;
}

/**
 * The frame nearest a point on the axis, given as a fraction from 0 to 1.
 *
 * Nearest by time rather than by index, for the same reason the axis is drawn
 * that way: dragging to the middle of a six-hour gap should land on whichever
 * side is genuinely closer, not on the frame that happens to be halfway
 * through the list.
 */
export function frameIndexForFraction(frames: PrecipFrame[], fraction: number): number {
  if (frames.length === 0) return 0;
  const clamped = Math.min(Math.max(fraction, 0), 1);
  const first = Date.parse(frames[0].validAt);
  const span = Date.parse(frames[frames.length - 1].validAt) - first;
  const target = first + clamped * span;

  let best = 0;
  let bestDistance = Infinity;
  frames.forEach((frame, index) => {
    const distance = Math.abs(Date.parse(frame.validAt) - target);
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  });
  return best;
}

/**
 * The next frame to paint, wrapping at the end.
 *
 * Skips frames whose imagery has not arrived rather than painting an empty map
 * for a beat: never show a frame we do not have. If nothing ahead is ready the
 * current frame is held, so the loop waits rather than flickering through
 * blanks.
 */
export function nextPlayableIndex(
  frames: PrecipFrame[],
  from: number,
  isReady: (frame: PrecipFrame) => boolean,
): number {
  for (let step = 1; step <= frames.length; step += 1) {
    const candidate = (from + step) % frames.length;
    if (isReady(frames[candidate])) return candidate;
  }
  return from;
}

/**
 * Where "Now" falls on the axis, as a fraction from 0 to 1.
 *
 * Drawn rather than implied: the reference app marks it, and on a timeline that
 * runs from measured through modelled to forecast it is the single most
 * important reference point on the strip.
 */
export function nowFraction(frames: PrecipFrame[], nowIso: string): number | null {
  if (frames.length < 2) return null;
  const first = Date.parse(frames[0].validAt);
  const span = Date.parse(frames[frames.length - 1].validAt) - first;
  if (span <= 0) return null;
  const fraction = (Date.parse(nowIso) - first) / span;
  return fraction >= 0 && fraction <= 1 ? fraction : null;
}

/**
 * Where playback opens: the frame nearest now.
 *
 * Not the newest frame, now that the timeline runs into the forecast. Someone
 * opening a rain map wants to know what is happening, and landing them twelve
 * hours in the future would answer a question they did not ask.
 */
export function openingIndex(frames: PrecipFrame[], nowIso: string): number {
  if (frames.length === 0) return 0;
  const fraction = nowFraction(frames, nowIso);
  return fraction === null ? frames.length - 1 : frameIndexForFraction(frames, fraction);
}

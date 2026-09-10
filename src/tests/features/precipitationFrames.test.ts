import type { PrecipFrame } from '../../shared/domain/precipitationTimeline';
import {
  dwellMs,
  frameIndexForFraction,
  LOOK_AHEAD_HOURS,
  nextPlayableIndex,
  nowFraction,
  openingIndex,
  PLAYBACK_RATE,
  timeFraction,
} from '../../features/forecasts/precipitation/frames';

function frame(validAt: string, stepMinutes: number, kind: PrecipFrame['kind'] = 'observed'): PrecipFrame {
  return {
    validAt,
    stepMinutes,
    kind,
    render: { type: 'raster', tileUrlTemplate: `tiles/${validAt}`, maxZoom: 6 },
  };
}

/* A timeline shaped like the real one will be: half-hourly satellite frames,
   then a multi-hour hole where the satellite has stopped, then hourly model
   frames. Nearly every interesting case lives at that hole. */
const MIXED: PrecipFrame[] = [
  frame('2026-08-26T09:00:00.000Z', 30),
  frame('2026-08-26T09:30:00.000Z', 30),
  frame('2026-08-26T10:00:00.000Z', 30),
  frame('2026-08-26T16:00:00.000Z', 60, 'forecast'),
  frame('2026-08-26T17:00:00.000Z', 60, 'forecast'),
];

describe('dwellMs', () => {
  /* The whole reason playback paces on weather-time: a half-hour frame and an
     hour frame must read at the same apparent speed, or the animation lurches
     as it crosses from satellite to model. */
  it('holds an hourly frame exactly twice as long as a half-hourly one', () => {
    expect(dwellMs(MIXED[3], '1h')).toBeCloseTo(dwellMs(MIXED[0], '1h') * 2);
  });

  it('converts weather-minutes to real seconds at the span rate', () => {
    expect(dwellMs(frame('2026-08-26T09:00:00.000Z', 60), '1h')).toBeCloseTo((60 / PLAYBACK_RATE['1h']) * 1000);
  });

  it('runs the longer span faster, because it has more ground to cover', () => {
    expect(dwellMs(MIXED[0], '12h')).toBeLessThan(dwellMs(MIXED[0], '1h'));
  });
});

describe('timeFraction', () => {
  it('pins the ends to 0 and 1', () => {
    expect(timeFraction(MIXED, 0)).toBe(0);
    expect(timeFraction(MIXED, MIXED.length - 1)).toBe(1);
  });

  /* The axis is linear in clock time, not in frame index. Index 2 is the middle
     of the list but only an hour into an eight-hour span, so it must sit near
     the left. An index-linear axis would put it at 0.5 and hide the gap. */
  it('places frames by clock time, not by position in the list', () => {
    expect(timeFraction(MIXED, 2)).toBeCloseTo(1 / 8);
    expect(timeFraction(MIXED, 2)).not.toBeCloseTo(0.5);
  });

  it('does not divide by zero on a single frame', () => {
    expect(timeFraction([MIXED[0]], 0)).toBe(0);
  });
});

describe('frameIndexForFraction', () => {
  it('clamps beyond either end', () => {
    expect(frameIndexForFraction(MIXED, -1)).toBe(0);
    expect(frameIndexForFraction(MIXED, 2)).toBe(MIXED.length - 1);
  });

  /* Dragging into the middle of the hole should land on whichever side is
     genuinely nearer in time. Halfway across the eight-hour span is 13:00,
     which is three hours from 10:00 and three from 16:00; a hair past it must
     fall to the later frame. */
  it('resolves a scrub inside the gap to the nearer side in time', () => {
    expect(frameIndexForFraction(MIXED, 0.4)).toBe(2);
    expect(frameIndexForFraction(MIXED, 0.6)).toBe(3);
  });
});

describe('nextPlayableIndex', () => {
  const all = () => true;

  it('advances and wraps', () => {
    expect(nextPlayableIndex(MIXED, 0, all)).toBe(1);
    expect(nextPlayableIndex(MIXED, MIXED.length - 1, all)).toBe(0);
  });

  /* Never paint a frame we do not have: skip it rather than showing an empty
     map for a beat. */
  it('skips frames whose imagery has not arrived', () => {
    const ready = new Set([MIXED[0].validAt, MIXED[3].validAt]);
    expect(nextPlayableIndex(MIXED, 0, (f) => ready.has(f.validAt))).toBe(3);
  });

  /* With nothing loaded the loop waits on the current frame. Returning a
     different index would flick through blanks. */
  it('holds when nothing is ready', () => {
    expect(nextPlayableIndex(MIXED, 2, () => false)).toBe(2);
  });
});

describe('look ahead', () => {
  /* The span control governs how far into the forecast the timeline runs, which
     is what the reference app's 1h/12h toggle does. The labels have to be true
     of the hours actually shown. */
  it('matches the hours its label claims', () => {
    expect(LOOK_AHEAD_HOURS['1h']).toBe(1);
    expect(LOOK_AHEAD_HOURS['12h']).toBe(12);
  });
});

describe('nowFraction', () => {
  /* Now sits between the measured half and the forecast half, and the marker is
     the reference point every other tick is read against. */
  it('places now on the axis by clock time', () => {
    expect(nowFraction(MIXED, '2026-08-26T13:00:00.000Z')).toBeCloseTo(0.5);
    expect(nowFraction(MIXED, '2026-08-26T09:00:00.000Z')).toBe(0);
  });

  /* A now that falls outside the timeline has no position on it, and drawing a
     marker clamped to an end would claim otherwise. */
  it('returns null when now is off the axis', () => {
    expect(nowFraction(MIXED, '2026-08-25T00:00:00.000Z')).toBeNull();
    expect(nowFraction(MIXED, '2026-08-27T00:00:00.000Z')).toBeNull();
  });
});

describe('openingIndex', () => {
  /* Opens on the frame nearest now, not at either end: landing the reader
     twelve hours into the forecast answers a question they did not ask. */
  it('opens nearest now', () => {
    expect(openingIndex(MIXED, '2026-08-26T09:35:00.000Z')).toBe(1);
    // 16:50 is ten minutes from the 17:00 frame and fifty from the 16:00 one.
    expect(openingIndex(MIXED, '2026-08-26T16:50:00.000Z')).toBe(4);
    expect(openingIndex(MIXED, '2026-08-26T16:10:00.000Z')).toBe(3);
  });

  it('falls back to the newest frame when now is off the axis', () => {
    expect(openingIndex(MIXED, '2026-08-25T00:00:00.000Z')).toBe(MIXED.length - 1);
    expect(openingIndex([], '2026-08-26T09:00:00.000Z')).toBe(0);
  });
});

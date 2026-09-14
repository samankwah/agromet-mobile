import {
  BASE_BODY_FONT_SIZE,
  CARD_BASE_WIDTH,
  MARQUEE_SPEED_PPS,
  cityCardHeight,
  cityCardWidth,
  citySnapOffsets,
  marqueeCycleWidth,
  marqueeOffsetAt,
} from '../../features/home/cityCarouselLayout';
import { scaleTypeScale, typeScale } from '../../shared/theme/tokens';

describe('cityCardWidth', () => {
  it('is the base width at the standard text size', () => {
    expect(cityCardWidth(BASE_BODY_FONT_SIZE)).toBe(CARD_BASE_WIDTH);
  });

  /* The card's whole job is naming a place. A fixed width would hold
     'Bolgatanga' at the standard size and clip it at every larger one, so the
     width has to track the farmer's text-size preference. */
  it('grows with each text-size preference', () => {
    const widthFor = (size: Parameters<typeof scaleTypeScale>[1]) =>
      cityCardWidth(scaleTypeScale(typeScale, size).bodyStrong.fontSize);

    const standard = widthFor('standard');
    const large = widthFor('large');
    const extraLarge = widthFor('extra-large');

    expect(standard).toBe(CARD_BASE_WIDTH);
    expect(large).toBeGreaterThan(standard);
    expect(extraLarge).toBeGreaterThan(large);
  });

  it('returns whole pixels', () => {
    const width = cityCardWidth(scaleTypeScale(typeScale, 'large').bodyStrong.fontSize);
    expect(Number.isInteger(width)).toBe(true);
  });
});

describe('citySnapOffsets', () => {
  it('gives one offset per town', () => {
    expect(citySnapOffsets(10, 112, 8)).toHaveLength(10);
  });

  /* Offsets are scroll positions, not positions inside the content. The first
     is 0 — the content container's own padding is what puts card 0 on the page
     gutter, which is precisely why snapToInterval would be wrong here. */
  it('starts at zero and steps by one card plus the gap', () => {
    expect(citySnapOffsets(4, 112, 8)).toEqual([0, 120, 240, 360]);
  });

  it('steps by the scaled width when text is larger', () => {
    const wide = cityCardWidth(scaleTypeScale(typeScale, 'extra-large').bodyStrong.fontSize);
    const [first, second] = citySnapOffsets(2, wide, 8);

    expect(first).toBe(0);
    expect(second).toBe(wide + 8);
  });

  it('has no offsets for an empty list', () => {
    expect(citySnapOffsets(0, 112, 8)).toEqual([]);
  });
});

describe('marqueeCycleWidth', () => {
  /* The row renders the towns twice and slides by exactly one cycle, so the
     loop must restart on a frame identical to its first. One card too few or
     too many and the strip visibly hitches once per pass. */
  it('is one full pass of the towns, card and gap alike', () => {
    expect(marqueeCycleWidth(10, 120, 8)).toBe(1280);
  });

  it('follows the card width when text is larger', () => {
    const wide = cityCardWidth(scaleTypeScale(typeScale, 'extra-large').bodyStrong.fontSize);
    expect(marqueeCycleWidth(10, wide, 8)).toBe(10 * (wide + 8));
  });

  it('is nothing when there are no towns', () => {
    expect(marqueeCycleWidth(0, 120, 8)).toBe(0);
  });
});

describe('marqueeOffsetAt', () => {
  const CYCLE = marqueeCycleWidth(10, 120, 8);

  it('starts at the beginning', () => {
    expect(marqueeOffsetAt(0, CYCLE)).toBe(0);
  });

  it('travels at the stated speed', () => {
    expect(marqueeOffsetAt(1000, CYCLE)).toBeCloseTo(MARQUEE_SPEED_PPS);
    expect(marqueeOffsetAt(10_000, CYCLE)).toBeCloseTo(MARQUEE_SPEED_PPS * 10);
  });

  /* This is what the scroller is handed when the farmer takes hold of a strip
     mid-flow, so it has to stay inside one cycle however long the app has been
     sitting open. */
  it('wraps into a single cycle', () => {
    const oneCycleMs = (CYCLE / MARQUEE_SPEED_PPS) * 1000;

    expect(marqueeOffsetAt(oneCycleMs, CYCLE)).toBeCloseTo(0);
    expect(marqueeOffsetAt(oneCycleMs * 3.5, CYCLE)).toBeCloseTo(CYCLE / 2);
    expect(marqueeOffsetAt(oneCycleMs * 200, CYCLE)).toBeLessThan(CYCLE);
  });

  it('never reports a negative distance', () => {
    expect(marqueeOffsetAt(-5000, CYCLE)).toBe(0);
  });

  it('is zero when there is no cycle to travel', () => {
    expect(marqueeOffsetAt(9999, 0)).toBe(0);
  });
});

describe('cityCardHeight', () => {
  // The values the component passes at the standard type scale: body lineHeight
  // 21, spacing.sm 8, spacing.xs 4, and a 44 touch target plus 16.
  const STANDARD = [21, 8, 4, 60] as const;

  it('fits two lines of text, the gap between them and the padding', () => {
    // 21 + 21 + 4 + 8 + 8
    expect(cityCardHeight(...STANDARD)).toBe(62);
  });

  it('never returns less than a comfortable touch target', () => {
    // Small type would otherwise produce a card too short to tap reliably.
    expect(cityCardHeight(10, 2, 2, 60)).toBe(60);
  });

  it('grows with the farmer’s text-size preference', () => {
    const standard = cityCardHeight(...STANDARD);
    const large = cityCardHeight(24, 8, 4, 60);
    const extraLarge = cityCardHeight(27, 8, 4, 60);

    expect(large).toBeGreaterThan(standard);
    expect(extraLarge).toBeGreaterThan(large);
  });

  it('returns a whole number, because a fractional height blurs the painted edge', () => {
    const height = cityCardHeight(21.5, 8, 4, 60);

    expect(Number.isInteger(height)).toBe(true);
  });
});

/**
 * Geometry for the Home city carousel.
 *
 * Pulled out of the component for one reason: Jest can run neither scroll
 * physics nor `onLayout`, so the arithmetic that decides where a card lands is
 * the only part of the snapping that can actually be asserted. Keeping it pure
 * makes it testable; keeping it in one place stops the card width and the snap
 * offsets drifting apart, which would leave cards resting a few pixels off the
 * gutter with nothing obviously wrong in the code.
 */

/** `typeScale.bodyStrong.fontSize` at the 'standard' text-size setting. */
export const BASE_BODY_FONT_SIZE = 15;

/**
 * Card width at the standard type scale.
 *
 * Sized to hold the longest city name — 'Bolgatanga' — plus the card's own
 * horizontal padding, with the name still on one line.
 *
 * Measured, not guessed: at 15px semibold Noto Sans 'Bolgatanga' lays out at
 * 84.1px and 'Cape Coast' at 81.5px. 112 left under 2px of headroom, which any
 * font-metric difference on a real device would swallow, so this carries about
 * 10px instead. The standard size is the tight case — the 24px of horizontal
 * padding does not scale with the type, so every larger setting has
 * proportionally more room, not less.
 */
export const CARD_BASE_WIDTH = 120;

/**
 * How wide each card should be for the given resolved body font size.
 *
 * Scaled rather than fixed because the app lets the farmer choose Large or
 * Extra large text (`scaleTypeScale` in `theme/tokens.ts`). A hardcoded width
 * would hold 'Bolgatanga' at 'standard' and clip it at every larger setting —
 * on the one screen element whose entire job is naming a place.
 */
export function cityCardWidth(bodyFontSize: number): number {
  return Math.round(CARD_BASE_WIDTH * (bodyFontSize / BASE_BODY_FONT_SIZE));
}

/**
 * The `contentOffset.x` at which each card sits flush against the page gutter.
 *
 * These are scroll offsets, not positions within the content: the carousel's
 * content container carries `paddingHorizontal` equal to the page gutter, so
 * scrolling to `index * (cardWidth + gap)` puts card `index`'s left edge
 * exactly where the cards above and below it start. That padding is also why
 * `snapToOffsets` is used instead of `snapToInterval` — an interval is measured
 * from zero and would land every card short by the width of the gutter.
 */
export function citySnapOffsets(count: number, cardWidth: number, gap: number): number[] {
  return Array.from({ length: count }, (_, index) => index * (cardWidth + gap));
}

/**
 * How fast the unattended strip flows, in points per second.
 *
 * Slow on purpose. This is a reading speed, not a transition: every town should
 * be legible as it passes and still be a tappable target, which a strip moving
 * at any pace you would notice as "sliding" is not.
 */
export const MARQUEE_SPEED_PPS = 24;

/**
 * Width of one full pass of the towns, which is also the distance the flowing
 * row travels before it repeats.
 *
 * The row renders the towns twice, so translating by exactly this much lines
 * the second copy up where the first began — the loop restarts on an identical
 * frame and there is no visible rewind. Every card is the same width, so this
 * is arithmetic; nothing has to be measured.
 */
export function marqueeCycleWidth(count: number, cardWidth: number, gap: number): number {
  return count * (cardWidth + gap);
}

/**
 * How far the row has flowed after `elapsedMs`, as a positive distance.
 *
 * Wrapped into a single cycle so it can be handed to a ScrollView as a starting
 * offset when the farmer takes hold of the strip — the flow stops and the
 * scroller picks up exactly where the eye left it, instead of the strip
 * snapping back to the first town.
 */
export function marqueeOffsetAt(elapsedMs: number, cycleWidth: number): number {
  if (cycleWidth <= 0) return 0;
  const travelled = (Math.max(0, elapsedMs) / 1000) * MARQUEE_SPEED_PPS;
  return travelled % cycleWidth;
}

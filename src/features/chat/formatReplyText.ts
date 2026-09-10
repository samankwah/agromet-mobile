/**
 * Tidies the assistant's reply before it enters the transcript.
 *
 * This used to strip the light markdown the model writes -- `**bold**`, `#`
 * headings, `- ` bullets -- because there was no renderer for it and adding
 * `react-native-markdown-display` would have brought its own type scale and
 * colours to reconcile against `ui/Text`.
 *
 * Both halves of that have changed. The prompt now asks for short plain prose
 * with a dash list for steps and no tables or headings, so what arrives is a
 * small and known set; and `richText.ts` renders exactly that set out of this
 * app's own tokens, no library. Stripping would now be throwing away structure
 * the reply was asked to have.
 *
 * What is left here is whitespace. The model pads its sections out, and dead
 * space inside a bubble is the one thing a phone screen has none of.
 */
export function formatReplyText(text: string): string {
  return (
    text
      // Two newlines is a paragraph break; more is just air.
      .replace(/\n{3,}/g, '\n\n')
      // Trailing spaces survive a line break and show up as a ragged right edge
      // once the bubble wraps.
      .replace(/[ \t]+$/gm, '')
      .trim()
  );
}

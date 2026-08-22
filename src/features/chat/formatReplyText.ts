/**
 * Normalises the assistant's reply for plain-text rendering.
 *
 * The model returns light markdown — `**bold**`, `#` headings, `- ` bullets —
 * because nothing tells it not to. The web app renders those with four regexes
 * into `dangerouslySetInnerHTML`; here there is no HTML, and no markdown
 * renderer is installed.
 *
 * Adding one was considered and rejected: `react-native-markdown-display` would
 * arrive with its own type scale and colours to reconcile against `ui/Text`,
 * for a handful of emphasis markers. Stripping the syntax instead loses the
 * bold, keeps every word, and costs nothing. Bullets become `•`, which reads
 * better than `-` anyway.
 *
 * This is deliberately not a markdown parser and should not grow into one. It
 * does not touch tables, links or code fences — if replies start containing
 * those, the answer is to tell the model not to, not to extend this.
 */
export function formatReplyText(text: string): string {
  return (
    text
      // Bold and italic markers, innermost first so `**a**` does not leave a stray `*`.
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/__(.+?)__/g, '$1')
      .replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, '$1$2')
      // Leading heading hashes, keeping the heading's own words as a line.
      .replace(/^#{1,6}[ \t]+/gm, '')
      // Bullets, whatever the model chose to mark them with.
      .replace(/^([ \t]*)[-*+][ \t]+/gm, '$1• ')
      // The model likes to pad sections out; two newlines is a paragraph break,
      // more is just dead space in a bubble.
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

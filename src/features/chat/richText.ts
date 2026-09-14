/**
 * The little bit of structure an assistant reply actually has.
 *
 * `formatReplyText` used to strip markdown out and hand the bubble one flat
 * string. That was the right call when the model was writing whatever it liked
 * and no renderer existed: stripping lost the bold, kept every word, and cost
 * nothing.
 *
 * What changed is the prompt. The assistant is now told to write short plain
 * prose with a dash list for steps and no tables or headings, so the structure
 * arriving here is small, known, and worth keeping: a planting schedule read as
 * four numbered steps is a different thing from the same words run together in
 * a paragraph, and that difference is the whole answer for someone reading it
 * on a phone at the edge of a field.
 *
 * So this parses that small set and nothing else. It is deliberately not a
 * markdown parser and must not grow into one -- no tables, no code fences, no
 * links, no nesting. If replies start containing those, the fix is the prompt,
 * not this file.
 */

export type InlineSpan = { text: string; bold?: boolean };

export type RichBlock =
  | { kind: 'paragraph'; spans: InlineSpan[] }
  | { kind: 'bullet'; spans: InlineSpan[] }
  | { kind: 'numbered'; label: string; spans: InlineSpan[] };

const BULLET = /^[ \t]*[-*+•][ \t]+(.*)$/;
const NUMBERED = /^[ \t]*(\d{1,2})[.)][ \t]+(.*)$/;
const HEADING = /^[ \t]*#{1,6}[ \t]+(.*)$/;

/**
 * Split one line into bold and plain runs.
 *
 * An unmatched marker is left exactly as it was typed: "a 2*3 metre plot" is a
 * plot size, not the start of an emphasis that never ends, and eating the rest
 * of the line to find its partner is the classic way a naive parser mangles a
 * measurement.
 */
export function parseInline(line: string): InlineSpan[] {
  const spans: InlineSpan[] = [];
  const pattern = /\*\*(.+?)\*\*|__(.+?)__/g;
  let index = 0;

  for (let match = pattern.exec(line); match; match = pattern.exec(line)) {
    if (match.index > index) {
      spans.push({ text: line.slice(index, match.index) });
    }
    spans.push({ text: match[1] ?? match[2], bold: true });
    index = match.index + match[0].length;
  }

  if (index < line.length) {
    spans.push({ text: line.slice(index) });
  }

  return spans.length > 0 ? spans : [{ text: line }];
}

/**
 * The reply as blocks, in reading order.
 *
 * Consecutive plain lines stay in one block with their newlines intact rather
 * than being reflowed into a single run. The model breaks lines where it means
 * to, and rejoining them would move a "Then:" onto the end of the sentence
 * above it.
 */
export function parseRichText(text: string): RichBlock[] {
  const blocks: RichBlock[] = [];
  let paragraph: string[] = [];

  const flush = () => {
    if (paragraph.length === 0) return;
    blocks.push({ kind: 'paragraph', spans: parseInline(paragraph.join('\n')) });
    paragraph = [];
  };

  for (const line of text.split('\n')) {
    if (!line.trim()) {
      flush();
      continue;
    }

    const numbered = NUMBERED.exec(line);
    if (numbered) {
      flush();
      blocks.push({ kind: 'numbered', label: `${numbered[1]}.`, spans: parseInline(numbered[2]) });
      continue;
    }

    const bullet = BULLET.exec(line);
    if (bullet) {
      flush();
      blocks.push({ kind: 'bullet', spans: parseInline(bullet[1]) });
      continue;
    }

    // A heading is not asked for and not rendered as one. It becomes a line of
    // emphasis instead, which keeps the words and refuses to introduce a type
    // scale this design system does not use inside a bubble.
    const heading = HEADING.exec(line);
    if (heading) {
      flush();
      blocks.push({ kind: 'paragraph', spans: [{ text: heading[1], bold: true }] });
      continue;
    }

    paragraph.push(line);
  }

  flush();
  return blocks;
}

/**
 * The same words with every marker gone.
 *
 * For the screen reader and for read-aloud: a label containing "**" is read out
 * as punctuation by some engines and silently by others, and neither is what
 * the sentence says.
 */
export function toPlainText(text: string): string {
  return parseRichText(text)
    .map((block) => {
      const words = block.spans.map((span) => span.text).join('');
      if (block.kind === 'bullet') return `• ${words}`;
      if (block.kind === 'numbered') return `${block.label} ${words}`;
      return words;
    })
    .join('\n');
}

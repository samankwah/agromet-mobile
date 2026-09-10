import { formatReplyText } from '../../features/chat/formatReplyText';
import { parseInline, parseRichText, toPlainText } from '../../features/chat/richText';

describe('formatReplyText', () => {
  it('leaves the reply’s own emphasis alone', () => {
    /* It used to strip these. It no longer does, because `richText` renders
       them: the model is asked to bold the thing the farmer must act on, and
       throwing that away flattened the one word that mattered. */
    expect(formatReplyText('Plant **maize** in the *major* season')).toBe('Plant **maize** in the *major* season');
  });

  it('collapses padded sections to one paragraph break', () => {
    expect(formatReplyText('First.\n\n\n\nSecond.')).toBe('First.\n\nSecond.');
  });

  it('trims the ragged right edge a wrapped bubble would show', () => {
    expect(formatReplyText('First line.   \nSecond line.')).toBe('First line.\nSecond line.');
  });

  it('handles an empty reply without throwing', () => {
    expect(formatReplyText('')).toBe('');
    expect(formatReplyText('   \n  ')).toBe('');
  });
});

describe('parsing a reply into blocks', () => {
  it('reads a plain answer as one paragraph', () => {
    const blocks = parseRichText('Plant when the rains have settled.');

    expect(blocks).toEqual([{ kind: 'paragraph', spans: [{ text: 'Plant when the rains have settled.' }] }]);
  });

  it('keeps the line breaks the model chose inside a paragraph', () => {
    /* Rejoining them would move a "Then:" onto the end of the sentence above. */
    const [block] = parseRichText('Check the soil.\nThen wait.');

    expect(block.spans[0].text).toBe('Check the soil.\nThen wait.');
  });

  it('reads a dash list as bullets, however the model marked them', () => {
    const blocks = parseRichText('- drainage\n* seed quality\n+ pests');

    expect(blocks.map((block) => block.kind)).toEqual(['bullet', 'bullet', 'bullet']);
    expect(blocks[1].spans[0].text).toBe('seed quality');
  });

  it('reads numbered steps as numbered, keeping their own numbers', () => {
    const blocks = parseRichText('1. Clear the drains\n2) Move the seedlings');

    expect(blocks).toEqual([
      { kind: 'numbered', label: '1.', spans: [{ text: 'Clear the drains' }] },
      { kind: 'numbered', label: '2.', spans: [{ text: 'Move the seedlings' }] },
    ]);
  });

  it('demotes a heading to a line of emphasis rather than a new type size', () => {
    const blocks = parseRichText('## Before planting\nCheck the soil.');

    expect(blocks[0]).toEqual({ kind: 'paragraph', spans: [{ text: 'Before planting', bold: true }] });
    expect(blocks[1].kind).toBe('paragraph');
  });

  it('separates paragraphs on a blank line', () => {
    expect(parseRichText('First.\n\nSecond.')).toHaveLength(2);
  });

  it('reads an empty reply as nothing at all', () => {
    expect(parseRichText('')).toEqual([]);
  });
});

describe('parsing emphasis inside a line', () => {
  it('splits bold from the words around it', () => {
    expect(parseInline('Plant **maize** now')).toEqual([{ text: 'Plant ' }, { text: 'maize', bold: true }, { text: ' now' }]);
  });

  it('treats underscores the same way', () => {
    expect(parseInline('Use __certified__ seed')).toEqual([{ text: 'Use ' }, { text: 'certified', bold: true }, { text: ' seed' }]);
  });

  it('leaves an unmatched marker exactly as typed', () => {
    /* "A 2*3 metre plot" is a plot size. Hunting for a closing marker would eat
       the rest of the line to find one that is not there. */
    expect(parseInline('A 2*3 metre plot')).toEqual([{ text: 'A 2*3 metre plot' }]);
    expect(parseInline('Rain **is coming')).toEqual([{ text: 'Rain **is coming' }]);
  });
});

describe('the plain-text reading of a reply', () => {
  it('drops the markers for the screen reader and read-aloud', () => {
    /* A label containing "**" is read out as punctuation by some engines and
       silently by others, and neither is what the sentence says. */
    expect(toPlainText('Plant **maize** now')).toBe('Plant maize now');
  });

  it('speaks a list as a list', () => {
    expect(toPlainText('- drainage\n- seed')).toBe('• drainage\n• seed');
    expect(toPlainText('1. Clear the drains')).toBe('1. Clear the drains');
  });
});

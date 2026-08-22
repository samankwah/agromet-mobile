import { formatReplyText } from '../../features/chat/formatReplyText';

describe('formatReplyText', () => {
  it('strips bold and italic markers but keeps the words', () => {
    expect(formatReplyText('Plant **maize** in the *major* season')).toBe(
      'Plant maize in the major season',
    );
    expect(formatReplyText('Use __certified__ seed')).toBe('Use certified seed');
  });

  it('leaves an unmatched marker alone rather than eating the rest of the line', () => {
    expect(formatReplyText('A 2*3 metre plot')).toBe('A 2*3 metre plot');
    expect(formatReplyText('Rain **is coming')).toBe('Rain **is coming');
  });

  it('normalises bullets to a single mark, whatever the model chose', () => {
    expect(formatReplyText('- drainage\n* seed quality\n+ pests')).toBe(
      '• drainage\n• seed quality\n• pests',
    );
  });

  it('keeps a heading as a line of prose', () => {
    expect(formatReplyText('## Before planting\nCheck the soil.')).toBe(
      'Before planting\nCheck the soil.',
    );
  });

  it('collapses padded sections to one paragraph break', () => {
    expect(formatReplyText('First.\n\n\n\nSecond.')).toBe('First.\n\nSecond.');
  });

  it('handles an empty reply without throwing', () => {
    expect(formatReplyText('')).toBe('');
    expect(formatReplyText('   \n  ')).toBe('');
  });
});

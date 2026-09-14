import { formatImageAnswer } from '../../shared/api/imageQuestionService';

/**
 * The wording is the product here: this answer lands in a chat bubble, so it
 * has to read as a reply rather than a dumped record.
 */
describe('formatImageAnswer', () => {
  it('names the disease, the plant, and how sure it is', () => {
    const text = formatImageAnswer({
      status: 'ok',
      analysis: {
        identified_disease: 'Maize streak virus',
        plant: 'maize',
        confidence: 0.82,
        treatment: 'Remove infected plants.',
      },
    });

    expect(text).toContain('Maize streak virus');
    expect(text).toContain('maize');
    expect(text).toContain('High confidence (70–100%)');
    expect(text).toContain('Remove infected plants.');
  });

  it('points at the screen that keeps the record', () => {
    // The chat answers the question; Diagnose files the photo, numbers the
    // steps and remembers it. Saying so beats duplicating that here.
    const text = formatImageAnswer({
      status: 'ok',
      analysis: { identified_disease: 'Leaf rust', plant: 'maize', confidence: 0.9 },
    });

    expect(text).toMatch(/Diagnose a crop/);
  });

  it('repeats the provider reason rather than a generic apology', () => {
    const text = formatImageAnswer({ status: 'unavailable', message: 'That image is not a plant.' });

    expect(text).toBe('That image is not a plant.');
  });

  it('still says something useful when the provider says nothing at all', () => {
    const text = formatImageAnswer({ status: 'unavailable' });

    expect(text).toMatch(/closer, clearer picture/);
  });

  it('never presents a scoreless result as an identification', () => {
    // No confidence means nothing to stand behind, whatever the status says.
    const text = formatImageAnswer({
      status: 'ok',
      analysis: { identified_disease: 'Something', plant: 'maize', confidence: null },
    });

    expect(text).not.toContain('This looks like');
  });
});

import { fetchLegalDocument } from '../../shared/api/legalService';

/**
 * The service's job is to be strict about what counts as a document. A legal
 * page that renders half-empty is worse than one that reports an error, because
 * `useCachedQuery` writes every success to the offline cache — an empty
 * "success" would overwrite terms a farmer already had with nothing.
 */
const mockFetch = jest.fn();
globalThis.fetch = mockFetch as unknown as typeof fetch;

function respond(body: unknown, ok = true) {
  mockFetch.mockResolvedValueOnce({
    ok,
    status: ok ? 200 : 404,
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe('fetchLegalDocument', () => {
  it('reads the flat envelope the endpoint returns, which has no data key', () => {
    respond({
      success: true,
      slug: 'terms',
      title: 'Terms of Service',
      summary: 'Please read these terms.',
      updated: 'April 2026',
      sections: [{ title: 'Acceptance of Terms', body: 'By using AgroMet you agree.' }],
    });

    return expect(fetchLegalDocument('terms')).resolves.toMatchObject({
      slug: 'terms',
      title: 'Terms of Service',
      updated: 'April 2026',
      sections: [{ title: 'Acceptance of Terms', body: 'By using AgroMet you agree.' }],
    });
  });

  it('keeps a section\'s bullets when it has them', async () => {
    respond({
      success: true,
      sections: [
        { title: 'User Responsibilities', body: 'You agree to:', items: ['Be accurate', 'Stay secure'] },
      ],
    });

    const document = await fetchLegalDocument('terms');

    expect(document.sections[0].items).toEqual(['Be accurate', 'Stay secure']);
  });

  it('omits the items key entirely on a section that is only prose', async () => {
    respond({ success: true, sections: [{ title: 'Data Security', body: 'We protect it.' }] });

    const document = await fetchLegalDocument('privacy');

    // Absent rather than an empty array, so the screen can branch on presence.
    expect('items' in document.sections[0]).toBe(false);
  });

  it('drops a malformed section rather than rendering a hole in the document', async () => {
    respond({
      success: true,
      sections: [
        { title: 'Real section', body: 'Real body.' },
        { title: '   ', body: '' },
        { body: 'Kept — a body with no heading still says something.' },
      ],
    });

    const document = await fetchLegalDocument('terms');

    expect(document.sections).toHaveLength(2);
    expect(document.sections.map((section) => section.title)).toEqual(['Real section', '']);
  });

  it('fails rather than caching an empty document over one already saved', async () => {
    respond({ success: true, sections: [] });

    await expect(fetchLegalDocument('terms')).rejects.toThrow(/not been published/);
  });

  it('fails when every section is unusable, not just when the list is missing', async () => {
    respond({ success: true, sections: [{ title: '', body: '   ' }] });

    await expect(fetchLegalDocument('privacy')).rejects.toThrow(/not been published/);
  });

  it('falls back to a usable title when the payload omits one', async () => {
    respond({ success: true, sections: [{ title: 'Something', body: 'Body.' }] });

    const document = await fetchLegalDocument('terms');

    expect(document.title).toBe('Legal');
    expect(document.summary).toBe('');
  });
});

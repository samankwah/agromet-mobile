import { listFaqs } from '../../shared/api/faqService';
import { FAQ_TOPICS } from '../../shared/domain/faq';
import { NetworkError } from '../../shared/api/http';

// Local fetch mock, following http.test.ts — jest.setup.js's stated scope is
// native modules with no Jest binary, not the network.
const mockFetch = jest.fn();
globalThis.fetch = mockFetch as unknown as typeof fetch;

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as Response;
}

/**
 * These three behaviours used to be covered only through LibraryScreen, which
 * was deleted when the chat tab took its slot. The FAQ data layer itself is
 * deliberately retained for the planned Mobile Menu (see
 * `features/library/useFaqs.ts`), so its coverage had to survive the screen —
 * otherwise the kept files would quietly become untested the moment they
 * stopped being rendered.
 */
describe('listFaqs', () => {
  beforeEach(() => mockFetch.mockReset());

  it('reads the { success, message } envelope, which has no data key', async () => {
    // The quirk faqService.ts documents: http.ts's unwrap() only unwraps when
    // 'data' in body, so this endpoint hands back the whole envelope and the
    // service reads .message. /api/chat is the only other endpoint like this.
    const answer = 'Target April to June for the major season.';
    mockFetch.mockResolvedValue(jsonResponse({ success: true, message: answer }));

    const faqs = await listFaqs();

    expect(faqs).toHaveLength(FAQ_TOPICS.length);
    expect(faqs[0]).toEqual({
      topic: FAQ_TOPICS[0].topic,
      question: FAQ_TOPICS[0].question,
      answer,
    });
  });

  it('drops one missing topic instead of blanking the whole list', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ detail: 'FAQ topic not found.' }, false, 404))
      .mockResolvedValue(jsonResponse({ success: true, message: 'An answer.' }));

    const faqs = await listFaqs();

    expect(faqs).toHaveLength(FAQ_TOPICS.length - 1);
    expect(faqs.map((entry) => entry.topic)).not.toContain(FAQ_TOPICS[0].topic);
  });

  it('throws when every topic fails rather than reporting an empty success', async () => {
    // Returning [] would count as a success, and useCachedQuery writes every
    // success to the offline cache — replacing answers a farmer already had
    // with nothing.
    mockFetch.mockRejectedValue(new Error('offline'));

    await expect(listFaqs()).rejects.toThrow(NetworkError);
  });
});

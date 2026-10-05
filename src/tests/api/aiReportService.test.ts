import { AI_REPORT_REASONS, reportAiAnswer } from '../../shared/api/aiReportService';
import { useAuthStore } from '../../shared/state/authStore';

// Local fetch mock, following http.test.ts.
const mockFetch = jest.fn();
globalThis.fetch = mockFetch as unknown as typeof fetch;

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as Response;
}

describe('reportAiAnswer', () => {
  beforeEach(() => mockFetch.mockReset());

  it('posts the answer, the reason and the device id, and returns the reference', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ success: true, message: 'Thank you.', reference: 7 }, true, 201));

    const reference = await reportAiAnswer({ kind: 'chat', text: '  Spray at noon.  ', reason: 'harmful' });

    expect(reference).toBe(7);
    const [url, init] = mockFetch.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/ai-reports$/);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ kind: 'chat', reason: 'harmful', text: 'Spray at noon.' });
    expect(init.headers['X-Device-Id']).toBe(useAuthStore.getState().guestId);
  });

  it('trims a very long answer to the length the server accepts rather than being refused', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ success: true, reference: 1 }, true, 201));

    await reportAiAnswer({ kind: 'diagnosis', text: 'a'.repeat(5000), reason: 'wrong' });

    expect(JSON.parse(mockFetch.mock.calls[0][1].body).text).toHaveLength(4000);
  });

  it('offers only reasons the server knows', () => {
    expect(AI_REPORT_REASONS.map((reason) => reason.id)).toEqual(['wrong', 'harmful', 'offensive', 'other']);
  });
});

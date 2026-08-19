import { getJson, NetworkError, postJson } from '../../shared/api/http';
import { ServiceError } from '../../shared/api/mockDelay';

// No test in this app has mocked fetch before — the app was entirely
// mock-backed until calendars. Kept local to this file rather than in
// jest.setup.js, whose stated scope is native modules with no Jest binary.
const mockFetch = jest.fn();
globalThis.fetch = mockFetch as unknown as typeof fetch;

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as Response;
}

describe('getJson', () => {
  beforeEach(() => mockFetch.mockReset());

  it('unwraps the { success, data } envelope every endpoint uses', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ success: true, data: [{ id: '1' }], total: 1 }));

    await expect(getJson('/api/enhanced-calendars')).resolves.toEqual([{ id: '1' }]);
  });

  it('passes through a body that has no envelope', async () => {
    // /metadata returns its fields at the top level, with no `data` key.
    mockFetch.mockResolvedValue(jsonResponse({ commodities: ['Tomato'], totalCalendars: 1 }));

    await expect(getJson('/api/enhanced-calendars/metadata')).resolves.toEqual({
      commodities: ['Tomato'],
      totalCalendars: 1,
    });
  });

  it('builds a query string, dropping empty filters', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ data: [] }));

    await getJson('/api/enhanced-calendars', { calendarType: 'seasonal', commodity: '', year: undefined, page: 2 });

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('calendarType=seasonal');
    expect(url).toContain('page=2');
    // An unset filter must not become `commodity=`, which the backend would
    // treat as a real (never-matching) value.
    expect(url).not.toContain('commodity');
    expect(url).not.toContain('year');
  });

  it('encodes values with spaces, since regions are stored as names', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ data: [] }));

    await getJson('/api/enhanced-calendars', { regionCode: 'Ashanti Region' });

    expect(mockFetch.mock.calls[0][0]).toContain('regionCode=Ashanti%20Region');
  });

  it('turns a non-2xx into a ServiceError — the server answered and said no', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ detail: 'Calendar not found.' }, false, 404));

    await expect(getJson('/api/enhanced-calendars/999')).rejects.toBeInstanceOf(ServiceError);
  });

  it('turns a transport failure into a NetworkError, distinguishable from a rejection', async () => {
    mockFetch.mockRejectedValue(new TypeError('Network request failed'));

    const error = await getJson('/api/enhanced-calendars').catch((e) => e);

    // The distinction matters: one means "check your connection", the other
    // means "that calendar doesn't exist".
    expect(error).toBeInstanceOf(NetworkError);
    expect(error).not.toBeInstanceOf(ServiceError);
  });

  it('reports unreadable JSON as a ServiceError rather than crashing', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('Unexpected token <');
      },
    } as unknown as Response);

    await expect(getJson('/api/enhanced-calendars')).rejects.toBeInstanceOf(ServiceError);
  });

  it('aborts rather than hanging forever', async () => {
    mockFetch.mockImplementation((_url: string, init: RequestInit) => {
      expect(init.signal).toBeDefined();
      return Promise.resolve(jsonResponse({ data: [] }));
    });

    await getJson('/api/enhanced-calendars');
    expect(mockFetch).toHaveBeenCalled();
  });
});

describe('postJson', () => {
  beforeEach(() => mockFetch.mockReset());

  it('sends a JSON body and unwraps the response', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ success: true, data: { id: '7', currentWeek: 1 } }));

    const result = await postJson('/api/production-cycles', { calendarId: 1, batchName: 'Batch A' });

    const init = mockFetch.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ calendarId: 1, batchName: 'Batch A' });
    expect(result).toEqual({ id: '7', currentWeek: 1 });
  });
});

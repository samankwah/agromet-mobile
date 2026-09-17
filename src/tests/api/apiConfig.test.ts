import { getApiBaseUrl } from '../../shared/api/apiConfig';

describe('getApiBaseUrl', () => {
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('uses the configured URL, without a trailing slash', () => {
    expect(getApiBaseUrl({ url: 'https://api.agromet.example/', isDev: false })).toBe('https://api.agromet.example');
  });

  it('ignores a value that is not a URL, such as an unfilled placeholder', () => {
    // A release profile left holding a placeholder must not send requests to
    // "__SET_ME__/api/...", which fails in a way far harder to read.
    expect(getApiBaseUrl({ url: '__SET_AFTER_VERCEL__', hostUri: '192.168.1.20:8081' })).toBe('http://192.168.1.20:8000');
  });

  it('falls back to the dev server host in development', () => {
    expect(getApiBaseUrl({ url: '', hostUri: '10.0.2.2:8081', isDev: true })).toBe('http://10.0.2.2:8000');
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('says so, loudly, when a release build has nowhere to send requests', () => {
    expect(getApiBaseUrl({ url: '', hostUri: '', isDev: false })).toBe('http://localhost:8000');
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('EXPO_PUBLIC_API_URL'));
  });
});

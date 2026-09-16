import { getApiBaseUrl } from './apiConfig';
import { ServiceError } from './mockDelay';

/**
 * Default request budget. Deliberately short: this app is built for rural
 * connections, where a request that has not answered in ten seconds is usually
 * never going to.
 *
 * One endpoint needs longer — `/api/chat` waits on an LLM upstream that the
 * backend itself allows 30s. Rather than loosen this for every screen, a caller
 * can pass its own `timeoutMs` (see `RequestOptions`).
 */
const TIMEOUT_MS = 10_000;

/**
 * The server was reached but couldn't be — no connection, DNS failure,
 * timeout. Kept distinct from ServiceError (which means the server
 * answered and said no) so the UI can offer "check your connection"
 * instead of a misleading "not found".
 */
export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

/**
 * `fetch` with the same budget our own requests get, for the few calls that go
 * straight to a third party (Open-Meteo, NASA GIBS) rather than through
 * `request` below.
 *
 * A bare `fetch` has no timeout at all. Those calls are mostly the *fallback*
 * for a backend that already failed to answer inside ten seconds, so without
 * this a farmer on a bad connection waited ten seconds and then indefinitely.
 * An abort rejects like any transport failure, so callers' existing `catch`
 * keeps working unchanged.
 */
export async function fetchWithTimeout(url: string, init?: RequestInit, timeoutMs = TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export type QueryParams = Record<string, string | number | undefined | null>;

export type RequestOptions = {
  /** Overrides the default request budget for this one call. */
  timeoutMs?: number;
  /** Extra headers for this one call. Used by the chat, which identifies the
   * device so the server can meter an endpoint that has no login. */
  headers?: Record<string, string>;
};

function buildUrl(path: string, params?: QueryParams): string {
  const url = `${getApiBaseUrl()}${path}`;
  if (!params) return url;

  const search = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');

  return search ? `${url}?${search}` : url;
}

/**
 * Every backend endpoint wraps its payload as `{ success, data, ... }`.
 * Unwrapped here, once, so domain types never carry the envelope and a
 * future change of envelope touches one file.
 */
function unwrap<T>(body: unknown): T {
  if (body && typeof body === 'object' && 'data' in body) {
    return (body as { data: T }).data;
  }
  return body as T;
}

/**
 * What to tell the user about a refusal.
 *
 * FastAPI puts a human sentence in `detail`, and some of ours are written for
 * exactly this moment — the chat quota's "try again in about 15 minutes" is
 * worth far more to a farmer than "the server rejected the request (429)".
 * Anything that is not a plain string (a validation error's list, a proxy's
 * diagnostic object) is server-shaped rather than reader-shaped, so the status
 * sentence stands.
 */
async function rejectionMessage(response: Response): Promise<string> {
  const fallback = `The server rejected the request (${response.status}).`;
  try {
    const body = await response.json();
    const detail = (body as { detail?: unknown })?.detail;
    return typeof detail === 'string' && detail.trim() ? detail : fallback;
  } catch {
    return fallback;
  }
}

async function request<T>(path: string, init: RequestInit, params?: QueryParams, options?: RequestOptions): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options?.timeoutMs ?? TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(buildUrl(path, params), {
      ...init,
      headers: { ...init.headers, ...options?.headers },
      signal: controller.signal,
    });
  } catch {
    // fetch only rejects for transport failures — a 404 resolves normally.
    //
    // Our own abort lands here too, and the two need different words: after
    // half a minute waiting on the assistant, "check your connection" blames
    // the farmer's phone for a server that was simply slow. Still a
    // NetworkError either way, so callers branching on the class are unaffected.
    throw new NetworkError(
      controller.signal.aborted
        ? 'The server took too long to answer. Try again.'
        : 'Could not reach the AgroMet server. Check your connection and try again.',
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new ServiceError(await rejectionMessage(response), response.status);
  }

  try {
    return unwrap<T>(await response.json());
  } catch {
    throw new ServiceError('The server sent a response the app could not read.');
  }
}

export function getJson<T>(path: string, params?: QueryParams): Promise<T> {
  return request<T>(path, { method: 'GET' }, params);
}

export function postJson<T>(path: string, body: unknown, options?: RequestOptions): Promise<T> {
  return request<T>(
    path,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    undefined,
    options,
  );
}

/**
 * A multipart POST, for the one thing that is not JSON: an audio recording.
 *
 * No `Content-Type` header on purpose. Setting it by hand omits the multipart
 * boundary that fetch would otherwise generate, and the server then rejects a
 * body it cannot split. Everything else (the timeout budget, NetworkError vs
 * ServiceError, unwrapping) is the same machinery `postJson` uses.
 */
export function postForm<T>(path: string, form: FormData, options?: RequestOptions): Promise<T> {
  return request<T>(path, { method: 'POST', body: form }, undefined, options);
}

export function putJson<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

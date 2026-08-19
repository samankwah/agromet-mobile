import { getApiBaseUrl } from './apiConfig';
import { ServiceError } from './mockDelay';

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

export type QueryParams = Record<string, string | number | undefined | null>;

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

async function request<T>(path: string, init: RequestInit, params?: QueryParams): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(buildUrl(path, params), { ...init, signal: controller.signal });
  } catch {
    // fetch only rejects for transport failures — a 404 resolves normally.
    throw new NetworkError('Could not reach the AgroMet server. Check your connection and try again.');
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new ServiceError(`The server rejected the request (${response.status}).`);
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

export function postJson<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function putJson<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

import { API_URL } from '../config';

// The API authenticates with the httpOnly `token` / `refreshToken` cookies it sets on the shared
// parent domain at login (done on the main site), so every request sends credentials. On a 401 the
// access token is refreshed once -- shared between concurrent requests -- and the request retried.

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

let refreshing: Promise<boolean> | null = null;

function refreshToken(): Promise<boolean> {
  refreshing ??= fetch(`${API_URL}/accounts/refresh-token`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => { refreshing = null; });
  return refreshing;
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const send = () => fetch(`${API_URL}${path}`, { ...init, credentials: 'include' });
  const res = await send();
  if (res.status !== 401) return res;
  return (await refreshToken()) ? send() : res;
}

async function errorMessage(res: Response): Promise<string> {
  const body = await res.json().catch(() => null);
  if (body?.message) return body.message;
  if (body?.errors) return Object.values(body.errors).flat().join(' ');
  if (res.status === 401) return 'Please log in.';
  if (res.status === 403) return 'You do not have permission to do this.';
  if (res.status === 409) return 'This already exists.';
  return `Request failed (${res.status}).`;
}

async function send<T>(method: string, path: string, body?: unknown): Promise<T> {
  const init: RequestInit = { method };
  if (body instanceof FormData) {
    init.body = body;
  } else if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers = { 'Content-Type': 'application/json' };
  }

  const res = await apiFetch(path, init);
  if (!res.ok) throw new ApiError(res.status, await errorMessage(res));
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const http = {
  get: <T>(path: string) => send<T>('GET', path),
  post: <T>(path: string, body?: unknown) => send<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => send<T>('PUT', path, body),
  delete: (path: string) => send<void>('DELETE', path),
};

// Query string from the defined, non-empty values.
export function qs(params: Record<string, string | number | undefined | null>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  return entries.length ? '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&') : '';
}

export const apiUrl = (path: string) => `${API_URL}${path}`;

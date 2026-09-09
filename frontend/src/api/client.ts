import { timing } from '@/design/tokens';
import { storage } from './storage';

export class ApiError extends Error {
  constructor(public status: number, public detail: string, public fieldErrors: Record<string, string[]> = {}, public retryAfter?: number) { super(detail); }
}
export const REFRESH_KEY = 'echo:auth:v1:refresh';
let accessToken: string | null = null;
let refreshHook: (() => Promise<string | null>) | undefined;
let refreshing: Promise<string | null> | undefined;
let sessionExpired: (() => void) | undefined;
export const setAccessToken = (token: string | null) => { accessToken = token; };
export const getRefreshToken = () => storage.read(REFRESH_KEY);
export const setRefreshToken = (token: string) => storage.write(REFRESH_KEY, token);
export const clearTokens = () => { accessToken = null; storage.remove(REFRESH_KEY); };
export const registerRefreshHook = (hook: () => Promise<string | null>, onExpired?: () => void) => {
  refreshHook = hook; sessionExpired = onExpired;
  return () => { refreshHook = undefined; sessionExpired = undefined; };
};
export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

const reachabilityListeners = new Set<() => void>();
let reachable: boolean | null = null;
export const getReachability = () => reachable;
export const subscribeReachability = (listener: () => void) => { reachabilityListeners.add(listener); return () => { reachabilityListeners.delete(listener); }; };
function markReachable(value: boolean) {
  if (reachable === value) return;
  reachable = value;
  for (const listener of reachabilityListeners) listener();
}
function delay(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const cancel = () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', cancel); resolve(); }, ms);
    if (signal?.aborted) cancel(); else signal?.addEventListener('abort', cancel, { once: true });
  });
}
export type RequestOptions = { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: unknown; idempotencyKey?: string; signal?: AbortSignal; anonymous?: boolean; retry?: boolean };

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method || 'GET';
  // Only the cooking contract guarantees POST replay. A random key cannot make arbitrary writes safe.
  const replaySafe = method === 'GET' || (method === 'POST' && path === '/cooking-logs' && Boolean(options.idempotencyKey));
  let retried = false;
  let refreshed = false;
  for (;;) {
    if (options.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const controller = new AbortController();
    const abort = () => controller.abort();
    options.signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(abort, timing.requestTimeout);
    let retryWait: number | undefined;
    try {
      const headers = new Headers({ Accept: 'application/json' });
      if (options.body !== undefined) headers.set('Content-Type', 'application/json');
      if (accessToken && !options.anonymous) headers.set('Authorization', `Bearer ${accessToken}`);
      if (options.idempotencyKey) headers.set('Idempotency-Key', options.idempotencyKey);
      const response = await fetch(`${API_BASE}${path}`, { method, headers, body: options.body === undefined ? undefined : JSON.stringify(options.body), signal: controller.signal, credentials: 'omit' });
      // Any HTTP response proves the local API is reachable. 503 readiness remains unavailable.
      markReachable(response.status !== 503);
      const body = response.status === 204 ? null : await response.json().catch(() => null);
      if (response.ok) return body as T;
      if (response.status === 401 && !options.anonymous && !refreshed && refreshHook) {
        refreshed = true;
        refreshing ??= refreshHook().catch(() => null).finally(() => { refreshing = undefined; });
        const token = await refreshing;
        if (token) { accessToken = token; continue; }
        clearTokens(); sessionExpired?.();
      } else if (response.status === 401 && !options.anonymous && refreshed) {
        clearTokens(); sessionExpired?.();
      }
      const rawRetry = response.headers.get('Retry-After');
      const seconds = rawRetry ? (/^\d+$/.test(rawRetry) ? Number(rawRetry) : Math.max(0, Math.ceil((Date.parse(rawRetry) - Date.now()) / timing.second))) : body?.retryAfter;
      const retryAfter = Number.isFinite(seconds) ? seconds : undefined;
      const error = new ApiError(response.status, body?.detail || response.statusText, body?.errors || {}, retryAfter);
      if (response.status === 503 && replaySafe && !retried && options.retry !== false && (retryAfter ?? 0) * timing.second <= timing.requestTimeout) {
        retryWait = (retryAfter ?? 0) * timing.second;
      } else { throw error; }
    } catch (error) {
      if (error instanceof ApiError || options.signal?.aborted) throw error;
      markReachable(false);
      if (!replaySafe || retried || options.retry === false) throw new ApiError(0, 'Connection unavailable.');
      retryWait = timing.retryDelay;
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', abort);
    }
    retried = true;
    await delay(retryWait ?? timing.retryDelay, options.signal);
  }
}

export const checkReachability = () => request<{ status: 'ok' }>('/health', { anonymous: true, retry: false });

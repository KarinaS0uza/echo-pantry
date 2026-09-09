import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ApiError, request, setAccessToken, setRefreshToken, clearTokens, registerRefreshHook, REFRESH_KEY, getReachability } from '../src/api/client';

beforeEach(() => { localStorage.clear(); clearTokens(); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
const json = (body: unknown, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
it('keeps access in memory and omits credentials and tokens from anonymous requests', async () => {
  const fetch = vi.fn().mockResolvedValue(json({ status: 'ok' })); vi.stubGlobal('fetch', fetch);
  setAccessToken('memory-access'); setRefreshToken('refresh-only');
  await request('/health');
  expect(new Headers(fetch.mock.calls[0][1].headers).get('Authorization')).toBe('Bearer memory-access');
  expect(fetch.mock.calls[0][1].credentials).toBe('omit');
  expect(Object.values(localStorage)).toEqual(['refresh-only']);
  await request('/health', { anonymous: true });
  expect(new Headers(fetch.mock.calls[1][1].headers).has('Authorization')).toBe(false);
  clearTokens(); expect(localStorage.getItem(REFRESH_KEY)).toBeNull();
});
it('replays safe reads once and honors Retry-After', async () => {
  vi.useFakeTimers();
  const fetch = vi.fn().mockResolvedValueOnce(json({ detail: 'busy', errors: {}, retryAfter: 1 }, 503, { 'Retry-After': '1' })).mockResolvedValueOnce(json({ ok: true })); vi.stubGlobal('fetch', fetch);
  const promise = request('/health');
  await vi.advanceTimersByTimeAsync(999); expect(fetch).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(1); expect(await promise).toEqual({ ok: true });
  expect(fetch).toHaveBeenCalledTimes(2);
});
it('never replays an ordinary write even when passed an arbitrary key', async () => {
  const fetch = vi.fn().mockRejectedValue(new TypeError('offline')); vi.stubGlobal('fetch', fetch);
  await expect(request('/pantry-items', { method: 'POST', body: {}, idempotencyKey: 'not-a-replay-contract' })).rejects.toBeInstanceOf(ApiError);
  expect(fetch).toHaveBeenCalledTimes(1);
});
it('retains the same cooking key and body through a lost-response retry', async () => {
  vi.useFakeTimers();
  const fetch = vi.fn().mockRejectedValueOnce(new TypeError('lost response')).mockResolvedValueOnce(json({ id: 1 })); vi.stubGlobal('fetch', fetch);
  const pending = request('/cooking-logs', { method: 'POST', body: { amount: '0.25' }, idempotencyKey: 'one-cooking' });
  await vi.runAllTimersAsync(); expect(await pending).toEqual({ id: 1 });
  expect(fetch.mock.calls.map(call => new Headers(call[1].headers).get('Idempotency-Key'))).toEqual(['one-cooking', 'one-cooking']);
  expect(fetch.mock.calls[0][1].body).toBe(fetch.mock.calls[1][1].body);
});
it('refreshes once then cleans the session without deleting drafts or preferences', async () => {
  localStorage.setItem('echo:ui:v1:language', 'pt-BR');
  const refresh = vi.fn().mockResolvedValue('new-access'), expired = vi.fn();
  const unregister = registerRefreshHook(refresh, expired);
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ detail: 'expired', errors: {} }, 401)));
  await expect(request('/pantry-items')).rejects.toMatchObject({ status: 401 });
  expect(refresh).toHaveBeenCalledTimes(1); expect(expired).toHaveBeenCalledTimes(1);
  expect(localStorage.getItem('echo:ui:v1:language')).toBe('pt-BR'); unregister();
});
it('preserves field errors and recognizes reachable HTTP failures', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ detail: 'Correct quantity.', errors: { quantity: ['Positive values only.'] } }, 400)));
  await expect(request('/pantry-items', { method: 'POST', body: {} })).rejects.toMatchObject({ fieldErrors: { quantity: ['Positive values only.'] } });
  expect(getReachability()).toBe(true);
});
it('stops a request at the configured ten-second timeout', async () => {
  vi.useFakeTimers();
  vi.stubGlobal('fetch', vi.fn((_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))))));
  const pending = expect(request('/health', { retry: false })).rejects.toMatchObject({ status: 0 });
  await vi.advanceTimersByTimeAsync(10000); await pending;
});

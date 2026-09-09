import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useDraft, draftKey } from '../src/drafts/useDraft';
import { timing } from '../src/design/tokens';

beforeEach(() => { localStorage.clear(); vi.useFakeTimers(); });
afterEach(() => vi.useRealTimers());
const defaults = { name: '', password: '', quantity: 1 };
it('debounces drafts, whitelists fields and excludes sensitive input', async () => {
  const { result } = renderHook(() => useDraft('test', defaults, ['name', 'password', 'quantity']));
  act(() => result.current.setValues({ name: 'Spinach', password: 'never-save', quantity: 2 }));
  await act(() => vi.advanceTimersByTimeAsync(499)); expect(localStorage.getItem(draftKey('test'))).toBeNull();
  await act(() => vi.advanceTimersByTimeAsync(1));
  expect(JSON.parse(localStorage.getItem(draftKey('test'))!).values).toEqual({ name: 'Spinach', quantity: 2 });
});
it('flushes on pagehide, restores visibly, and clears successful submissions', () => {
  const first = renderHook(() => useDraft('test', defaults, ['name', 'quantity']));
  act(() => first.result.current.setValues({ ...defaults, name: 'Milk' }));
  act(() => window.dispatchEvent(new Event('pagehide'))); first.unmount();
  const second = renderHook(() => useDraft('test', defaults, ['name', 'quantity']));
  expect(second.result.current.values.name).toBe('Milk'); expect(second.result.current.restored).toBe(true);
  act(() => second.result.current.clear()); second.unmount();
  expect(localStorage.getItem(draftKey('test'))).toBeNull();
});
it('expires stale drafts and keeps nonpersisted input when storage fails', async () => {
  localStorage.setItem(draftKey('test'), JSON.stringify({ savedAt: Date.now() - timing.draftMaxAge - 1, values: { name: 'Expired' } }));
  const { result } = renderHook(() => useDraft('test', defaults, ['name']));
  expect(result.current.values.name).toBe(''); expect(result.current.restored).toBe(false);
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
  act(() => result.current.setValues({ ...defaults, name: 'Keep in memory' }));
  await act(() => vi.advanceTimersByTimeAsync(500));
  expect(result.current.saveFailed).toBe(true); expect(result.current.values.name).toBe('Keep in memory');
});
it('warns only for dirty forms and discard removes the saved draft', async () => {
  const { result } = renderHook(() => useDraft('test', defaults, ['name']));
  const clean = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(clean); expect(clean.defaultPrevented).toBe(false);
  act(() => result.current.setValues({ ...defaults, name: 'Unsaved' }));
  const dirty = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(dirty); expect(dirty.defaultPrevented).toBe(true);
  act(() => result.current.discard()); await act(() => vi.advanceTimersByTimeAsync(500));
  expect(result.current.dirty).toBe(false); expect(localStorage.getItem(draftKey('test'))).toBeNull();
});

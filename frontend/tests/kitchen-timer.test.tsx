import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ThemeProvider } from '../src/design/theme';
import { useKitchenTimer } from '../src/components/KitchenPreview';

afterEach(() => vi.useRealTimers());

it('uses wall-clock time after a delayed callback and stops at zero', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-08T12:00:00Z'));
  const { result } = renderHook(() => useKitchenTimer(480), { wrapper: ThemeProvider });
  act(() => result.current.toggle());
  act(() => { vi.setSystemTime(new Date('2026-09-08T12:05:00Z')); vi.advanceTimersByTime(1000); });
  expect(result.current.remaining).toBe(179);
  act(() => vi.advanceTimersByTime(180000));
  expect(result.current.remaining).toBe(0);
  expect(result.current.running).toBe(false);
});

it('preserves a paused countdown, resumes it, and resets on a new step duration', () => {
  vi.useFakeTimers();
  const { result, rerender } = renderHook(({ seconds }) => useKitchenTimer(seconds), { initialProps: { seconds: 60 }, wrapper: ThemeProvider });
  act(() => result.current.toggle());
  act(() => vi.advanceTimersByTime(3000));
  act(() => result.current.toggle());
  expect(result.current.remaining).toBe(57);
  act(() => vi.advanceTimersByTime(5000));
  expect(result.current.remaining).toBe(57);
  act(() => result.current.toggle());
  act(() => vi.advanceTimersByTime(1000));
  expect(result.current.remaining).toBe(56);
  rerender({ seconds: 480 });
  expect(result.current.remaining).toBe(480);
  expect(result.current.running).toBe(false);
});

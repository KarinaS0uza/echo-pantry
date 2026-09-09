import { act, renderHook, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { request } from '../src/api/client';
import { useDemoPantry } from '../src/demo/store';

vi.mock('../src/api/client', () => ({ request: vi.fn() }));

it('shares persisted pantry changes and keeps ingredients and points intact on failed cooking', async () => {
  const item = { id: 'tomatoes', nameKey: 'demo.food.cherryTomatoes', quantity: '400', unit: 'g', storageLocation: 'fridge', date: '2026-09-09' };
  const initial = { items: [item], points: 0, mealsCooked: 0 };
  vi.mocked(request).mockResolvedValueOnce(initial);
  const first = renderHook(useDemoPantry);
  const second = renderHook(useDemoPantry);
  await waitFor(() => expect(first.result.current.loading).toBe(false));
  expect(second.result.current.items).toEqual([item]);
  vi.mocked(request).mockRejectedValueOnce(new Error('Offline'));
  await act(async () => {
    await expect(first.result.current.completeCooking('Pasta', ['tomatoes'], 'completion-1')).rejects.toThrow('Offline');
  });
  expect(second.result.current.items).toEqual([item]);
  expect(second.result.current.points).toBe(0);
  vi.mocked(request).mockResolvedValueOnce({ items: [], points: 150, mealsCooked: 1, pointsAwarded: 150 });
  await act(async () => {
    expect(await first.result.current.completeCooking('Pasta', ['tomatoes'], 'completion-1')).toEqual({ pointsAwarded: 150 });
  });
  expect(second.result.current.items).toEqual([]);
  expect(second.result.current.points).toBe(150);
  expect(second.result.current.error).toBeNull();
  expect(vi.mocked(request).mock.calls.at(-1)).toEqual(['/demo/complete', { method: 'POST', body: { dish: 'Pasta', usedIds: ['tomatoes'], completionId: 'completion-1' }, anonymous: true }]);
  vi.mocked(request).mockRejectedValueOnce(new Error('Lost response'));
  await act(async () => {
    await expect(first.result.current.addIngredients([item])).rejects.toThrow('Lost response');
  });
  const failedBody = vi.mocked(request).mock.calls.at(-1)?.[1]?.body;
  vi.mocked(request).mockResolvedValueOnce(initial);
  await act(async () => { await first.result.current.addIngredients([item]); });
  expect(vi.mocked(request).mock.calls.at(-1)?.[1]?.body).toEqual(failedBody);
});

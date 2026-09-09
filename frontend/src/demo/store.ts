import { useEffect, useSyncExternalStore } from 'react';
import { request } from '@/api/client';

export type DemoIngredientEntry = { nameKey: string; quantity: string; unit: string; storageLocation: string; date: string };
export type DemoItem = DemoIngredientEntry & { id: string };
type PersistedState = { items: DemoItem[]; points: number; mealsCooked: number };
type DemoSnapshot = PersistedState & { loading: boolean; error: Error | null };
let snapshot: DemoSnapshot = { items: [], points: 0, mealsCooked: 0, loading: true, error: null };
let initialized = false;
let revision = 0;
const listeners = new Set<() => void>();
const pendingBatches = new Map<string, string>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const getSnapshot = () => snapshot;
function publish(patch: Partial<DemoSnapshot>) {
  snapshot = { ...snapshot, ...patch };
  for (const listener of listeners) listener();
}
const asError = (error: unknown) => error instanceof Error ? error : new Error(String(error));

async function load() {
  const current = ++revision;
  publish({ loading: true, error: null });
  try {
    const data = await request<PersistedState>('/demo/', { anonymous: true });
    if (current === revision) publish({ ...data, loading: false, error: null });
  } catch (error) {
    if (current === revision) publish({ loading: false, error: asError(error) });
  }
}
const reload = () => { initialized = true; void load(); };
async function mutate<T extends PersistedState>(path: string, body: unknown): Promise<T> {
  ++revision;
  try {
    const data = await request<T>(path, { method: 'POST', body, anonymous: true });
    ++revision;
    publish({ items: data.items, points: data.points, mealsCooked: data.mealsCooked, loading: false, error: null });
    return data;
  } catch (error) {
    publish({ loading: false, error: asError(error) });
    throw error;
  }
}
async function addIngredients(entries: DemoIngredientEntry[]): Promise<void> {
  const normalized = entries.map(entry => ({ ...entry, date: entry.date || null }));
  const signature = JSON.stringify(normalized);
  const requestId = pendingBatches.get(signature) ?? crypto.randomUUID();
  pendingBatches.set(signature, requestId);
  await mutate('/demo/ingredients', { entries: normalized, requestId });
  pendingBatches.delete(signature);
}
async function completeCooking(dish: string, usedIds: string[], completionId: string): Promise<{ pointsAwarded: number }> {
  const data = await mutate<PersistedState & { pointsAwarded: number }>('/demo/complete', { dish, usedIds, completionId });
  return { pointsAwarded: data.pointsAwarded };
}
async function reset(): Promise<void> { await mutate('/demo/reset', {}); pendingBatches.clear(); }

export function useDemoPantry() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => { if (!initialized) reload(); }, []);
  return { ...state, addIngredients, completeCooking, reset, reload };
}

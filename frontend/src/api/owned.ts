import { request } from './client';
import type { Food } from './endpoints';
export interface OwnedItem { id: number; food: Food | null; customFood: Food | null; quantity: string; unit: string; storageLocation: string; date: string | null; dateKind: string; urgency: { tier: string; daysRemaining: number | null } }
export interface History { id: number; food: Food; quantity: string; unit: string; kind: 'used' | 'discarded'; sourceAction: string }
export const pantryName = (item: OwnedItem) => (item.food || item.customFood)!.name;
export const owned = {
  pantry: () => request<{ items: OwnedItem[] }>('/pantry-items'),
  foods: () => request<{ results: Food[] }>('/foods?limit=500'),
  history: (cursor?: string) => request<{ results: History[]; next: string | null }>(`/history${cursor ? '?cursor=' + encodeURIComponent(cursor) : ''}`),
};

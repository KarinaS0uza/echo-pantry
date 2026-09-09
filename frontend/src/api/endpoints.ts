import { request, type RequestOptions } from './client';

export type DecimalString = string;
export interface PantryItem { id: number; foodId: string; quantity: DecimalString; unit: string; storageLocation: string; date: string | null; dateKind: 'label' | 'user' | 'estimate' }
export interface Food { id: string; name: string; category: string }
export interface SamplePantryItem extends Omit<PantryItem, 'foodId'> { food: Food; urgency: { tier: string; daysRemaining: number | null } }
export interface Recipe { id: string; title: string; cuisine: string; mealTypes: string[]; isSide: boolean; yieldServings: string; totalTimeMinutes: number | null; vegetarianVerified: boolean; sourceName: string; sourceUrl: string }
export interface IngredientFact { food: string; name: string; need: string | null; have: string | null; toTaste: boolean; quantityUnknown: boolean }
export interface MealExplanation { reasonSummary: string; available: IngredientFact[]; missing: IngredientFact[]; checkQuantity: IngredientFact[]; soonestUseByDate: string | null; urgencyTier: 'review' | 'use_today' | 'use_soon' | 'coming_up' | 'neutral' | 'unknown'; usesExpiring: string[]; useFirst: string | null; optionalAdditions: { food: string; name: string; selectable?: boolean }[] }
export interface Meal { recipe: Recipe; rank: number; isCompleteMatch: boolean; explanation: MealExplanation; estimate: unknown }
export interface MealsResponse { isSample: boolean; preview?: boolean; servings: number; completeMatches: Meal[]; purchaseNeeded: Meal[]; emptyState?: string; excludedRecipes?: { recipeId: string; reason: string }[] }
export interface RecipeIngredient { food: string; name: string; amount: string | null; unit: string | null; optional: boolean; toTaste: boolean; preparation: string }
export interface RecipeDetails extends Recipe { requestedServings: number; ingredients: RecipeIngredient[] }
export interface User { id: number; email: string; name?: string }
export interface Tokens { access: string; refresh: string }
export const endpoints = {
  samplePantry: () => request<{ isSample: true; items: SamplePantryItem[] }>('/sample/pantry', { anonymous: true }),
  sampleFoods: () => request<{ isSample: true; results: Food[] }>('/sample/foods', { anonymous: true }),
  sampleMeals: (query = '') => request<MealsResponse>(`/sample/meals${query}`, { anonymous: true }),
  recipe: (id: string, servings: number) => request<RecipeDetails>(`/recipes/${encodeURIComponent(id)}?servings=${servings}`, { anonymous: true }),
  pantry: () => request<PantryItem[]>('/pantry-items'),
  token: (email: string, password: string) => request<Tokens>('/auth/token', { method: 'POST', body: { email, password }, anonymous: true }),
  cooking: <T>(body: unknown, idempotencyKey: string, options?: RequestOptions) => request<T>('/cooking-logs', { ...options, method: 'POST', body, idempotencyKey }),
};

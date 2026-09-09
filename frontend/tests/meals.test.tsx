import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../src/design/theme';
import { NavigationGuard } from '../src/drafts/NavigationGuard';
import { CatalogueMeals as Meals } from '../src/screens/Meals';
import { RecipeDetailScreen } from '../src/screens/RecipeDetailScreen';
import { Foundation } from '../src/screens/Foundation';
import { endpoints, type Meal, type RecipeDetails } from '../src/api/endpoints';
import { ready, i18n } from '../src/i18n';
vi.mock('../src/demo/store', () => ({ useDemoPantry: () => ({ items: [], points: 0, mealsCooked: 0, loading: false, error: null, reload: vi.fn(), addIngredients: vi.fn(), completeCooking: vi.fn(), reset: vi.fn() }) }));
vi.mock('../src/api/endpoints', () => ({ endpoints: { sampleMeals: vi.fn(), samplePantry: vi.fn(), sampleFoods: vi.fn(), recipe: vi.fn() } }));
// Network status is independently covered by client tests.
vi.mock('../src/app/OfflineBanner', () => ({ OfflineBanner: () => null }));
const fact = { food: 'rice', name: 'Rice', need: '2 cup', have: '4 cup', quantityUnknown: false, toTaste: false };
const complete: Meal = { recipe: { id: 'one', title: 'Quick Rice', cuisine: 'american', mealTypes: ['dinner'], isSide: false, yieldServings: '2', totalTimeMinutes: 20, vegetarianVerified: true, sourceName: 'Original Kitchen', sourceUrl: 'https://example.com/recipe' }, rank: 1, isCompleteMatch: true, estimate: null, explanation: { reasonSummary: '', available: [fact], missing: [], checkQuantity: [], soonestUseByDate: null, urgencyTier: 'unknown', usesExpiring: [], useFirst: null, optionalAdditions: [] } };
const incomplete: Meal = { ...complete, recipe: { ...complete.recipe, id: 'two', title: 'Unknown Time Stew', totalTimeMinutes: null }, rank: 2, isCompleteMatch: false, explanation: { ...complete.explanation, missing: [{ ...fact, name: 'Beans', food: 'beans', have: null }], checkQuantity: [{ ...fact, name: 'Tofu', food: 'tofu', need: null, quantityUnknown: true }] } };
beforeEach(async () => {
  await ready; await i18n.changeLanguage('en'); vi.clearAllMocks();
  vi.mocked(endpoints.samplePantry).mockResolvedValue({ isSample: true, items: [{ id: 1, food: { id: 'rice', name: 'Rice', category: 'grain' }, quantity: '4', unit: 'cup', date: null, dateKind: 'user', storageLocation: 'pantry', urgency: { tier: 'unknown', daysRemaining: null } }] });
  vi.mocked(endpoints.sampleFoods).mockResolvedValue({ isSample: true, results: [{ id: 'rice', name: 'Rice', category: 'grain' }] });
  vi.mocked(endpoints.sampleMeals).mockImplementation(async query => {
    const params = new URLSearchParams(query);
    return { isSample: true, servings: Number(params.get('servings')), completeMatches: params.has('useToday') ? [] : [complete], purchaseNeeded: params.has('useToday') || params.get('maxTime') === '30' ? [] : [incomplete] };
  });
});
function mount(path = '/meals') {
  return render(<ThemeProvider><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter initialEntries={[path]}><NavigationGuard><Routes><Route path="/meals" element={<Meals />} /><Route path="/recipes/:id" element={<RecipeDetailScreen />} /><Route path="/pantry" element={<Foundation />} /><Route path="/sign-up" element={<h1>Account scaffold</h1>} /></Routes></NavigationGuard></MemoryRouter></QueryClientProvider></ThemeProvider>);
}
it('opens Pantry directly from sample Meals without requiring an account', async () => {
  mount();
  await screen.findByText('Quick Rice');
  fireEvent.click(screen.getByRole('button', { name: 'My Pantry' }));
  expect(await screen.findByRole('heading', { name: 'My Pantry' })).toBeVisible();
  expect(screen.queryByRole('heading', { name: 'Account scaffold' })).not.toBeInTheDocument();
});
it('separates complete and purchase-needed results with readable owned, missing and uncertain facts', async () => {
  mount();
  await screen.findByText('Quick Rice');
  const completeSection = screen.getByRole('region', { name: 'Ready from Your Pantry' });
  const missingSection = screen.getByRole('region', { name: 'Needs Ingredients or a Quantity Check' });
  expect(completeSection.compareDocumentPosition(missingSection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  fireEvent.click(within(missingSection).getByText('Ingredients: 1 available, 1 missing, 1 to check'));
  expect(within(missingSection).getByText('Available Ingredients')).toBeVisible();
  expect(within(missingSection).getByText('Missing or Not Enough')).toBeVisible();
  expect(within(missingSection).getByText('Check Quantity')).toBeVisible();
  expect(within(missingSection).getByText(/Tofu.*Quantity not listed/)).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Add Item' })).not.toBeInTheDocument();
});
it('keeps meal browsing free of filters while updating servings', async () => {
  mount(); await screen.findByText('Quick Rice');
  expect(screen.queryByRole('button', { name: /Meal Filters|Vegetarian|Favorites|Avoid|Ingredients for Today|Clear Filters/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Increase Servings' }));
  await waitFor(() => expect(endpoints.sampleMeals).toHaveBeenLastCalledWith('?servings=3'));
});
it('loads scaled detail and links to the original method without any stock mutation', async () => {
  vi.mocked(endpoints.recipe).mockImplementation(async (_id, servings) => ({ ...complete.recipe, requestedServings: servings, ingredients: [{ food: 'rice', name: 'Rice', amount: String(servings), unit: 'cup', optional: false, toTaste: false, preparation: '' }] }));
  mount('/recipes/one?servings=3');
  expect(await screen.findByRole('tabpanel', { name: 'Step By Step' })).toBeVisible();
  fireEvent.click(screen.getByRole('tab', { name: 'Ingredients' }));
  expect(await screen.findByText('Rice: 3 cup')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Increase Servings' }));
  expect(await screen.findByText('Rice: 4 cup')).toBeVisible();
  fireEvent.click(screen.getByRole('tab', { name: 'Step By Step' }));
  expect(screen.getByRole('link', { name: 'Open Original Recipe at Original Kitchen' })).toHaveAttribute('href', 'https://example.com/recipe');
  fireEvent.click(screen.getByRole('button', { name: 'My Pantry' }));
  expect(await screen.findByRole('heading', { name: 'My Pantry' })).toBeVisible();
});
it('includes only explicitly selected optional additions and lets the visitor remove them', async () => {
  vi.mocked(endpoints.sampleMeals).mockImplementation(async query => {
    const chosen = new URLSearchParams(query).has('includeOptional');
    return { isSample: true, servings: 2, completeMatches: [{ ...complete, explanation: { ...complete.explanation, optionalAdditions: chosen ? [] : [{ food: 'rice', name: 'Rice', selectable: true }, { food: 'beans', name: 'Beans', selectable: false }] } }], purchaseNeeded: [] };
  });
  mount();
  expect(await screen.findByText('Also used in this recipe: Beans.')).toBeVisible();
  expect(screen.queryByRole('checkbox', { name: 'Include Beans' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Include Rice' }));
  await waitFor(() => expect(vi.mocked(endpoints.sampleMeals).mock.calls.at(-1)?.[0]).toContain('includeOptional=one%3Arice'));
  fireEvent.click(await screen.findByRole('button', { name: 'Remove Included: Rice' }));
  await waitFor(() => expect(vi.mocked(endpoints.sampleMeals).mock.calls.at(-1)?.[0]).not.toContain('includeOptional'));
});
it('localizes explanation summaries and servings in Portuguese', async () => {
  await i18n.changeLanguage('pt-BR');
  mount();
  expect(await screen.findByText('Os ingredientes necessários estão disponíveis.')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Aumentar Porções' })).toBeVisible();
  expect(screen.getByText('Ingredientes: 1 disponíveis, 1 faltando, 1 para conferir')).toBeVisible();
});

function detail(servings: number): RecipeDetails {
  return { ...complete.recipe, requestedServings: servings, ingredients: [{ food: 'rice', name: 'Rice', amount: String(servings), unit: 'cup', optional: false, toTaste: false, preparation: '' }] };
}

it('preserves serving-control focus while hiding stale amounts until the new response arrives', async () => {
  let resolve!: (recipe: RecipeDetails) => void;
  const pending = new Promise<RecipeDetails>(done => { resolve = done; });
  vi.mocked(endpoints.recipe).mockResolvedValueOnce(detail(2)).mockReturnValueOnce(pending);
  mount('/recipes/one?servings=2');
  fireEvent.click(await screen.findByRole('tab', { name: 'Ingredients' }));
  await screen.findByText('Rice: 2 cup');
  const increase = screen.getByRole('button', { name: 'Increase Servings' });
  increase.focus();
  fireEvent.click(increase);
  await waitFor(() => expect(endpoints.recipe).toHaveBeenLastCalledWith('one', 3));
  expect(increase).toHaveFocus();
  expect(screen.getByRole('button', { name: 'Increase Servings' })).toBe(increase);
  expect(screen.queryByText('Rice: 2 cup')).not.toBeInTheDocument();
  expect(within(screen.getByRole('tabpanel', { name: 'Ingredients' })).getByText('Loading')).toBeVisible();
  await act(async () => { resolve(detail(3)); await pending; });
  expect(await screen.findByText('Rice: 3 cup')).toBeVisible();
  expect(increase).toHaveFocus();
});

it('retains requested servings after failure and retries without showing the old quantities', async () => {
  vi.mocked(endpoints.recipe).mockResolvedValueOnce(detail(2)).mockRejectedValueOnce(new Error('Unavailable')).mockResolvedValueOnce(detail(3));
  mount('/recipes/one?servings=2');
  fireEvent.click(await screen.findByRole('tab', { name: 'Ingredients' }));
  await screen.findByText('Rice: 2 cup');
  const increase = screen.getByRole('button', { name: 'Increase Servings' });
  increase.focus();
  fireEvent.click(increase);
  const retry = await screen.findByRole('button', { name: 'Try Again' });
  expect(increase).toHaveFocus();
  expect(screen.getByRole('button', { name: 'Increase Servings' })).toBe(increase);
  expect(screen.queryByText('Rice: 2 cup')).not.toBeInTheDocument();
  fireEvent.click(retry);
  expect(await screen.findByText('Rice: 3 cup')).toBeVisible();
  expect(vi.mocked(endpoints.recipe).mock.calls.map(call => call[1])).toEqual([2, 3, 3]);
});

it('shows the backend ranking reason alongside translated match guidance', async () => {
  const reason = 'Uses fresh or shorter-lived pantry ingredients.';
  vi.mocked(endpoints.sampleMeals).mockResolvedValue({ isSample: true, servings: 2, completeMatches: [{ ...complete, explanation: { ...complete.explanation, reasonSummary: reason } }], purchaseNeeded: [] });
  mount();
  expect(await screen.findByText(reason)).toBeVisible();
  expect(screen.getByText('The required ingredients are available.')).toBeVisible();
});

it('keeps three purchase-needed suggestions visible alongside seven ready meals without showing the whole catalogue', async () => {
  const copies = (meal: Meal, count: number) => Array.from({ length: count }, (_, index) => ({ ...meal, recipe: { ...meal.recipe, id: `${meal.recipe.id}-${index}`, title: `${meal.recipe.title} ${index}` } }));
  vi.mocked(endpoints.sampleMeals).mockResolvedValue({ isSample: true, servings: 2, completeMatches: copies(complete, 7), purchaseNeeded: copies(incomplete, 23) });
  mount();
  await screen.findByText('Quick Rice 0');
  expect(screen.getAllByRole('article')).toHaveLength(10);
  expect(screen.getByRole('heading', { name: 'Ready from Your Pantry (7)' })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Needs Ingredients or a Quantity Check (3)' })).toBeVisible();
  expect(screen.getByText('Unknown Time Stew 2')).toBeVisible();
  expect(screen.queryByText('Unknown Time Stew 3')).not.toBeInTheDocument();
});

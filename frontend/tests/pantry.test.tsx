import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../src/design/theme';
import { NavigationGuard } from '../src/drafts/NavigationGuard';
import { Pantry } from '../src/screens/Pantry';
import { useDemoPantry } from '../src/demo/store';
import { i18n, ready } from '../src/i18n';
import en from '../src/i18n/demo-pantry-en.json';
import pt from '../src/i18n/demo-pantry-pt.json';

vi.mock('../src/demo/store', () => ({ useDemoPantry: vi.fn() }));
vi.mock('../src/app/OfflineBanner', () => ({ OfflineBanner: () => null }));
const initialItems = [
  { id: 'tomato', nameKey: 'Cherry Tomatoes', quantity: '300', unit: 'g', storageLocation: 'fridge', date: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}` },
  { id: 'pasta', nameKey: 'Pasta', quantity: '200', unit: 'g', storageLocation: 'pantry', date: '' },
];
const addIngredients = vi.fn();
const reset = vi.fn();
const reload = vi.fn();
function demo(overrides = {}) {
  return { items: initialItems, points: 0, mealsCooked: 0, loading: false, error: null, addIngredients, reset, reload, completeCooking: vi.fn(), ...overrides };
}
beforeEach(async () => {
  await ready;
  i18n.addResourceBundle('en', 'translation', en, true, true);
  i18n.addResourceBundle('pt-BR', 'translation', pt, true, true);
  await i18n.changeLanguage('en');
  localStorage.clear();
  vi.clearAllMocks();
  addIngredients.mockResolvedValue(undefined);
  reset.mockResolvedValue(undefined);
  vi.mocked(useDemoPantry).mockReturnValue(demo());
});
function mount() {
  return render(<ThemeProvider><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter initialEntries={['/pantry']}><NavigationGuard><Routes><Route path="/pantry" element={<Pantry />} /><Route path="/kitchen" element={<h1>Tomato recipe destination</h1>} /><Route path="/meals" element={<h1>Meals destination</h1>} /></Routes></NavigationGuard></MemoryRouter></QueryClientProvider></ThemeProvider>);
}
it('shows existing stock, quantity and expiry urgency before adding', () => {
  mount();
  expect(screen.getByRole('heading', { name: 'My Pantry' })).toBeVisible();
  const fridge = screen.getByRole('region', { name: 'Fridge' });
  expect(within(fridge).getByText('Cherry Tomatoes')).toBeVisible();
  expect(within(fridge).getByText('300 g')).toBeVisible();
  expect(within(fridge).getByText('Use today')).toBeVisible();
  expect(within(fridge).getByText(/Estimated use-by date:/)).toBeVisible();
});
it('adds three prepared ingredients in one click while keeping existing stock', async () => {
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Add Ingredients' }));
  expect(screen.getAllByLabelText('Ingredient Name').map(input => (input as HTMLInputElement).value)).toEqual(['Spinach', 'Lemons', 'Chickpeas']);
  fireEvent.click(screen.getByRole('button', { name: 'Add Ingredients' }));
  await screen.findByText('3 ingredients added to your pantry.');
  expect(addIngredients).toHaveBeenCalledTimes(1);
  expect(addIngredients.mock.calls[0][0]).toEqual([
    expect.objectContaining({ nameKey: 'Spinach', quantity: '150', unit: 'g', storageLocation: 'fridge', date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) }),
    expect.objectContaining({ nameKey: 'Lemons', quantity: '2', unit: 'item' }),
    expect.objectContaining({ nameKey: 'Chickpeas', quantity: '400', unit: 'g', storageLocation: 'pantry' }),
  ]);
  expect(screen.getByText('Cherry Tomatoes')).toBeVisible();
  expect(screen.getByText('Pasta')).toBeVisible();
  expect(screen.queryByLabelText('Ingredient Name')).not.toBeInTheDocument();
  expect(localStorage.getItem('echo:draft:v1:demo-pantry-entry:new')).toBeNull();
});
it('keeps prepared ingredients editable and supports one more row', async () => {
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Add Ingredients' }));
  fireEvent.change(screen.getAllByLabelText('Quantity')[0], { target: { value: '250' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add One More' }));
  expect(screen.getAllByLabelText('Ingredient Name')[3]).toHaveFocus();
  fireEvent.change(screen.getAllByLabelText('Ingredient Name')[3], { target: { value: 'Carrots' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add Ingredients' }));
  await screen.findByText('4 ingredients added to your pantry.');
  expect(addIngredients.mock.calls[0][0][0].quantity).toBe('250');
  expect(addIngredients.mock.calls[0][0][3].nameKey).toBe('Carrots');
});
it('opens the tomato and burrata recipe directly from My Pantry', () => {
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Make Tomato and Burrata Pasta' }));
  expect(screen.getByRole('heading', { name: 'Tomato recipe destination' })).toBeVisible();
});
it('validates rows and preserves edits after an add failure for retry', async () => {
  addIngredients.mockRejectedValueOnce(new Error('offline'));
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Add Ingredients' }));
  fireEvent.change(screen.getAllByLabelText('Ingredient Name')[0], { target: { value: 'Spinach' } });
  fireEvent.change(screen.getAllByLabelText('Quantity')[0], { target: { value: '-1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add Ingredients' }));
  expect(screen.getByText(/Enter a name, a quantity greater than zero/)).toBeVisible();
  expect(addIngredients).not.toHaveBeenCalled();
  fireEvent.change(screen.getAllByLabelText('Quantity')[0], { target: { value: '100001' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add Ingredients' }));
  expect(addIngredients).not.toHaveBeenCalled();
  fireEvent.change(screen.getAllByLabelText('Quantity')[0], { target: { value: '350' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add Ingredients' }));
  await screen.findByText(/We couldn't add your ingredients/);
  expect(screen.getAllByLabelText('Quantity')[0]).toHaveValue('350');
  fireEvent.click(screen.getByRole('button', { name: 'Add Ingredients' }));
  await screen.findByText('3 ingredients added to your pantry.');
});
it('preserves unfinished edits when entry is closed and reopened', async () => {
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Add Ingredients' }));
  fireEvent.change(screen.getAllByLabelText('Ingredient Name')[0], { target: { value: 'Fresh Spinach' } });
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  fireEvent.click(screen.getByRole('button', { name: 'Add Ingredients' }));
  expect(screen.getAllByLabelText('Ingredient Name')[0]).toHaveValue('Fresh Spinach');
  expect(screen.getByText('Your unfinished draft has been restored.')).toBeVisible();
});
it('opens Meals and displays earned points on the pantry', () => {
  vi.mocked(useDemoPantry).mockReturnValue(demo({ points: 150, mealsCooked: 1 }));
  mount();
  expect(screen.getByText('150 Cooking Points')).toBeVisible();
  expect(screen.getByText(/1 home-cooked meal/)).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Meals' }));
  expect(screen.getByRole('heading', { name: 'Meals destination' })).toBeVisible();
});
it('requires confirmation before resetting the demo', async () => {
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Reset Demo' }));
  expect(reset).not.toHaveBeenCalled();
  const dialog = await screen.findByRole('dialog');
  expect(within(dialog).getByText(/This also removes ingredients/)).toBeVisible();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Reset Demo' }));
  await waitFor(() => expect(reset).toHaveBeenCalledTimes(1));
  await screen.findByText('Your demo is ready to start again.');
});
it('exposes retry when pantry loading fails', () => {
  vi.mocked(useDemoPantry).mockReturnValue(demo({ error: new Error('offline') }));
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
  expect(reload).toHaveBeenCalledTimes(1);
});
it('localizes the prepared ingredient entry actions in Portuguese', async () => {
  await i18n.changeLanguage('pt-BR');
  mount();
  expect(screen.getByRole('heading', { name: 'Minha Despensa' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar Ingredientes' }));
  expect(screen.getByRole('button', { name: 'Adicionar Ingredientes' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Adicionar Mais Um' })).toBeVisible();
});

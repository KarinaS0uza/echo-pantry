import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../src/design/theme';
import { NavigationGuard } from '../src/drafts/NavigationGuard';
import { OwnedPantry } from '../src/screens/OwnedPantry';
import { CookingReview } from '../src/screens/CookingReview';
import { ApiError, request } from '../src/api/client';
import { i18n, ready } from '../src/i18n';
vi.mock('../src/api/client', async original => ({ ...await original<typeof import('../src/api/client')>(), request: vi.fn() }));
vi.mock('../src/api/session', () => ({ useSession: () => ({ id: 74, email: 'qa@example.test' }), signOut: vi.fn() }));
vi.mock('../src/app/OfflineBanner', () => ({ OfflineBanner: () => null }));
const food = { id: 'rice', name: 'Rice', category: 'pantry' };
const item = { id: 7, food, customFood: null, quantity: '2', unit: 'g', date: null, dateKind: 'unknown', storageLocation: 'pantry', urgency: { tier: 'unknown', daysRemaining: null } };
let writeFails = false;
let cookingFails = false;
beforeEach(async () => {
  await ready; await i18n.changeLanguage('en'); localStorage.clear(); vi.clearAllMocks(); writeFails = false; cookingFails = false;
  vi.mocked(request).mockImplementation(async (path, options) => {
    if (path === '/pantry-items' && options?.method === 'POST') {
      if (writeFails) throw new ApiError(503, 'Unavailable', { quantity: ['Check this quantity.'] });
      return item;
    }
    if (path === '/pantry-items') return { items: [item] };
    if (path === '/foods?limit=500') return { results: [food] };
    if (path === '/pantry-items/7/mark-used') return { historyEntry: { id: 9 } };
    if (path === '/pantry-items/7/undo') return { pantryItem: item };
    if (path.startsWith('/cooking-review')) return { recipe: { id: 'R1', title: 'Rice' }, servings: 2, lines: [{ food: 'rice', name: 'Rice', required: { amount: '1', unit: 'g' }, proposedAllocation: [{ pantryItem: 7, amount: '1', unit: 'g' }], optional: false, toTaste: false }] };
    if (path === '/cooking-logs') { if (cookingFails) throw new ApiError(0, 'Unavailable'); return { appliedDeductions: [] }; }
    throw new Error(path);
  });
});
function mount(child = <OwnedPantry />) {
  return render(<ThemeProvider><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><MemoryRouter><NavigationGuard>{child}</NavigationGuard></MemoryRouter></QueryClientProvider></ThemeProvider>);
}
it('keeps field input on failure and replays a save with the same key', async () => {
  writeFails = true; mount();
  await screen.findByRole('heading', { name: 'Rice' });
  fireEvent.click(screen.getByRole('button', { name: 'Add Item' }));
  await screen.findByRole('option', { name: 'Rice' });
  fireEvent.change(screen.getByRole('combobox', { name: 'Food' }), { target: { value: 'rice' } });
  fireEvent.change(screen.getByLabelText('Quantity', { exact: true }), { target: { value: '1.5' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save Item' }));
  expect(await screen.findByText('Check this quantity.')).toBeVisible();
  expect(screen.getByLabelText('Quantity', { exact: true })).toHaveValue('1.5');
  writeFails = false;
  fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
  await waitFor(() => expect(screen.queryByRole('heading', { name: 'Add Item' })).not.toBeInTheDocument());
  const calls = vi.mocked(request).mock.calls.filter(([path, options]) => path === '/pantry-items' && options?.method === 'POST');
  expect(calls).toHaveLength(2); expect(calls[0][1]?.idempotencyKey).toBeTruthy(); expect(calls[0][1]?.idempotencyKey).toBe(calls[1][1]?.idempotencyKey);
  expect(localStorage.getItem('echo:draft:v1:owned-pantry:74-new')).toBeNull();
});
it('marks used and undoes the returned history entry', async () => {
  mount(); await screen.findByRole('heading', { name: 'Rice' });
  fireEvent.click(screen.getByText('Actions for Rice'));
  fireEvent.click(screen.getByRole('button', { name: 'Mark Used' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Undo' }));
  await waitFor(() => expect(request).toHaveBeenCalledWith('/pantry-items/7/undo', expect.objectContaining({ body: { historyEntry: 9 } })));
});
it('restores a draft explicitly without saving a password', async () => {
  localStorage.setItem('echo:draft:v1:owned-pantry:74-new', JSON.stringify({ savedAt: Date.now(), values: { food: 'rice', quantity: '3', unit: 'g', storageLocation: 'pantry', date: '', name: '', password: 'must-not-restore' } }));
  mount(); await screen.findByRole('heading', { name: 'Rice' }); fireEvent.click(screen.getByRole('button', { name: 'Add Item' }));
  expect(await screen.findByText(i18n.t('draft.restored'))).toBeVisible(); expect(screen.getByLabelText('Quantity', { exact: true })).toHaveValue('3');
});
it('retries an ambiguous cooking confirmation with an identical body and key', async () => {
  const close = vi.fn(); cookingFails = true;
  mount(<CookingReview recipe="R1" servings={2} onClose={close} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Confirm Cooking' }));
  expect(await screen.findByText('The result is uncertain. Retry this same confirmation to avoid deducting twice.')).toBeVisible();
  cookingFails = false; fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
  await waitFor(() => expect(close).toHaveBeenCalledOnce());
  const calls = vi.mocked(request).mock.calls.filter(([path]) => path === '/cooking-logs');
  expect(calls).toHaveLength(2); expect(calls[0][1]?.body).toEqual(calls[1][1]?.body); expect(calls[0][1]?.idempotencyKey).toBe(calls[1][1]?.idempotencyKey);
});

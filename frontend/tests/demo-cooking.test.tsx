import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../src/design/theme';
import { NavigationGuard } from '../src/drafts/NavigationGuard';
import { KitchenPreview } from '../src/components/KitchenPreview';
import { i18n, ready } from '../src/i18n';
import kitchen from '../src/i18n/demo-kitchen-en.json';

const completeCooking = vi.hoisted(() => vi.fn());
vi.mock('../src/demo/store', () => ({ useDemoPantry: () => ({
  items: ['pasta', 'cherryTomatoes', 'burrata', 'basil', 'garlic', 'oliveOil', 'spinach'].map(key => ({ id: `demo-${key}`, nameKey: `demo.food.${key}`, quantity: '1', unit: 'item' })),
  points: 0, mealsCooked: 0, loading: false, error: null, completeCooking,
}) }));

beforeEach(async () => {
  await ready;
  await i18n.changeLanguage('en');
  i18n.addResourceBundle('en', 'translation', kitchen, true, true);
  vi.clearAllMocks();
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  completeCooking.mockResolvedValue({ pointsAwarded: 150 });
});
function mount() {
  render(<ThemeProvider><MemoryRouter initialEntries={['/?screen=recipe']}><NavigationGuard><KitchenPreview /></NavigationGuard></MemoryRouter></ThemeProvider>);
}
async function review() {
  fireEvent.click(screen.getByRole('button', { name: 'Start Guided Cooking' }));
  expect(screen.getByText('Step 1 of 6')).toBeVisible();
  for (let index = 0; index < 5; index++) fireEvent.click(screen.getByRole('button', { name: 'Next Step' }));
  expect(screen.getByText('Step 6 of 6')).toBeVisible();
  expect(completeCooking).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Finish Cooking' }));
  return await screen.findByRole('dialog');
}
it('starts tomato pasta at step one and waits for corrected ingredient confirmation before rewarding', async () => {
  mount();
  const dialog = await review();
  const checks = within(dialog).getAllByRole('checkbox');
  expect(checks.filter(check => (check as HTMLInputElement).checked)).toHaveLength(6);
  fireEvent.click(checks[5]);
  fireEvent.click(within(dialog).getByRole('button', { name: 'Finish Cooking' }));
  expect(await screen.findByText('+150 Points')).toBeVisible();
  expect(screen.getByText('+100 points for cooking at home')).toBeVisible();
  expect(screen.getByText('+50 points for healthy cooking habits')).toBeVisible();
  expect(screen.getByText(/5 selected pantry entries were removed/)).toBeVisible();
  expect(completeCooking).toHaveBeenCalledWith('tomato', ['demo-pasta', 'demo-cherryTomatoes', 'demo-burrata', 'demo-basil', 'demo-garlic'], expect.any(String));
  expect(screen.getByRole('button', { name: 'View My Pantry' })).toBeVisible();
});
it('does not reward failed writes and retries with the same completion token and ingredients', async () => {
  completeCooking.mockRejectedValueOnce(new Error('Lost response'));
  mount();
  const dialog = await review();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Finish Cooking' }));
  const retry = await screen.findByRole('button', { name: 'Retry Finish Cooking' });
  expect(screen.queryByText('+150 Points')).not.toBeInTheDocument();
  expect(within(dialog).getAllByRole('checkbox')[0]).toBeDisabled();
  fireEvent.click(retry);
  expect(await screen.findByText('+150 Points')).toBeVisible();
  expect(completeCooking.mock.calls[1]).toEqual(completeCooking.mock.calls[0]);
});

it('keeps pantry entries when the cook confirms no entries were finished', async () => {
  mount();
  const dialog = await review();
  for (const checkbox of within(dialog).getAllByRole('checkbox')) {
    if ((checkbox as HTMLInputElement).checked) fireEvent.click(checkbox);
  }
  fireEvent.click(within(dialog).getByRole('button', { name: 'Finish Cooking' }));
  expect(await screen.findByText('Your meal is recorded. You kept all your pantry items. Enjoy your meal!')).toBeVisible();
  expect(completeCooking).toHaveBeenCalledWith('tomato', [], expect.any(String));
});

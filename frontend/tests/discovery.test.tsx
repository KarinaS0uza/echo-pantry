import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import type { Meal } from '../src/api/endpoints';
import { RecipeCard, RecipeDetail, UrgencyBadge } from '../src/components/Discovery';
import { ThemeProvider } from '../src/design/theme';
import { ready } from '../src/i18n';

const meal: Meal = {
  recipe: { id: 'BR01', title: 'Rice and Beans', cuisine: 'Brazilian', mealTypes: ['lunch'], isSide: false, yieldServings: '2', totalTimeMinutes: 20, vegetarianVerified: true, sourceName: 'Original source', sourceUrl: 'https://example.com/recipe' },
  rank: 1, isCompleteMatch: true, estimate: null,
  explanation: { reasonSummary: 'Available', available: [], missing: [], checkQuantity: [], soonestUseByDate: null, urgencyTier: 'use_today', usesExpiring: ['rice'], useFirst: null, optionalAdditions: [] },
};

it('keeps the meal explanation accessible and bookmark independent of opening a recipe', async () => {
  await ready;
  const open = vi.fn();
  const bookmark = vi.fn();
  render(<ThemeProvider><RecipeCard meal={meal} timeLabel="20 minutes" expiringLabel="Uses your expiring: rice" matchLabel="Ready to cook" sideLabel="Side Dish" onPress={open} bookmark={{ label: 'Save Recipe', selected: false, onPress: bookmark }} /></ThemeProvider>);
  const card = screen.getByRole('button', { name: 'Rice and Beans' });
  expect(card).toHaveAccessibleDescription('Ready to cook Uses your expiring: rice');
  expect(within(card).getByText('20 minutes')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Save Recipe' }));
  expect(bookmark).toHaveBeenCalledOnce();
  expect(open).not.toHaveBeenCalled();
  fireEvent.click(card);
  expect(open).toHaveBeenCalledOnce();
});

it('changes detail panels by keyboard and preserves the action in both panels', async () => {
  await ready;
  render(<ThemeProvider><RecipeDetail title="Rice and Beans" imageAlt="Rice and Beans" metadata="20 minutes" ingredients={<p>Rice: 200 g</p>} method={<p>Read the original recipe for instructions.</p>} ingredientsLabel="Ingredients" methodLabel="Step By Step" action={<button>Original Recipe</button>} onBack={vi.fn()} backLabel="Back to Meals" /></ThemeProvider>);
  expect(screen.getByRole('tab', { name: 'Step By Step' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('tabpanel', { name: 'Step By Step' })).toBeVisible();
  const ingredients = screen.getByRole('tab', { name: 'Ingredients' });
  fireEvent.click(ingredients);
  expect(screen.getByText('Rice: 200 g')).toBeVisible();
  ingredients.focus();
  fireEvent.keyDown(ingredients, { key: 'ArrowRight' });
  expect(screen.getByRole('tab', { name: 'Step By Step' })).toHaveFocus();
  expect(screen.getByRole('tabpanel', { name: 'Step By Step' })).toHaveTextContent('Read the original recipe');
  expect(screen.queryByText('Rice: 200 g')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Original Recipe' })).toBeInTheDocument();
});

it('renders past dates as neutral review reminders and estimated dates with an edit action', async () => {
  await ready;
  const edit = vi.fn();
  render(<ThemeProvider><UrgencyBadge tier="review" label="Past date - check it" /><UrgencyBadge tier="use_today" label="Estimated: use today" estimated onEdit={edit} editLabel="Edit Estimated Date" /></ThemeProvider>);
  expect(screen.getByText('Past date - check it')).toHaveStyle({ textDecoration: 'line-through' });
  expect(screen.getByText('Past date - check it')).not.toHaveStyle({ color: 'red' });
  fireEvent.click(screen.getByRole('button', { name: 'Edit Estimated Date' }));
  expect(edit).toHaveBeenCalledOnce();
});

it('labels side dishes and avoids reserving a photo area when no image is supplied', async () => {
  await ready;
  render(<ThemeProvider><RecipeCard meal={{ ...meal, recipe: { ...meal.recipe, isSide: true } }} timeLabel="20 minutes" expiringLabel="Uses your expiring: rice" matchLabel="Ready to cook" sideLabel="Side Dish" onPress={vi.fn()} /></ThemeProvider>);
  const card = screen.getByRole('button', { name: 'Rice and Beans' });
  expect(within(card).getByText('Side Dish')).toBeInTheDocument();
  expect(card.querySelector('img')).toBeNull();
  expect(Array.from(card.querySelectorAll('[style]')).some(element => (element as HTMLElement).style.aspectRatio)).toBe(false);
});

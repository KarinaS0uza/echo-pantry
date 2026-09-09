import type { DemoItem } from './store';

export const DEMO_RECIPES: { id: 'tomato' | 'beans'; image: string; ingredients: string[] }[] = [
  { id: 'tomato', image: '/images/kitchen/tomato-burrata.png', ingredients: ['cherryTomatoes', 'pasta', 'burrata', 'basil', 'garlic', 'oliveOil'] },
  { id: 'beans', image: '/images/kitchen/lemon-beans.png', ingredients: ['beans', 'lemon', 'oliveOil', 'parsley'] },
];
export function missingIngredients(dish: 'tomato' | 'beans', items: DemoItem[]) {
  const required = DEMO_RECIPES.find(recipe => recipe.id === dish)!.ingredients;
  return required.filter(key => !items.some(item => item.nameKey === `demo.food.${key}` && Number(item.quantity) > 0));
}

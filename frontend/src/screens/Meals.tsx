import { useSearchParams } from 'react-router-dom';
import { useDemoPantry } from '@/demo/store';
import { DEMO_RECIPES, missingIngredients } from '@/demo/recipes';
import { Surface, Image } from '@/components';
import { useSession } from '@/api/session';
import { request } from '@/api/client';
import type { MealsResponse } from '@/api/endpoints';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppShell, Button, Checkbox, Chip, EmptyState, ErrorState, ListTemplate, QuantityStepper, SectionHeader, Stack, Text } from '@/components';
import { endpoints, type Meal } from '@/api/endpoints';
import { useT } from '@/i18n';
import { useGuardedNavigate } from '@/drafts/NavigationGuard';
import { RecipeCard } from '@/components/Discovery';
import { mealPhoto } from '@/demo/mealPhotos';

const READY_MEAL_LIMIT = 7;
const PURCHASE_NEEDED_LIMIT = 3;

export function CatalogueMeals() {
  const t = useT();
  const account = useSession();
  const navigate = useGuardedNavigate();
  const [servings, setServings] = useState(2);
  const [includeOptional, setIncludeOptional] = useState<string[]>([]);
  const foods = useQuery({ queryKey: ['sample-foods'], queryFn: endpoints.sampleFoods, staleTime: Infinity });
  const query = new URLSearchParams({ servings: String(servings) });
  includeOptional.forEach(value => query.append('includeOptional', value));
  const queryString = `?${query}`;
  const meals = useQuery({ queryKey: [account ? 'owned' : 'sample-meals', account?.id, queryString], queryFn: () => account ? request<MealsResponse>(`/meals${queryString}`) : endpoints.sampleMeals(queryString) });
  const completeMatches = (meals.data?.completeMatches ?? []).slice(0, READY_MEAL_LIMIT);
  const displayedMeals = {
    completeMatches,
    purchaseNeeded: (meals.data?.purchaseNeeded ?? []).slice(0, PURCHASE_NEEDED_LIMIT),
  };
  function toggle(values: string[], value: string, checked: boolean) { return checked ? [...new Set([...values, value])] : values.filter(item => item !== value); }
  const noMeals = meals.data && !meals.data.completeMatches.length && !meals.data.purchaseNeeded.length;
  const controls = <Stack gap="md"><QuantityStepper variant="inline" label={t('meals.servings')} value={servings} onChange={setServings} />{includeOptional.length > 0 && <Stack direction="row" wrap>{includeOptional.map(value => <Chip key={value} label={t('meals.included', { name: foods.data?.results.find(food => food.id === value.split(':')[1])?.name || value.split(':')[1] })} selected onPress={() => setIncludeOptional(items => items.filter(item => item !== value))} onRemove={() => setIncludeOptional(items => items.filter(item => item !== value))} />)}</Stack>}</Stack>;
  function explanation(meal: Meal) {
    const facts = meal.explanation;
    const names = [...facts.available, ...facts.missing, ...facts.checkQuantity];
    return <Stack gap="sm"><Text>{t(meal.isCompleteMatch ? 'meals.completeSummary' : 'meals.incompleteSummary')}</Text>{facts.reasonSummary ? <Text>{facts.reasonSummary}</Text> : null}{facts.useFirst && <Text>{t('meals.useFirst', { name: names.find(item => item.food === facts.useFirst)?.name || facts.useFirst })}</Text>}<details><summary>{t('meals.breakdown', { owned: facts.available.length, missing: facts.missing.length, uncertain: facts.checkQuantity.length })}</summary><Stack>{(['available', 'missing', 'checkQuantity'] as const).map(group => <Stack key={group} gap="2xs"><Text variant="label">{t(`meals.${group}`)}</Text>{facts[group].length ? facts[group].map(item => <Text key={item.food}>{item.name}. {t('meals.need', { quantity: item.toTaste ? t('detail.toTaste') : item.need || t('detail.unknown') })} {t('meals.have', { quantity: item.have || t('meals.none') })}</Text>) : <Text>{t('meals.none')}</Text>}</Stack>)}</Stack></details>{!meal.isCompleteMatch && <Text>{t('meals.estimateUnavailable')}</Text>}{facts.optionalAdditions.length > 0 && <Stack><Text variant="label">{t('meals.additions')}</Text>{facts.optionalAdditions.map(item => item.selectable ? <Checkbox key={item.food} label={t('meals.include', { name: item.name })} checked={includeOptional.includes(`${meal.recipe.id}:${item.food}`)} onChange={checked => setIncludeOptional(values => toggle(values, `${meal.recipe.id}:${item.food}`, checked))} /> : <Text key={item.food}>{t('meals.otherIngredient', { name: item.name })}</Text>)}</Stack>}</Stack>;
  }
  return <AppShell><ListTemplate title={t('meals.title')} filters={<Stack>{meals.data?.preview && <Text>{t('owned.preview')}</Text>}<Button label={t('meals.start')} onPress={() => navigate('/pantry')} />{controls}</Stack>} state={meals.isPending ? 'loading' : meals.isError ? 'error' : noMeals ? 'empty' : 'ready'} error={<ErrorState title={t('meals.errorTitle')} description={t('meals.errorBody')} onRetry={() => { void meals.refetch(); }} />} empty={<EmptyState title={t('meals.emptyTitle')} description={t('meals.emptyMeals')} />}>
    {(['completeMatches', 'purchaseNeeded'] as const).filter(group => displayedMeals[group].length > 0).map(group => <section key={group} aria-label={t(`meals.${group}`)}><Stack gap="md"><SectionHeader title={t(`meals.${group}`)} count={displayedMeals[group].length} />{displayedMeals[group].map(meal => <RecipeCard key={meal.recipe.id} meal={meal} imageSrc={mealPhoto(meal.recipe.id)} sideLabel={t('meals.types.side')} timeLabel={meal.recipe.totalTimeMinutes === null ? t('meals.timeUnknown') : t('meals.timeKnown', { count: meal.recipe.totalTimeMinutes })} matchLabel={t(`meals.${group}`)} expiringLabel={meal.explanation.usesExpiring.length ? t('meals.expiring', { names: meal.explanation.usesExpiring.map(id => (foods.data?.results ?? []).find(food => food.id === id)?.name || id).join(', ') }) : t(meal.explanation.urgencyTier === 'unknown' ? 'meals.unknownDate' : `meals.${meal.explanation.urgencyTier}`)} explanation={explanation(meal)} onPress={() => navigate(`/recipes/${meal.recipe.id}?servings=${servings}`)} />)}</Stack></section>)}
  </ListTemplate></AppShell>;
}


/** Demo recommendations always reflect the same persisted pantry used by cooking. */
export function Meals() {
  const t = useT();
  const pantry = useDemoPantry();
  const navigate = useGuardedNavigate();
  const [params, setParams] = useSearchParams();
  const ingredient = params.get('ingredient');
  const recipes = DEMO_RECIPES.filter(recipe => !ingredient || recipe.ingredients.includes(ingredient));
  const names = (keys: readonly string[]) => keys.map(key => t(key === 'parsley' ? 'demoMeals.parsley' : `demo.food.${key}`)).join(', ');
  const controls = <Stack gap="sm"><Stack direction="row" wrap><Button label={t('kitchen.myPantry')} onPress={() => navigate('/demo/pantry')} /><Button label={t('kitchen.backKitchen')} variant="ghost" onPress={() => navigate('/kitchen')} /></Stack>{ingredient && <Chip label={names([ingredient])} selected onPress={() => setParams({})} onRemove={() => setParams({})} />}</Stack>;
  return <AppShell><ListTemplate title={t('demoMeals.title')} introduction={t('demoMeals.introduction')} filters={controls} state={pantry.loading ? 'loading' : pantry.error ? 'error' : recipes.length ? 'ready' : 'empty'} error={<ErrorState title={t('kitchen.pantryLoadError')} description={t('demoMeals.retry')} onRetry={pantry.reload} />} empty={<EmptyState title={t('demoMeals.empty')} description={t('demoMeals.clearFilter')} />}>
    <Stack gap="lg">{recipes.map(recipe => {
      const missing = missingIngredients(recipe.id, pantry.items);
      const available = recipe.ingredients.filter(key => !missing.includes(key));
      return <article key={recipe.id} aria-label={t(`kitchen.dishes.${recipe.id}.title`)}><Surface padding="md"><Stack gap="sm"><Image src={recipe.image} alt="" decorative /><Text heading variant="h2">{t(`kitchen.dishes.${recipe.id}.title`)}</Text><Text>{t(`kitchen.dishes.${recipe.id}.metadata`)}</Text><Text variant="label" live>{missing.length ? t('demoMeals.missing', { count: missing.length }) : t('demoMeals.available')}</Text><Text>{t('demoMeals.have', { names: available.length ? names(available) : t('meals.none') })}</Text>{missing.length > 0 && <Text>{t('demoMeals.need', { names: names(missing) })}</Text>}<Text variant="bodySm" tone="secondary">{t('demoMeals.quantityNote')}</Text><Stack direction="row" wrap><Button label={t('demoMeals.viewRecipe')} onPress={() => navigate(`/kitchen?screen=recipe&dish=${recipe.id}`)} /><Button label={t('demoMeals.updatePantry')} variant="secondary" onPress={() => navigate('/demo/pantry')} /></Stack></Stack></Surface></article>;
    })}</Stack>
  </ListTemplate></AppShell>;
}

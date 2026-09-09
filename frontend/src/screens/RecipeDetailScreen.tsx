import { CookingReview } from './CookingReview';
import { useSession } from '@/api/session';
import { request } from '@/api/client';
import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AppShell, Button, ErrorState, QuantityStepper, Skeleton, Stack, Text } from '@/components';
import { MethodStep, RecipeDetail } from '@/components/Discovery';
import { endpoints, type RecipeDetails } from '@/api/endpoints';
import { useT } from '@/i18n';
import { mealPhoto } from '@/demo/mealPhotos';
import { useGuardedNavigate } from '@/drafts/NavigationGuard';

export function RecipeDetailScreen() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const initial = Number(params.get('servings') || 2);
  const [servings, setServings] = useState(Number.isInteger(initial) && initial >= 1 && initial <= 12 ? initial : 2);
  const t = useT();
  const account = useSession();
  const [reviewing, setReviewing] = useState(false);
  const [favoriteError, setFavoriteError] = useState('');
  const favorites = useQuery({ queryKey: ['owned', 'favorites', account?.id], enabled: Boolean(account), queryFn: () => request<{ favorites: { id: number; target: { id: string } }[] }>('/favorites') });
  const favorite = favorites.data?.favorites.find(row => row.target.id === id);
  const navigate = useGuardedNavigate();
  const query = useQuery({ queryKey: ['sample-recipe', id, servings], queryFn: () => endpoints.recipe(id, servings) });
  // Keep controls mounted while serving changes load or fail, preserving keyboard focus.
  const previous = useRef<RecipeDetails>();
  useEffect(() => { if (query.data) previous.current = query.data; }, [query.data]);
  const recipe = query.data || (previous.current?.id === id ? previous.current : undefined);
  const back = () => navigate('/meals');
  const error = <ErrorState title={t('detail.errorTitle')} description={t('detail.errorBody')} onRetry={() => { void query.refetch(); }} />;
  if (!recipe) return <AppShell><Stack><Button label={t('detail.back')} variant="ghost" iconLeft="ArrowLeft" onPress={back} />{query.isError ? error : <Skeleton />}</Stack></AppShell>;
  const methodCopy = t(`detail.methods.${recipe.id}`, { returnObjects: true, defaultValue: [] });
  const methodSteps = Array.isArray(methodCopy) ? methodCopy.filter((step): step is string => typeof step === 'string') : [];
  const safeSource = /^https?:\/\//i.test(recipe.sourceUrl);
  const source = safeSource ? <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer">{t('detail.openOriginal', { source: recipe.sourceName })}</a> : <Text>{recipe.sourceName}</Text>;
  const ingredients = <Stack><QuantityStepper label={t('meals.servings')} value={servings} onChange={setServings} />{query.isError ? error : query.isPending || !query.data ? <><Text live>{t('common.loading')}</Text><Skeleton /></> : recipe.ingredients.map((line, index) => <Text key={`${line.food}-${index}`}>{line.name}: {line.toTaste ? t('detail.toTaste') : line.amount === null ? t('detail.unknown') : `${Number(line.amount).toLocaleString(undefined, { maximumSignificantDigits: 8 })}${line.unit ? ` ${line.unit}` : ''}`}{line.optional ? ` (${t('detail.optional')})` : ''}</Text>)}{source}</Stack>;
  return <AppShell><RecipeDetail key={recipe.id} title={recipe.title} imageSrc={mealPhoto(recipe.id)} imageAlt={recipe.title} metadata={t('detail.source', { source: recipe.sourceName })} onBack={back} backLabel={t('detail.back')} ingredientsLabel={t('detail.ingredients')} methodLabel={t('detail.method')} panelsLabel={t('detail.panels')} ingredients={ingredients} method={<Stack gap="md">{methodSteps.length > 0 ? <><Text heading variant="h3">{t('detail.quickMethod')}</Text>{methodSteps.map((step, index) => <MethodStep key={`${recipe.id}-${index}`} index={index + 1}>{step}</MethodStep>)}<Text variant="bodySm" tone="secondary">{t('detail.quickMethodBody')}</Text></> : <Text>{t('detail.methodBody')}</Text>}{source}</Stack>} action={<Stack>{account ? <><Button label={t('owned.cooked')} onPress={() => setReviewing(true)} /><Button label={t(favorite ? 'owned.unfavorite' : 'owned.favorite')} variant="secondary" onPress={async () => { try { await request(favorite ? `/favorites/${favorite.id}` : '/favorites', { method: favorite ? 'DELETE' : 'POST', body: favorite ? undefined : { curatedRecipe: id } }); await favorites.refetch(); setFavoriteError(''); } catch { setFavoriteError(t('owned.saveFailed')); } }} />{Boolean(favoriteError) && <Text live tone="danger">{favoriteError}</Text>}</> : <Button label={t('meals.start')} onPress={() => navigate('/pantry')} />}</Stack>} />{reviewing && <CookingReview recipe={id} servings={servings} onClose={() => setReviewing(false)} />}</AppShell>;
}

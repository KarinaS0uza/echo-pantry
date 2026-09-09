import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDemoPantry } from '@/demo/store';
import { ThemeScope, useTheme } from '@/design/theme';
import { KitchenStyles } from '@/design/KitchenStyles';
import { useT } from '@/i18n';
import { useGuardedNavigate } from '@/drafts/NavigationGuard';
import { Button, GlassIconButton, IconButton } from './Button';
import { Badge } from './Status';
import { Checkbox, Input } from './Input';
import { SegmentedControl, Sheet } from './Molecules';
import { NavDrawer } from './Navigation';
import { MethodStep } from './Discovery';
import { CategoryIcon } from './Image';
import { Stack } from './Stack';
import { Text } from './Text';
import { BrandLogo } from './BrandLogo';

export type DemoDish = 'beans' | 'tomato';
type DemoView = 'home' | 'recipe' | 'cooking';
type RecipeCopy = { title: string; metadata: string; ingredients: string[]; method: string[]; steps: { title: string; body: string; tip: string }[] };
const photos = { beans: '/images/kitchen/lemon-beans.png', tomato: '/images/kitchen/tomato-burrata.png' };
const durations: Record<DemoDish, number[]> = { beans: [0, 60, 480, 0, 0, 0], tomato: [0, 0, 0, 0, 0, 0] };

/** Decorative food cutout. Preserve its space if the local asset fails to load. */
function KitchenFood({ src, variant = 'hero' }: { src: string; variant?: 'hero' | 'dish' | 'recipe' | 'tile' }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return <div data-kitchen-food={variant} aria-hidden="true">{failed ? <CategoryIcon category="produce" /> : <img src={src} alt="" onError={() => setFailed(true)} />}</div>;
}

/** Wall-clock countdown, so a backgrounded tab does not make the timer drift. */
export function useKitchenTimer(total: number) {
  const { t } = useTheme();
  const [remaining, setRemaining] = useState(total);
  const [running, setRunning] = useState(false);
  const deadline = useRef(0);
  const reset = useCallback((seconds: number) => { setRunning(false); setRemaining(seconds); deadline.current = 0; }, []);
  useEffect(() => { reset(total); }, [total, reset]);
  useEffect(() => {
    if (!running) return;
    const update = () => {
      const next = Math.max(0, Math.ceil((deadline.current - Date.now()) / t.timing.second));
      setRemaining(next);
      if (!next) setRunning(false);
    };
    const timer = window.setInterval(update, t.timing.second);
    return () => window.clearInterval(timer);
  }, [running, t]);
  function toggle() {
    if (running) { setRemaining(Math.max(0, Math.ceil((deadline.current - Date.now()) / t.timing.second))); setRunning(false); }
    else if (remaining > 0) { deadline.current = Date.now() + remaining * t.timing.second; setRunning(true); }
  }
  return { remaining, running, toggle, reset };
}

export function Timer({ total, remaining, running, onToggle, onReset }: { total: number; remaining: number; running: boolean; onToggle: () => void; onReset: () => void }) {
  const translate = useT();
  const { t } = useTheme();
  const ring = t.kitchen.ring;
  const length = 2 * Math.PI * ring.radius;
  const formatted = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;
  return <div data-kitchen-timer=""><Text variant="label">{translate('kitchen.timer')}</Text>
    <div data-timer-ring=""><svg viewBox={ring.viewBox} aria-hidden="true"><circle cx={ring.center} cy={ring.center} r={ring.radius} fill="none" stroke={t.kitchen.timerTrack} strokeWidth={ring.stroke} /><circle cx={ring.center} cy={ring.center} r={ring.radius} fill="none" stroke={t.kitchen.timerAccent} strokeWidth={ring.stroke} strokeLinecap="round" strokeDasharray={length} strokeDashoffset={length * (1 - remaining / Math.max(1, total))} /></svg>
      <Stack gap="none" align="center"><output data-timer-digits="" aria-live="off" aria-label={translate('kitchen.timeRemaining')}>{formatted}</output><Text variant="bodySm" tone="secondary">{translate('kitchen.timeUnits')}</Text></Stack>
    </div>
    <Stack align="center" gap="2xs"><Button label={translate(running ? 'kitchen.pauseTimer' : remaining === total ? 'kitchen.startTimer' : 'kitchen.resumeTimer')} iconLeft={running ? 'Pause' : 'Play'} variant="ghost" disabled={remaining === 0} onPress={onToggle} /><Button label={translate('kitchen.resetTimer')} variant="ghost" size="sm" onPress={onReset} /><Text live variant="bodySm">{remaining === 0 ? translate('kitchen.timerFinished') : running ? translate('kitchen.timerRunning') : translate('kitchen.timerPaused')}</Text></Stack>
  </div>;
}

/** Guided demo with persisted pantry use and rewards. Bookmarks last for this visit. */
export function KitchenPreview() {
  const translate = useT();
  const navigate = useGuardedNavigate();
  const { scheme, setScheme } = useTheme();
  const [params, setParams] = useSearchParams();
  const view: DemoView = params.get('screen') === 'recipe' ? 'recipe' : params.get('screen') === 'cooking' ? 'cooking' : 'home';
  const dish: DemoDish = params.get('dish') === 'beans' ? 'beans' : 'tomato';
  const pantry = useDemoPantry();
  const recipe = translate(`kitchen.dishes.${dish}`, { returnObjects: true }) as RecipeCopy;
  const tomato = translate('kitchen.dishes.tomato', { returnObjects: true }) as RecipeCopy;
  const tomatoIngredients = ['pasta', 'cherryTomatoes', 'burrata', 'basil', 'garlic', 'oliveOil'];
  const missingTomatoIngredients = tomatoIngredients.filter(key => !pantry.items.some(item => item.nameKey === `demo.food.${key}`));
  const availability = pantry.loading ? translate('common.loading') : pantry.error ? translate('kitchen.pantryLoadError') : missingTomatoIngredients.length ? translate('kitchen.missingIngredients', { ingredients: missingTomatoIngredients.map(key => translate(`demo.food.${key}`)).join(', ') }) : translate('kitchen.readyFromPantry');
  const [panel, setPanel] = useState('method');
  const [step, setStep] = useState(0);
  const [finished, setFinished] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [usedIds, setUsedIds] = useState<string[]>([]);
  const [completing, setCompleting] = useState(false);
  const [completionError, setCompletionError] = useState(false);
  const [pointsAwarded, setPointsAwarded] = useState(0);
  const completionId = useRef(crypto.randomUUID());
  const submissionPending = useRef(false);
  const submittedIds = useRef<string[] | null>(null);
  const finishRef = useRef<HTMLButtonElement>(null);
  const [saved, setSaved] = useState<DemoDish[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [menu, setMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [tip, setTip] = useState(false);
  const menuRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLButtonElement>(null);
  const tipRef = useRef<HTMLButtonElement>(null);
  const total = durations[dish][step];
  const timer = useKitchenTimer(total);
  const resetTimer = timer.reset;
  const current = recipe.steps[step];
  const activeStep = useRef(step);
  // A different step always starts with its own timer, even if two durations match.
  useEffect(() => { if (activeStep.current !== step) { resetTimer(total); activeStep.current = step; } }, [step, total, resetTimer]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.getElementById(`kitchen-${view}`)?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [view, step, finished]);
  function go(next: DemoView, nextDish = dish) { setParams({ screen: next, dish: nextDish }); }
  function choose(next: DemoDish) { timer.reset(durations[next][0]); setStep(0); setFinished(false); setPanel('method'); setSearchOpen(false); go('recipe', next); }
  function start() { completionId.current = crypto.randomUUID(); submittedIds.current = null; setCompletionError(false); setStep(0); timer.reset(durations[dish][0]); setFinished(false); go('cooking'); }
  function nextStep() {
    if (step === recipe.steps.length - 1) {
      timer.reset(0);
      const required = dish === 'tomato' ? ['cherryTomatoes', 'pasta', 'burrata', 'basil', 'garlic', 'oliveOil'] : ['beans', 'lemon', 'oliveOil'];
      setUsedIds(submittedIds.current ?? pantry.items.filter(item => required.some(key => item.nameKey === `demo.food.${key}`)).map(item => item.id));
      setReviewOpen(true);
    } else setStep(value => value + 1);
  }
  async function finishCooking() {
    if (submissionPending.current) return;
    submissionPending.current = true;
    setCompleting(true);
    setCompletionError(false);
    submittedIds.current ??= usedIds;
    try {
      const result = await pantry.completeCooking(dish, submittedIds.current, completionId.current);
      setPointsAwarded(result.pointsAwarded);
      setReviewOpen(false);
      setFinished(true);
    } catch { setCompletionError(true); }
    finally { submissionPending.current = false; setCompleting(false); }
  }
  function toggleSaved(which: DemoDish) { setSaved(values => values.includes(which) ? values.filter(value => value !== which) : [...values, which]); }
  const saveLabel = (which: DemoDish) => translate(saved.includes(which) ? 'kitchen.unsaveRecipe' : 'kitchen.saveRecipe', { name: translate(`kitchen.dishes.${which}.title`) });
  return <div data-kitchen="" data-kitchen-view={view}><KitchenStyles />
    <div data-kitchen-top=""><Stack direction="row" align="center" justify="space-between" wrap gap="xs"><BrandLogo /><Stack direction="row" align="center" gap="2xs"><Button label={translate('kitchen.myPantry')} variant="ghost" onPress={() => navigate('/demo/pantry')} /><IconButton name={scheme === 'light' ? 'Moon' : 'Sun'} label={translate(scheme === 'light' ? 'kitchen.dark' : 'kitchen.light')} onPress={() => setScheme(scheme === 'light' ? 'dark' : 'light')} /></Stack></Stack></div>
    <main data-kitchen-board="" aria-label={translate('kitchen.home')}>
      <section data-kitchen-panel="" data-active={view === 'home'} hidden={view !== 'home'} aria-label={translate('kitchen.home')}>
        <div data-kitchen-header=""><div data-kitchen-mobile-brand=""><BrandLogo size="compact" /></div><div data-kitchen-desktop-title=""><Text variant="h2">{translate('kitchen.home')}</Text></div><Stack direction="row" gap="2xs"><IconButton ref={searchRef} name="Search" label={translate('kitchen.search')} onPress={() => setSearchOpen(true)} /><IconButton ref={menuRef} name="Menu" label={translate('nav.menu')} onPress={() => setMenu(true)} /></Stack></div>
        <h1 data-kitchen-title="" id="kitchen-home" tabIndex={-1}>{translate('kitchen.headline')}</h1>
        <div data-kitchen-section=""><Stack gap="sm"><Text variant="bodyLg">{translate('kitchen.overview')}</Text><Button label={translate('kitchen.myPantry')} iconRight="ArrowRight" onPress={() => navigate('/demo/pantry')} />{pantry.loading ? <Text live>{translate('common.loading')}</Text> : pantry.error ? <Stack gap="2xs"><Text live tone="danger">{translate('kitchen.pantryLoadError')}</Text><Button label={translate('kitchen.retryPantry')} variant="ghost" onPress={pantry.reload} /></Stack> : <Text live variant="bodySm" tone="secondary">{translate('kitchen.pantrySummary', { count: pantry.items.length, points: pantry.points })}</Text>}</Stack></div>
        <article data-kitchen-feature="" aria-label={tomato.title}>
          <button type="button" data-control="button" aria-label={tomato.title} onClick={() => choose('tomato')}><KitchenFood src={photos.tomato} variant="dish" /><div data-feature-copy=""><Stack gap="3xs"><Text variant="h2">{tomato.title}</Text><Text>{tomato.metadata}</Text></Stack></div></button>
          <div data-kitchen-bookmark=""><GlassIconButton name="Bookmark" label={saveLabel('tomato')} selected={saved.includes('tomato')} onPress={() => toggleSaved('tomato')} /></div>
        </article>
        <Text live variant="bodySm">{availability}</Text>
        <div data-kitchen-section=""><Stack gap="xs"><Stack direction="row" justify="space-between" align="center"><Text heading variant="h3">{translate('kitchen.quickIdeas')}</Text><Button label={translate('kitchen.seeAll')} variant="ghost" size="sm" onPress={() => navigate('/meals')} /></Stack>
          <div data-kitchen-ideas="">{(['lemon', 'beans', 'green'] as const).map(idea => <button key={idea} data-kitchen-tile="" data-control="button" aria-label={translate(`kitchen.ideas.${idea}.title`)} onClick={() => navigate(`/meals?ingredient=${idea === 'green' ? 'basil' : idea}`)}><KitchenFood src={idea === 'lemon' ? '/images/kitchen/lemon.png' : idea === 'beans' ? photos.beans : '/images/kitchen/ingredients.png'} variant="tile" /><Stack gap="3xs"><Text variant="label">{translate(`kitchen.ideas.${idea}.title`)}</Text><Text variant="caption" tone="secondary">{translate(`kitchen.ideas.${idea}.body`)}</Text></Stack></button>)}</div>
        </Stack></div>
      </section>
      <section data-kitchen-panel="" data-active={view === 'recipe'} hidden={view !== 'recipe'} aria-label={translate('kitchen.recipe')}>
        <div data-kitchen-header=""><GlassIconButton name="ArrowLeft" label={translate('kitchen.backKitchen')} onPress={() => go('home')} /><div data-kitchen-mobile-brand=""><BrandLogo size="compact" /></div><GlassIconButton name="Bookmark" label={saveLabel(dish)} selected={saved.includes(dish)} onPress={() => toggleSaved(dish)} /></div>
        <KitchenFood src={photos[dish]} variant="recipe" />
        <div data-kitchen-recipe-body=""><SegmentedControl label={translate('detail.panels')} value={panel} onChange={setPanel} options={[{ id: 'ingredients', label: translate('detail.ingredients') }, { id: 'method', label: translate('detail.method') }]} />
          <Stack gap="2xs"><div id="kitchen-recipe" tabIndex={-1}><Text heading variant="h1">{recipe.title}</Text></div><Text>{recipe.metadata}</Text></Stack>
          <div data-kitchen-recipe-panel="" role="tabpanel" aria-label={translate(panel === 'ingredients' ? 'detail.ingredients' : 'detail.method')} tabIndex={0}>
            <Stack gap="md"><Text heading variant="h3">{translate(panel === 'ingredients' ? 'detail.ingredients' : 'detail.method')}</Text>{panel === 'method' ? recipe.method.map((instruction, index) => <MethodStep key={`${dish}-${index}`} index={index + 1}>{instruction}</MethodStep>) : recipe.ingredients.map((ingredient, index) => <Checkbox key={`${dish}-${index}`} label={ingredient} checked={Boolean(checked[`${dish}-${index}`])} onChange={value => setChecked(previous => ({ ...previous, [`${dish}-${index}`]: value }))} />)}</Stack>
          </div>
          <div data-kitchen-action=""><Button label={translate('kitchen.startCooking')} fullWidth size="lg" onPress={start} /></div>
        </div>
      </section>
      <ThemeScope scheme="dark"><section data-kitchen-panel="" data-kitchen-cook="" data-active={view === 'cooking'} hidden={view !== 'cooking'} aria-label={translate('kitchen.cooking')}>
        <div data-kitchen-header=""><GlassIconButton name="ArrowLeft" label={translate('kitchen.backRecipe')} onPress={() => { timer.reset(total); go('recipe'); }} /><div data-kitchen-mobile-brand=""><BrandLogo size="compact" /></div><GlassIconButton name="Ellipsis" label={translate('kitchen.cookingOptions')} onPress={() => setTip(true)} /></div>
        <Stack gap="md"><Badge label={finished ? translate('kitchen.complete') : translate('kitchen.stepCount', { current: step + 1, total: recipe.steps.length })} /><h2 id="kitchen-cooking" tabIndex={-1} data-kitchen-title="">{finished ? translate('kitchen.enjoy') : current.title}</h2><Text variant="bodyLg">{finished ? translate('kitchen.finishedBody', { count: submittedIds.current?.length ?? 0 }) : current.body}</Text></Stack>
        {finished && <Stack gap="xs"><Badge label={translate('kitchen.pointsEarned', { points: pointsAwarded })} tone="success" /><Text>{translate('kitchen.homeReward')}</Text><Text>{translate('kitchen.balancedReward')}</Text><Text variant="bodySm">{translate('kitchen.rewardNote')}</Text><Text live>{translate('kitchen.totalRewards', { points: pantry.points, count: pantry.mealsCooked })}</Text></Stack>}
        {total > 0 && !finished ? <Timer total={total} remaining={timer.remaining} running={timer.running} onToggle={timer.toggle} onReset={() => timer.reset(total)} /> : <div data-kitchen-section=""><KitchenFood src={photos[dish]} variant="dish" />{!finished && <Text tone="secondary">{translate('kitchen.takeYourTime')}</Text>}</div>}
        <div data-kitchen-action=""><Stack gap="xs"><Stack direction="row" align="center" gap="2xs"><Stack variant="grow"><Button ref={finishRef} label={translate(finished ? 'kitchen.viewPantry' : step === recipe.steps.length - 1 ? 'kitchen.finishCooking' : 'kitchen.nextStep')} size="lg" fullWidth onPress={finished ? () => navigate('/demo/pantry') : nextStep} /></Stack>{!finished && <IconButton ref={tipRef} name="Lightbulb" label={translate('kitchen.showTip')} onPress={() => setTip(true)} glass />}</Stack>{step > 0 && !finished && <Button label={translate('kitchen.previousStep')} variant="ghost" onPress={() => setStep(value => value - 1)} />}</Stack></div>
        <Sheet open={tip} title={translate('kitchen.tip')} onClose={() => setTip(false)} finalFocusRef={tipRef}><Text>{current.tip}</Text></Sheet>
      </section></ThemeScope>
    </main>
    <div data-kitchen-note=""><Stack gap="2xs" align="center"><Text live align="center" tone="secondary" variant="bodySm">{saved.length ? translate('kitchen.savedVisit', { count: saved.length }) : ''}</Text></Stack></div>
    <Sheet open={reviewOpen} title={translate('kitchen.reviewTitle')} onClose={() => { if (!completing) setReviewOpen(false); }} finalFocusRef={finishRef}>
      <Stack gap="sm"><Text>{translate('kitchen.reviewBody')}</Text>
        {pantry.loading ? <Text live>{translate('common.loading')}</Text> : pantry.items.map(item => <Checkbox key={item.id} label={`${translate(item.nameKey)} (${item.quantity} ${translate(`pantry.units.${item.unit}`, { defaultValue: item.unit })})`} checked={usedIds.includes(item.id)} disabled={completing || Boolean(submittedIds.current)} onChange={checked => setUsedIds(ids => checked ? [...ids, item.id] : ids.filter(id => id !== item.id))} />)}
        {!pantry.loading && !pantry.error && !pantry.items.length && <Text>{translate('kitchen.noPantryItems')}</Text>}
        {pantry.error && !submittedIds.current && <Stack gap="2xs"><Text live tone="danger">{translate('kitchen.pantryLoadError')}</Text><Button label={translate('kitchen.retryPantry')} variant="ghost" onPress={pantry.reload} /></Stack>}
        {completionError && <Text live tone="danger">{translate('kitchen.completionError')}</Text>}
        <Button label={translate(completionError ? 'kitchen.retryFinish' : 'kitchen.finishCooking')} loading={completing} disabled={pantry.loading || Boolean(pantry.error && !submittedIds.current)} onPress={finishCooking} />
      </Stack>
    </Sheet>
    <NavDrawer open={menu} onClose={() => setMenu(false)} menuRef={menuRef} insideKitchen />
    <Sheet open={searchOpen} title={translate('kitchen.search')} onClose={() => setSearchOpen(false)} finalFocusRef={searchRef}><Input label={translate('kitchen.searchLabel')} value={search} onChange={setSearch} clearable /><Stack gap="sm">{(['tomato', 'beans'] as const).filter(key => translate(`kitchen.dishes.${key}.title`).toLocaleLowerCase().includes(search.toLocaleLowerCase())).map(key => <Button key={key} label={translate(`kitchen.dishes.${key}.title`)} iconRight="ArrowRight" variant="secondary" onPress={() => choose(key)} />)}{!(['tomato', 'beans'] as const).some(key => translate(`kitchen.dishes.${key}.title`).toLocaleLowerCase().includes(search.toLocaleLowerCase())) && <Text live>{translate('kitchen.noResults')}</Text>}</Stack></Sheet>
  </div>;
}

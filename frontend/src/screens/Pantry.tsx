import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AppShell, Button, Dialog, EmptyState, ErrorState, Input, Select, ListTemplate, SectionHeader, Stack, Surface, Text } from '@/components';
import { UrgencyBadge, type UrgencyTier } from '@/components/Discovery';
import { useDemoPantry } from '@/demo/store';
import { useT, i18n } from '@/i18n';
import { useDraftGuard, useGuardedNavigate } from '@/drafts/NavigationGuard';
import { useDraft } from '@/drafts/useDraft';
import { DraftRestoredBar } from '@/drafts/DraftRestoredBar';

const STORAGE_LOCATIONS = ['fridge', 'freezer', 'pantry'] as const;
const LOCATION_ORDER = [...STORAGE_LOCATIONS, 'other'] as const;
const UNITS = ['item', 'g', 'kg', 'oz', 'lb', 'ml', 'l', 'tsp', 'tbsp', 'cup'];
type Entry = { nameKey: string; quantity: string; unit: string; storageLocation: string; date: string };
type Item = Entry & { id: string };
function urgency(date: string): { tier: UrgencyTier; days: number | null } {
  if (!date) return { tier: 'unknown', days: null };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = Math.round((new Date(`${date}T00:00:00`).getTime() - today.getTime()) / 86400000);
  return { tier: days < 0 ? 'review' : days === 0 ? 'use_today' : days <= 2 ? 'use_soon' : days <= 5 ? 'coming_up' : 'neutral', days };
}
function PantryRow({ item }: { item: Item }) {
  const t = useT();
  const { tier, days } = urgency(item.date);
  const date = item.date ? new Date(`${item.date}T00:00:00`).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' }) : '';
  return <Surface padding="sm" elevation="none"><Stack direction="row" gap="sm" align="flex-start" justify="space-between" wrap>
    <Stack gap="2xs"><Text>{t(item.nameKey, { defaultValue: item.nameKey })}</Text>
      <Text variant="label" tone="secondary">{Number(item.quantity).toLocaleString(i18n.language)} {t(`pantry.units.${item.unit}`, { defaultValue: item.unit })}</Text>
      {Boolean(date) && <Text variant="caption" tone="secondary">{t('demoPantry.expiry', { date })}</Text>}
    </Stack>
    <Stack gap="2xs" align="flex-end"><UrgencyBadge tier={tier} label={t(`pantry.tiers.${tier}`)} />
      {days !== null && days > 0 && days <= 5 && <Text variant="caption" tone="secondary">{t('pantry.daysLeft', { count: days })}</Text>}
    </Stack>
  </Stack></Surface>;
}
function IngredientEntry({ onAdd, onCancel }: { onAdd: (entries: Entry[]) => Promise<void>; onCancel: () => void }) {
  const t = useT();
  const blankEntry = (): Entry => ({ nameKey: '', quantity: '1', unit: 'item', storageLocation: 'fridge', date: '' });
  const demoDate = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };
  const initial: Entry[] = [
    { nameKey: t('demoPantry.prefill.spinach'), quantity: '150', unit: 'g', storageLocation: 'fridge', date: demoDate(2) },
    { nameKey: t('demoPantry.prefill.lemons'), quantity: '2', unit: 'item', storageLocation: 'fridge', date: demoDate(7) },
    { nameKey: t('demoPantry.prefill.chickpeas'), quantity: '400', unit: 'g', storageLocation: 'pantry', date: demoDate(90) },
  ];
  const draft = useDraft('demo-pantry-entry', { rows: JSON.stringify(initial) }, ['rows']);
  useDraftGuard(draft.dirty, draft.discard);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const guard = useRef(false);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => { form.current?.querySelector('input')?.focus(); }, []);
  let entries: Entry[];
  try {
    const parsed: unknown = JSON.parse(draft.values.rows);
    entries = Array.isArray(parsed) && parsed.length > 0 && parsed.every(row => row && Object.keys(initial[0]).every(key => typeof row[key] === 'string')) ? parsed : initial;
  } catch { entries = initial; }
  entries = entries.map(row => ({ ...row, storageLocation: row.storageLocation === 'refrigerator' ? 'fridge' : row.storageLocation === 'counter' ? 'pantry' : row.storageLocation }));
  const focusNewRow = useRef(false);
  useEffect(() => {
    if (focusNewRow.current) {
      form.current?.querySelector<HTMLInputElement>('section:last-of-type input')?.focus();
      focusNewRow.current = false;
    }
  }, [entries.length]);
  const addOneMore = () => {
    focusNewRow.current = true;
    draft.setValues({ rows: JSON.stringify([...entries, blankEntry()]) });
    setError('');
  };
  const change = (index: number, field: keyof Entry, value: string) => {
    draft.setValues({ rows: JSON.stringify(entries.map((row, position) => position === index ? { ...row, [field]: value } : row)) });
    setError('');
  };
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (guard.current) return;
    if (entries.some(row => !row.nameKey.trim() || !/^\d+(\.\d{1,6})?$/.test(row.quantity.trim()) || Number(row.quantity) <= 0 || Number(row.quantity) > 100000 || (row.date && (!/^\d{4}-\d{2}-\d{2}$/.test(row.date) || Number.isNaN(Date.parse(row.date)) || new Date(row.date).toISOString().slice(0, 10) !== row.date)))) {
      setError(t('demoPantry.invalid')); return;
    }
    guard.current = true; setPending(true); setError('');
    try { await onAdd(entries.map(row => ({ ...row, nameKey: row.nameKey.trim(), quantity: row.quantity.trim() }))); draft.clear(); }
    catch { setError(t('demoPantry.addError')); }
    finally { guard.current = false; setPending(false); }
  }
  return <Surface><form ref={form} onSubmit={submit} noValidate><Stack gap="md">
    <Text heading variant="h2">{t('demoPantry.entryTitle')}</Text>
    <Text tone="secondary">{t('demoPantry.entryHelp')}</Text>
    {draft.restored && <DraftRestoredBar onDiscard={draft.discard} />}
    {draft.saveFailed && <Text live tone="danger">{t('pantry.entry.draftFailed')}</Text>}
    {entries.map((row, index) => <section key={index} aria-label={t('demoPantry.row', { count: index + 1 })}><Stack gap="sm">
      <Text heading variant="h3">{t('demoPantry.row', { count: index + 1 })}</Text>
      <Stack direction="row" gap="sm" wrap align="flex-end">
        <Input label={t('pantry.entry.name')} value={row.nameKey} onChange={value => change(index, 'nameKey', value)} required disabled={pending} />
        <Input label={t('pantry.entry.quantity')} inputMode="decimal" value={row.quantity} onChange={value => change(index, 'quantity', value)} required disabled={pending} />
        <Select label={t('pantry.entry.unit')} value={row.unit} onChange={value => change(index, 'unit', value)} options={UNITS.map(unit => ({ value: unit, label: t(`pantry.units.${unit}`) }))} disabled={pending} />
        <Select label={t('pantry.entry.location')} value={row.storageLocation} onChange={value => change(index, 'storageLocation', value)} options={STORAGE_LOCATIONS.map(location => ({ value: location, label: t(`pantry.locations.${location === 'fridge' ? 'refrigerator' : location}`) }))} disabled={pending} />
        <Input label={t('pantry.entry.date')} type="date" value={row.date} onChange={value => change(index, 'date', value)} disabled={pending} />
      </Stack>
    </Stack></section>)}
    {Boolean(error) && <Text live tone="danger">{error}</Text>}
    <Stack direction="row" gap="sm" wrap><Button label={t('demoPantry.add')} type="submit" loading={pending} /><Button variant="secondary" label={t('demoPantry.addOneMore')} disabled={pending} onPress={addOneMore} /><Button variant="secondary" label={t('common.cancel')} disabled={pending} onPress={() => { draft.flush(); onCancel(); }} /></Stack>
  </Stack></form></Surface>;
}
export function Pantry() {
  const t = useT();
  const navigate = useGuardedNavigate();
  const pantry = useDemoPantry();
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [actionError, setActionError] = useState('');
  const locatedItems = pantry.items.map(item => ({ ...item, storageLocation: item.storageLocation === 'refrigerator' ? 'fridge' : item.storageLocation }));
  const groups = LOCATION_ORDER.map(location => ({ location, rows: locatedItems.filter(item => ((LOCATION_ORDER as readonly string[]).includes(item.storageLocation) ? item.storageLocation : 'other') === location).sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999')) })).filter(group => group.rows.length);
  const attention = pantry.items.filter(item => ['review', 'use_today', 'use_soon'].includes(urgency(item.date).tier)).length;
  async function add(entries: Entry[]) {
    await pantry.addIngredients(entries);
    setNotice(t('demoPantry.added', { count: entries.length })); setAdding(false);
  }
  async function reset() {
    try { await pantry.reset(); setNotice(t('demoPantry.resetDone')); setActionError(''); setConfirmReset(false); }
    catch { setActionError(t('demoPantry.resetError')); setConfirmReset(false); }
  }
  return <AppShell><ListTemplate title={t('demoPantry.title')} introduction={t('demoPantry.introduction')}
    state={pantry.loading ? 'loading' : pantry.error ? 'error' : pantry.items.length ? 'ready' : 'empty'}
    error={<ErrorState title={t('pantry.errorTitle')} description={t('pantry.errorBody')} onRetry={pantry.reload} />}
    empty={<EmptyState title={t('pantry.emptyTitle')} description={t('demoPantry.empty')} />}
    filters={<Stack gap="md">
      {pantry.points > 0 && <Surface><Stack gap="xs"><Text heading variant="h2">{t('demoPantry.points', { count: pantry.points })}</Text><Text>{t('demoPantry.meals', { count: pantry.mealsCooked })}</Text></Stack></Surface>}
      {attention > 0 && <Text>{t('pantry.attention', { count: attention })}</Text>}
      <Stack direction="row" gap="sm" wrap>
        {!adding && <Button label={t('demoPantry.add')} iconLeft="Plus" disabled={pantry.loading || Boolean(pantry.error)} onPress={() => { setNotice(''); setAdding(true); }} />}
        <Button label={t('demoPantry.cook')} variant="secondary" onPress={() => navigate('/kitchen?screen=recipe&dish=tomato')} />
        <Button label={t('nav.meals')} variant="secondary" onPress={() => navigate('/meals')} />
        <Button label={t('demoPantry.reset')} variant="ghost" disabled={adding || pantry.loading} onPress={() => setConfirmReset(true)} />
      </Stack>
      {adding && <IngredientEntry onAdd={add} onCancel={() => setAdding(false)} />}
      {Boolean(notice) && <Text live tone="success">{notice}</Text>}
      {Boolean(actionError) && <Text live tone="danger">{actionError}</Text>}
    </Stack>}>
    <Text tone="secondary">{t('pantry.total', { count: pantry.items.length })}</Text>
    {groups.map(group => <section key={group.location} aria-label={t(`pantry.locations.${group.location === 'fridge' ? 'refrigerator' : group.location}`)}><Stack gap="sm"><SectionHeader title={t(`pantry.locations.${group.location === 'fridge' ? 'refrigerator' : group.location}`)} count={group.rows.length} />{group.rows.map(item => <PantryRow key={item.id} item={item} />)}</Stack></section>)}
  </ListTemplate><Dialog open={confirmReset} title={t('demoPantry.reset')} description={t('demoPantry.resetConfirm')} confirmLabel={t('demoPantry.reset')} onCancel={() => setConfirmReset(false)} onConfirm={reset} /></AppShell>;
}

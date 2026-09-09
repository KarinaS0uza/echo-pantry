import { PantryList } from '@/components/OwnedPantry';
import { useRef, useState, useSyncExternalStore } from 'react';
import { useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { AppShell, Button, Input, Select, Stack, Text, Surface, ListTemplate, ErrorState, EmptyState, SectionHeader, Sheet, Dialog, UndoToast } from '@/components';
import { ApiError, getReachability, subscribeReachability, request } from '@/api/client';
import { owned, pantryName, type OwnedItem } from '@/api/owned';
import { useSession } from '@/api/session';
import { useDraft } from '@/drafts/useDraft';
import { useDraftGuard } from '@/drafts/NavigationGuard';
import { DraftRestoredBar } from '@/drafts/DraftRestoredBar';
import { useT } from '@/i18n';

const units = ['g', 'kg', 'oz', 'lb', 'ml', 'L', 'fl oz', 'cup', 'tbsp', 'tsp', 'item'];
function ItemForm({ item, onClose }: { item?: OwnedItem; onClose: () => void }) {
  const t = useT(); const account = useSession(); const cache = useQueryClient();
  const initial = { food: item?.food?.id || item?.customFood?.id || '', quantity: item?.quantity || '', unit: item?.unit || 'g', storageLocation: item?.storageLocation || 'pantry', date: item?.date || '', name: '' };
  const draft = useDraft('owned-pantry', initial, ['food', 'quantity', 'unit', 'storageLocation', 'date', 'name'], `${account!.id}-${item?.id || 'new'}`);
  const [pending, setPending] = useState(false); const lock = useRef(false);
  const writeAttempt = useRef<{ key: string; body: string }>(); const customAttempt = useRef<{ key: string; body: string }>();
  const [errors, setErrors] = useState<Record<string, string>>({}); const [failed, setFailed] = useState(false);
  const foods = useQuery({ queryKey: ['owned-foods', account!.id], queryFn: owned.foods });
  useDraftGuard(draft.dirty || pending, draft.discard);
  const change = (field: keyof typeof initial, value: string) => { draft.setValues(current => ({ ...current, [field]: value })); setErrors(current => ({ ...current, [field]: '' })); };
  async function save() {
    if (lock.current) return; lock.current = true; setPending(true); setFailed(false); setErrors({});
    try {
      let food = draft.values.food;
      if (!food && draft.values.name.trim()) {
        const customBody = { name: draft.values.name, category: 'pantry', form: 'na' };
        const serialized = JSON.stringify(customBody); if (customAttempt.current?.body !== serialized) customAttempt.current = { key: crypto.randomUUID(), body: serialized };
        const created = await request<{ id: string }>('/foods', { method: 'POST', body: customBody, idempotencyKey: customAttempt.current.key });
        food = created.id; change('food', food); await cache.invalidateQueries({ queryKey: ['owned-foods'] });
      }
      const values = draft.values;
      const body = { food: food.startsWith('custom:') ? null : food, customFood: food.startsWith('custom:') ? food : null, quantity: values.quantity, unit: values.unit, storageLocation: values.storageLocation, date: values.date || null, dateKind: values.date ? 'user' : 'unknown' };
      const serialized = JSON.stringify(body); if (writeAttempt.current?.body !== serialized) writeAttempt.current = { key: crypto.randomUUID(), body: serialized };
      await request(`/pantry-items${item ? '/' + item.id : ''}`, { method: item ? 'PATCH' : 'POST', body, idempotencyKey: writeAttempt.current.key });
      draft.clear(); await cache.invalidateQueries({ queryKey: ['owned'] }); onClose();
    } catch (error) { setFailed(true); if (error instanceof ApiError) setErrors(Object.fromEntries(Object.entries(error.fieldErrors).map(([key, value]) => [key, value.join(' ')]))); }
    finally { lock.current = false; setPending(false); }
  }
  return <Stack>{draft.restored && <DraftRestoredBar onDiscard={draft.discard} />}{draft.saveFailed && <Text live tone="danger">{t('draft.saveFailed')}</Text>}<form onSubmit={event => { event.preventDefault(); void save(); }}><Stack>
    <Select disabled={pending} label={t('owned.food')} value={draft.values.food} onChange={value => change('food', value)} options={[{ value: '', label: t('owned.chooseFood') }, ...(foods.data?.results || []).map(food => ({ value: food.id, label: food.name }))]} error={errors.food || errors.customFood} />
    {!draft.values.food && <Input disabled={pending} label={t('owned.customName')} value={draft.values.name} onChange={value => change('name', value)} error={errors.name} />}
    <Input disabled={pending} label={t('owned.quantity')} value={draft.values.quantity} onChange={value => change('quantity', value)} inputMode="decimal" error={errors.quantity} />
    <Select disabled={pending} label={t('owned.unit')} value={draft.values.unit} onChange={value => change('unit', value)} options={units.map(value => ({ value, label: value }))} error={errors.unit} />
    <Select disabled={pending} label={t('owned.storage')} value={draft.values.storageLocation} onChange={value => change('storageLocation', value)} options={['pantry', 'refrigerator', 'freezer', 'counter'].map(value => ({ value, label: t(`pantry.locations.${value}`) }))} error={errors.storageLocation} />
    <Input disabled={pending} label={t('owned.date')} type="date" value={draft.values.date} onChange={value => change('date', value)} error={errors.date} />
    <Button type="submit" label={t(failed ? 'common.retry' : 'owned.save')} loading={pending} />{failed && <Text live tone="danger">{t('owned.saveFailed')}</Text>}
    <Button label={t('common.cancel')} variant="secondary" disabled={pending} onPress={() => { draft.flush(); onClose(); }} />
  </Stack></form></Stack>;
}
export function OwnedPantry() {
  const reachable = useSyncExternalStore(subscribeReachability, getReachability);
  const t = useT(); const account = useSession(); const cache = useQueryClient(); const [params, setParams] = useSearchParams();
  const key = ['owned', 'pantry', account!.id];
  const pantry = useQuery({ queryKey: key, queryFn: owned.pantry });
  const [editing, setEditing] = useState<OwnedItem | 'new'>(); const [remove, setRemove] = useState<OwnedItem>();
  const [search, setSearch] = useState(''); const [historyOpen, setHistoryOpen] = useState(false);
  const [error, setError] = useState(''); const [undo, setUndo] = useState<{ item: number; history: number }>();
  const [pending, setPending] = useState(false); const lock = useRef(false);
  const stockKeys = useRef(new Map<string, string>());
  const history = useInfiniteQuery({ queryKey: ['owned', 'history', account!.id], initialPageParam: undefined as string | undefined, queryFn: ({ pageParam }) => owned.history(pageParam), getNextPageParam: page => page.next || undefined, enabled: historyOpen });
  async function action(item: OwnedItem, kind: 'mark-used' | 'mark-discarded') {
    if (lock.current) return; lock.current = true; setPending(true); setError('');
    await cache.cancelQueries({ queryKey: key }); const previous = cache.getQueryData(key);
    cache.setQueryData(key, { items: pantry.data!.items.map(row => row.id === item.id ? { ...row, quantity: '0' } : row) });
    const operation = `${item.id}/${kind}`; if (!stockKeys.current.has(operation)) stockKeys.current.set(operation, crypto.randomUUID());
    try { const response = await request<{ historyEntry: { id: number } }>(`/pantry-items/${item.id}/${kind}`, { method: 'POST', body: {}, idempotencyKey: stockKeys.current.get(operation) }); stockKeys.current.delete(operation); setUndo({ item: item.id, history: response.historyEntry.id }); }
    catch { cache.setQueryData(key, previous); setError(t('owned.uncertain')); }
    finally { lock.current = false; setPending(false); await cache.invalidateQueries({ queryKey: ['owned'] }); }
  }
  async function undoAction() { if (!undo) return; try { await request(`/pantry-items/${undo.item}/undo`, { method: 'POST', body: { historyEntry: undo.history } }); setUndo(undefined); await cache.invalidateQueries({ queryKey: ['owned'] }); } catch { setError(t('owned.undoFailed')); } }
  const items = (pantry.data?.items || []).filter(item => Number(item.quantity) > 0 && pantryName(item).toLowerCase().includes(search.toLowerCase()));
  return <AppShell guest={false} onAdd={() => setEditing('new')} toast={undo ? [<UndoToast key={undo.history} message={t('owned.recorded')} onUndo={() => { void undoAction(); }} onCommit={() => setUndo(undefined)} />] : []}><ListTemplate title={t('nav.pantry')} filters={<Stack>
    {params.has('welcome') && <Surface><Text>{t('owned.welcome')}</Text><Button label={t('owned.dismiss')} variant="ghost" onPress={() => setParams({})} /></Surface>}
    <Input label={t('owned.find')} value={search} onChange={setSearch} />
    <Button label={t('owned.history')} variant="secondary" onPress={() => setHistoryOpen(value => !value)} />
    {Boolean(error) && <Text live tone="danger">{error}</Text>}{reachable === false && <Text>{t('owned.notLive')}</Text>}
  </Stack>} state={pantry.isPending ? 'loading' : pantry.isError && !pantry.data ? 'error' : items.length ? 'ready' : 'empty'} error={<ErrorState title={t('pantry.errorTitle')} description={t('pantry.errorBody')} onRetry={() => { void pantry.refetch(); }} />} empty={<EmptyState title={t('pantry.emptyTitle')} description={t('owned.empty')} />}>
    <PantryList items={items} disabled={pending || reachable === false} onUsed={item => { void action(item, 'mark-used'); }} onDiscarded={item => { void action(item, 'mark-discarded'); }} onEdit={setEditing} onRemove={setRemove} />
  </ListTemplate>
  {historyOpen && <Stack><SectionHeader title={t('owned.history')} />{history.isPending && <Text live>{t('common.loading')}</Text>}{history.data && history.data.pages.every(page => !page.results.length) && <Text>{t('owned.historyEmpty')}</Text>}{history.isError && <ErrorState title={t('pantry.errorTitle')} description={t('owned.saveFailed')} onRetry={() => { void history.refetch(); }} />}{history.data?.pages.flatMap(page => page.results).map(entry => <Surface key={entry.id}><Text>{entry.food.name}: {entry.quantity} {entry.unit}. {t(`owned.${entry.kind}History`)}</Text><Button label={t('owned.deleteHistory')} variant="destructive" onPress={async () => { try { await request(`/history/${entry.id}`, { method: 'DELETE' }); await history.refetch(); } catch { setError(t('owned.saveFailed')); } }} /></Surface>)}{history.hasNextPage && <Button label={t('owned.loadMore')} loading={history.isFetchingNextPage} onPress={() => { void history.fetchNextPage(); }} />}</Stack>}
  <Sheet open={editing !== undefined} title={t(editing === 'new' ? 'owned.add' : 'owned.edit')} onClose={() => setEditing(undefined)}>{editing && <ItemForm key={editing === 'new' ? 'new' : editing.id} item={editing === 'new' ? undefined : editing} onClose={() => setEditing(undefined)} />}</Sheet>
  <Dialog open={Boolean(remove)} title={t('owned.mistake')} description={t('owned.mistakeBody')} onCancel={() => setRemove(undefined)} onConfirm={async () => { if (!remove) return; try { await request(`/pantry-items/${remove.id}`, { method: 'DELETE' }); setRemove(undefined); await cache.invalidateQueries({ queryKey: ['owned'] }); } catch { setError(t('owned.saveFailed')); } }} />
  </AppShell>;
}

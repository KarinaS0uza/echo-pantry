import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Select, Stack, Text, Sheet, ErrorState, Surface } from '@/components';
import { ApiError, request } from '@/api/client';
import { owned, pantryName, type OwnedItem } from '@/api/owned';
import { useT } from '@/i18n';
import { useDraftGuard } from '@/drafts/NavigationGuard';
interface Allocation { pantryItem: number; amount: string; unit: string }
interface Line { food: string; name: string; required: { amount: string | null; unit: string | null }; proposedAllocation: Allocation[]; toTaste: boolean; optional: boolean }
interface Review { recipe: { id: string; title: string }; servings: number; lines: Line[] }
function ReviewForm({ review, onClose, onBusy }: { review: Review; onClose: () => void; onBusy: (value: boolean) => void }) {
  const t = useT(); const cache = useQueryClient();
  const pantry = useQuery({ queryKey: ['owned', 'review-stock'], queryFn: owned.pantry });
  const [lines, setLines] = useState(review.lines.map(line => ({ food: line.food, deductions: line.proposedAllocation.map(({ pantryItem, amount, unit }) => ({ pantryItem, amount, unit })), mode: line.proposedAllocation.length ? 'pantry' : '', replaced: '' })));
  const [pending, setPending] = useState(false); const [error, setError] = useState(''); const lock = useRef(false);
  const attempt = useRef<{ body: unknown; key: string }>();
  const [uncertain, setUncertain] = useState(false);
  useDraftGuard(true, () => {});
  const change = (index: number, update: Partial<typeof lines[number]>) => setLines(current => current.map((line, position) => index === position ? { ...line, ...update } : line));
  async function approve() {
    if (lock.current) return;
    if (lines.some(line => !line.mode || (line.mode === 'pantry' && !line.deductions.length))) { setError(t('owned.reviewEvery')); return; }
    lock.current = true; setPending(true); onBusy(true); setError('');
    attempt.current ??= { key: crypto.randomUUID(), body: { recipe: review.recipe.id, servings: review.servings, cookedAt: new Date().toISOString(), lines: lines.map(line => ({ food: line.food, deductions: line.mode === 'pantry' ? line.deductions : [], omitted: line.mode === 'omit', sourcedOutsidePantry: line.mode === 'outside', noDeduction: line.mode === 'none', replaced: line.replaced || null })) } };
    await cache.cancelQueries({ queryKey: ['owned', 'pantry'] });
    const previous = cache.getQueriesData({ queryKey: ['owned', 'pantry'] });
    for (const [key, value] of previous) {
      const stock = value as { items: OwnedItem[] } | undefined;
      if (stock) cache.setQueryData(key, { items: stock.items.map(item => {
        const amount = lines.filter(line => line.mode === 'pantry').flatMap(line => line.deductions).filter(line => line.pantryItem === item.id).reduce((sum, line) => sum + Number(line.amount), 0);
        return { ...item, quantity: Math.max(0, Number(item.quantity) - amount).toFixed(6) };
      }) });
    }
    try {
      await request('/cooking-logs', { method: 'POST', body: attempt.current.body, idempotencyKey: attempt.current.key });
      await cache.invalidateQueries({ queryKey: ['owned'] }); onClose();
    } catch (reason) {
      for (const [key, value] of previous) cache.setQueryData(key, value);
      const ambiguous = !(reason instanceof ApiError) || reason.status === 0 || reason.status >= 500;
      setUncertain(ambiguous);
      if (!ambiguous) { attempt.current = undefined; onBusy(false); }
      setError(reason instanceof ApiError && Object.keys(reason.fieldErrors).length ? Object.values(reason.fieldErrors).flat().join(' ') : t('owned.saveFailed'));
    } finally { lock.current = false; setPending(false); }
  }
  return <Stack><Text>{t('owned.reviewBody')}</Text>{review.lines.map((original, index) => { const line = lines[index]; const food = line.replaced || line.food; const candidates = (pantry.data?.items || []).filter(item => Number(item.quantity) > 0 && (item.food || item.customFood)!.id === food); return <Surface key={`${line.food}-${index}`}><Stack><Text heading variant="h3">{original.name}</Text><Text>{original.required.amount || t('detail.toTaste')} {original.required.unit}</Text>
    <Select label={t('owned.useChoice')} disabled={pending || uncertain} value={line.mode} onChange={mode => change(index, { mode })} options={[{ value: '', label: t('owned.choose') }, { value: 'pantry', label: t('owned.fromPantry') }, { value: 'omit', label: t('owned.omit') }, { value: 'outside', label: t('owned.outside') }, { value: 'none', label: t('owned.noDeduction') }]} />
    {line.mode === 'pantry' && <><Select label={t('owned.replace')} disabled={pending || uncertain} value={line.replaced} onChange={replaced => change(index, { replaced, deductions: [] })} options={[{ value: '', label: t('owned.original') }, ...Array.from(new Map((pantry.data?.items || []).map(item => [(item.food || item.customFood)!.id, { value: (item.food || item.customFood)!.id, label: pantryName(item) }])).values())]} />
    {line.deductions.map((deduction, allocationIndex) => <Stack key={allocationIndex}><Select label={t('owned.purchase')} disabled={pending || uncertain} value={String(deduction.pantryItem)} onChange={value => { const item = candidates.find(row => row.id === Number(value)); if (item) change(index, { deductions: line.deductions.map((row, position) => position === allocationIndex ? { ...row, pantryItem: item.id, unit: item.unit } : row) }); }} options={candidates.map(item => ({ value: String(item.id), label: `${pantryName(item)}: ${item.quantity} ${item.unit}, ${item.date || t('owned.unknownDate')} (#${item.id})` }))} /><Input label={t('owned.actualAmount')} disabled={pending || uncertain} inputMode="decimal" value={deduction.amount} onChange={amount => change(index, { deductions: line.deductions.map((row, position) => position === allocationIndex ? { ...row, amount } : row) })} /><Button label={t('owned.removeAllocation')} disabled={pending || uncertain} variant="ghost" onPress={() => change(index, { deductions: line.deductions.filter((_, position) => position !== allocationIndex) })} /></Stack>)}
    <Button label={t('owned.addAllocation')} disabled={pending || uncertain || !candidates.length} variant="secondary" onPress={() => { const item = candidates[0]; change(index, { deductions: [...line.deductions, { pantryItem: item.id, amount: '', unit: item.unit }] }); }} /></>}
  </Stack></Surface>; })}{Boolean(error) && <Text live tone="danger">{error}</Text>}{uncertain && <Text>{t('owned.replay')}</Text>}<Button label={t(error ? 'common.retry' : 'owned.approve')} loading={pending} onPress={() => { void approve(); }} /><Button label={t('common.cancel')} variant="secondary" disabled={pending || uncertain} onPress={onClose} /></Stack>;
}
export function CookingReview({ recipe, servings, onClose }: { recipe: string; servings: number; onClose: () => void }) {
  const t = useT(); const [busy, setBusy] = useState(false); const review = useQuery({ queryKey: ['owned', 'cooking-review', recipe, servings], queryFn: () => request<Review>(`/cooking-review?recipe=${encodeURIComponent(recipe)}&servings=${servings}`) });
  return <Sheet open title={t('owned.reviewTitle')} onClose={() => { if (!busy) onClose(); }}>{review.data ? <ReviewForm review={review.data} onClose={onClose} onBusy={setBusy} /> : review.isError ? <ErrorState title={t('owned.reviewTitle')} description={t('owned.saveFailed')} onRetry={() => { void review.refetch(); }} /> : <Text>{t('common.loading')}</Text>}</Sheet>;
}

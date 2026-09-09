import type { OwnedItem } from '@/api/owned';
import { pantryName } from '@/api/owned';
import { useT } from '@/i18n';
import { useTheme } from '@/design/theme';
import { Stack } from './Stack';
import { Text } from './Text';
import { Surface } from './Surface';
import { Button } from './Button';
import { CategoryIcon } from './Image';
import { SectionHeader } from './Molecules';
import { UrgencyBadge, type UrgencyTier } from './Discovery';
export function PantryItemCard({ item, disabled, onUsed, onDiscarded, onEdit, onRemove }: { item: OwnedItem; disabled?: boolean; onUsed: () => void; onDiscarded: () => void; onEdit: () => void; onRemove: () => void }) {
  const t = useT();
  return <Surface><Stack><Stack direction="row" align="center"><CategoryIcon category={(item.food || item.customFood)!.category} /><Text heading variant="h3">{pantryName(item)}</Text></Stack><Text>{Number(item.quantity).toLocaleString(undefined, { maximumFractionDigits: 6 })} {item.unit}</Text><UrgencyBadge tier={item.urgency.tier as UrgencyTier} label={item.date ? t(`pantry.tiers.${item.urgency.tier}`) : t('owned.unknownDate')} /><Text>{item.date}</Text><details><summary>{t('owned.itemActions', { name: pantryName(item) })}</summary><Stack><Stack direction="row" wrap><Button label={t('owned.used')} disabled={disabled} onPress={onUsed} /><Button label={t('owned.edit')} variant="secondary" disabled={disabled} onPress={onEdit} /></Stack><Button label={t('owned.discarded')} variant="destructive" disabled={disabled} onPress={onDiscarded} /><Button label={t('owned.mistake')} variant="ghost" disabled={disabled} onPress={onRemove} /></Stack></details></Stack></Surface>;
}
export function PantryList({ items, disabled, onUsed, onDiscarded, onEdit, onRemove }: { items: OwnedItem[]; disabled?: boolean; onUsed: (item: OwnedItem) => void; onDiscarded: (item: OwnedItem) => void; onEdit: (item: OwnedItem) => void; onRemove: (item: OwnedItem) => void }) {
  const t = useT(); const { t: tokens, color } = useTheme();
  const categories = [...new Set(items.map(item => (item.food || item.customFood)!.category))].sort();
  return <Stack>{categories.map(category => <section key={category} aria-label={t(`owned.categories.${category}`, { defaultValue: category })}><Stack><div style={{ position: 'sticky', top: tokens.size.touchMin, background: color.bg.canvas, zIndex: tokens.zIndex.sticky }}><SectionHeader title={t(`owned.categories.${category}`, { defaultValue: category })} /></div>{items.filter(item => (item.food || item.customFood)!.category === category).sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999') || a.id - b.id).map(item => <PantryItemCard key={item.id} item={item} disabled={disabled} onUsed={() => onUsed(item)} onDiscarded={() => onDiscarded(item)} onEdit={() => onEdit(item)} onRemove={() => onRemove(item)} />)}</Stack></section>)}</Stack>;
}

import { useId, useState, type ReactNode } from 'react';
import type { Meal, MealExplanation } from '@/api/endpoints';
import { useTheme } from '@/design/theme';
import { Button, IconButton } from './Button';
import { CategoryIcon, Image } from './Image';
import { SegmentedControl } from './Molecules';
import { Stack } from './Stack';
import { Spinner, StepMarker } from './Status';
import { Surface } from './Surface';
import { DetailTemplate } from './Templates';
import { Text, type Tone } from './Text';

export type UrgencyTier = MealExplanation['urgencyTier'];
const urgencyTone: Record<UrgencyTier, Tone> = {
  review: 'secondary', use_today: 'critical', use_soon: 'urgent',
  coming_up: 'soon', neutral: 'secondary', unknown: 'secondary',
};

/** Labels are supplied by the locale layer. Dates are reminders, never safety claims. */
export function UrgencyBadge({ tier, label, estimated = false, onEdit, editLabel }: {
  tier: UrgencyTier; label: string; estimated?: boolean; onEdit?: () => void; editLabel?: string;
}) {
  return <Stack direction="row" align="center" gap="2xs">
    <Text tone={estimated ? 'tertiary' : urgencyTone[tier]} strike={tier === 'review'}>{label}</Text>
    {estimated && onEdit && editLabel && <IconButton name="Pencil" label={editLabel} onPress={onEdit} />}
  </Stack>;
}

export function HeroHeading({ title, description, action, decoration }: {
  title: string; description?: string; action?: ReactNode; decoration?: ReactNode;
}) {
  return <Stack gap="md"><Stack direction="row" align="flex-start" justify="space-between" wrap>
    <Text heading variant="display">{title}</Text>{action}
  </Stack>{description && <Text variant="bodyLg" tone="secondary">{description}</Text>}
  {decoration && <div aria-hidden="true" ref={element => { element?.setAttribute('inert', ''); }}>{decoration}</div>}</Stack>;
}

export function RecipeCard({ meal, timeLabel, expiringLabel, matchLabel, sideLabel, onPress, bookmark, explanation, imageSrc, disabled = false, loading = false }: {
  meal: Meal; timeLabel: string; expiringLabel: string; matchLabel: string; sideLabel: string; onPress: () => void;
  bookmark?: { label: string; selected: boolean; onPress: () => void };
  explanation?: ReactNode; imageSrc?: string; disabled?: boolean; loading?: boolean;
}) {
  const { t, color } = useTheme();
  const id = useId();
  return <article aria-labelledby={`${id}-title`}><Surface padding="sm"><Stack gap="sm">
    <button type="button" data-control="button" aria-labelledby={`${id}-title`} aria-describedby={`${id}-match ${id}-expiry`} onClick={onPress} disabled={disabled || loading} aria-busy={loading || undefined} style={{ textAlign: 'left', width: t.layout.full, minHeight: t.size.touchMin, padding: t.space.sm, border: 'none', borderRadius: t.radius.lg, background: color.bg.surface, cursor: 'pointer' }}>
      <Stack gap="sm">{imageSrc ? <Image src={imageSrc} alt="" decorative /> : <CategoryIcon />}
        <Text id={`${id}-title`} variant="h3" heading tone={disabled ? 'disabled' : 'primary'}>{meal.recipe.title}</Text>
        <Text tone={disabled ? 'disabled' : 'secondary'}>{timeLabel}</Text>{meal.recipe.isSide && <Text tone={disabled ? 'disabled' : 'primary'}>{sideLabel}</Text>}{loading && <Spinner />}
        <Text id={`${id}-match`} tone={disabled ? 'disabled' : 'primary'}>{matchLabel}</Text>
        <Text id={`${id}-expiry`} tone={disabled ? 'disabled' : urgencyTone[meal.explanation.urgencyTier]}>{expiringLabel}</Text>
      </Stack>
    </button>
    {bookmark && <IconButton name="Bookmark" label={bookmark.label} selected={bookmark.selected} onPress={bookmark.onPress} disabled={disabled || loading} />}
    {explanation}
  </Stack></Surface></article>;
}

export function IdeaTile({ title, subtitle, onPress, imageSrc, imageAlt = '', disabled = false, loading = false }: {
  title: string; subtitle: string; onPress: () => void; imageSrc?: string; imageAlt?: string; disabled?: boolean; loading?: boolean;
}) {
  const { t, color } = useTheme();
  return <button type="button" data-control="button" onClick={onPress} disabled={disabled || loading} aria-busy={loading || undefined} style={{ textAlign: 'left', minWidth: t.space.none, width: t.layout.full, minHeight: t.size.touchMin, padding: t.space.sm, border: 'none', borderRadius: t.radius.lg, background: color.bg.surface, cursor: 'pointer' }}>
    <Stack gap="sm"><Image src={imageSrc} alt={imageAlt} decorative={!imageAlt} aspect="tile" /><Text variant="h3" tone={disabled ? 'disabled' : 'primary'}>{title}</Text><Text tone={disabled ? 'disabled' : 'secondary'}>{subtitle}</Text>{loading && <Spinner />}</Stack>
  </button>;
}

/** Only original, user-provided, or licensed instructions belong in this component. */
export function MethodStep({ index, children }: { index: number; children: string }) {
  return <Stack direction="row" gap="sm" align="flex-start"><StepMarker index={index} /><Stack variant="grow"><Text>{children}</Text></Stack></Stack>;
}

export function RecipeDetail({ title, imageAlt, imageSrc, metadata, ingredients, method, ingredientsLabel, methodLabel, panelsLabel, action, onBack, backLabel }: {
  title: string; imageAlt: string; imageSrc?: string; metadata: string; ingredients: ReactNode; method: ReactNode;
  ingredientsLabel: string; methodLabel: string; panelsLabel?: string; action?: ReactNode; onBack: () => void; backLabel: string;
}) {
  const [panel, setPanel] = useState('method');
  return <Stack gap="sm"><Button label={backLabel} iconLeft="ArrowLeft" variant="ghost" onPress={onBack} />
    <DetailTemplate title={title} imageSrc={imageSrc} imageAlt={imageAlt} action={action}>
      <Text tone="secondary">{metadata}</Text>
      <SegmentedControl label={panelsLabel || title} options={[{ id: 'ingredients', label: ingredientsLabel }, { id: 'method', label: methodLabel }]} value={panel} onChange={setPanel} />
      <div role="tabpanel" aria-label={panel === 'ingredients' ? ingredientsLabel : methodLabel} tabIndex={0}>
        {panel === 'ingredients' ? ingredients : method}
      </div>
    </DetailTemplate>
  </Stack>;
}

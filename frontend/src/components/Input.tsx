import { useId, type InputHTMLAttributes } from 'react';
import { useTheme } from '@/design/theme';
import { useT } from '@/i18n';
import { Stack } from './Stack';
import { Text } from './Text';
import { Icon } from './Icon';
import { IconButton } from './Button';

type FieldProps = { label: string; helper?: string; error?: string; id?: string; disabled?: boolean; loading?: boolean };
export type InputProps = FieldProps & { value: string; onChange: (value: string) => void; type?: 'text' | 'number' | 'email' | 'password' | 'search' | 'date'; clearable?: boolean; required?: boolean; autoComplete?: string; placeholder?: string; onBlur?: () => void; inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode'] };
export function Input({ label, helper, error, value, onChange, type = 'text', clearable, id: suppliedId, disabled, loading, required, autoComplete, placeholder, onBlur, inputMode }: InputProps) {
  const generated = useId();
  const id = suppliedId ?? generated;
  const translate = useT();
  const { t } = useTheme();
  return <Stack gap="2xs">
    <label htmlFor={id}><Text variant="label">{label}</Text></label>
    <Stack direction="row" align="center" gap="2xs">
      <input id={id} data-control="input" data-field="" data-filled={Boolean(value)} type={type} value={value} onChange={event => onChange(event.target.value)} onBlur={onBlur} disabled={disabled} readOnly={loading} aria-busy={loading || undefined} required={required} aria-invalid={Boolean(error)} aria-describedby={error || helper ? `${id}-help` : undefined} autoComplete={autoComplete} placeholder={placeholder} inputMode={inputMode} style={{ flex: 1, fontSize: t.type.body.size }} />
      {loading && <Icon name="LoaderCircle" label={translate('common.loading')} />}
      {clearable && Boolean(value) && <IconButton name="X" label={translate('common.clear', { label })} onPress={() => onChange('')} disabled={disabled || loading} />}
    </Stack>
    {(error || helper) && <Stack direction="row" gap="2xs" align="flex-start">{error && <Icon name="AlertCircle" size="sm" tone="danger" />}<Text id={`${id}-help`} tone={error ? 'danger' : 'secondary'} live={Boolean(error)}>{error || helper}</Text></Stack>}
  </Stack>;
}

export function Select({ label, helper, error, id: suppliedId, disabled, loading, value, onChange, options }: FieldProps & { value: string; onChange: (value: string) => void; options: { value: string; label: string; lang?: string }[] }) {
  const generated = useId();
  const id = suppliedId ?? generated;
  const translate = useT();
  return <Stack gap="2xs"><label htmlFor={id}><Text variant="label">{label}</Text></label>
    <Stack direction="row" align="center" gap="2xs"><select id={id} data-control="select" data-field="" data-filled={Boolean(value)} value={value} disabled={disabled || loading} aria-disabled={disabled || loading || undefined} aria-busy={loading || undefined} aria-invalid={Boolean(error)} aria-describedby={error || helper ? `${id}-help` : undefined} onChange={event => { if (!loading) onChange(event.target.value); }}>{options.map(option => <option key={option.value} value={option.value} lang={option.lang}>{option.label}</option>)}</select>{loading && <Icon name="LoaderCircle" label={translate('common.loading')} />}</Stack>
    {(helper || error) && <Stack direction="row" gap="2xs">{error && <Icon name="AlertCircle" size="sm" tone="danger" />}<Text id={`${id}-help`} live tone={error ? 'danger' : 'secondary'}>{error || helper}</Text></Stack>}
  </Stack>;
}

export function Checkbox({ label, checked, onChange, disabled, loading, name, variant = 'checkbox' }: { label: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean; loading?: boolean; name?: string; variant?: 'checkbox' | 'radio' | 'switch' }) {
  const { color, t } = useTheme();
  return <label data-choice-label="" style={{ display: 'flex', alignItems: 'center', gap: t.space['2xs'], minHeight: t.size.touchMin, minWidth: t.size.touchMin, borderRadius: t.radius.sm, cursor: disabled ? 'not-allowed' : loading ? 'progress' : 'pointer' }}>
    <input data-control="choice" type={variant === 'radio' ? 'radio' : 'checkbox'} role={variant === 'switch' ? 'switch' : undefined} name={name} checked={checked} onChange={event => onChange(event.target.checked)} disabled={disabled || loading} aria-busy={loading || undefined} style={{ accentColor: color.action.primary, width: t.size.icon.md, height: t.size.icon.md, margin: t.space.none, flexShrink: 0 }} />
    <Text tone={disabled ? 'disabled' : 'primary'}>{label}</Text>{loading && <Icon name="LoaderCircle" size="sm" />}
  </label>;
}
export const Radio = (props: Omit<Parameters<typeof Checkbox>[0], 'variant'>) => <Checkbox {...props} variant="radio" />;
export const Switch = (props: Omit<Parameters<typeof Checkbox>[0], 'variant'>) => <Checkbox {...props} variant="switch" />;

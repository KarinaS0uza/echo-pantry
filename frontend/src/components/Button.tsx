import { forwardRef, useRef, useState, type ReactNode } from 'react';
import { useTheme } from '@/design/theme';
import { useT } from '@/i18n';
import { Text } from './Text';
import { Icon, type IconName } from './Icon';

export type ButtonProps = { label: string; onPress?: () => void | Promise<unknown>; variant?: 'primary' | 'secondary' | 'ghost' | 'destructive'; size?: 'sm' | 'md' | 'lg' | 'fab'; iconLeft?: IconName; iconRight?: IconName; fullWidth?: boolean; disabled?: boolean; loading?: boolean; selected?: boolean; iconOnly?: boolean; glass?: boolean; type?: 'button' | 'submit'; id?: string; role?: string; tabIndex?: number; controls?: string; expanded?: boolean; onKeyDown?: React.KeyboardEventHandler<HTMLButtonElement>; onPointerDown?: React.PointerEventHandler<HTMLButtonElement>; onPointerUp?: React.PointerEventHandler<HTMLButtonElement>; onPointerLeave?: React.PointerEventHandler<HTMLButtonElement>; onPointerCancel?: React.PointerEventHandler<HTMLButtonElement>; children?: ReactNode };
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ label, onPress, variant = 'primary', size = 'md', iconLeft, iconRight, fullWidth, disabled, loading, selected, iconOnly, glass, type = 'button', id, role, tabIndex, controls, expanded, onKeyDown, onPointerDown, onPointerUp, onPointerLeave, onPointerCancel, children }, ref) {
  const { color, t, scheme } = useTheme();
  const translate = useT();
  const guard = useRef(false);
  const [pending, setPending] = useState(false);
  const busy = Boolean(loading || pending);
  const tone = disabled ? 'disabled' : variant === 'primary' ? 'onPrimary' : variant === 'destructive' ? 'danger' : selected ? 'accent' : 'primary';
  async function activate() {
    if (disabled || busy || guard.current) return;
    guard.current = true;
    try {
      const result = onPress?.();
      if (result && typeof result.then === 'function') { setPending(true); await result; }
    } finally { guard.current = false; setPending(false); }
  }
  return <button ref={ref} id={id} type={type} role={role} tabIndex={tabIndex} data-control="button" data-variant={variant} data-glass={glass || undefined} data-auto-full={!iconOnly && variant === 'primary' && fullWidth === undefined} aria-label={label} aria-busy={busy || undefined} aria-pressed={role === 'tab' ? undefined : selected} aria-selected={role === 'tab' ? selected : undefined} aria-controls={controls} aria-expanded={expanded} disabled={disabled || busy} onClick={activate} onKeyDown={onKeyDown} onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerLeave={onPointerLeave} onPointerCancel={onPointerCancel} style={{ position: 'relative', zIndex: role === 'tab' ? t.zIndex.raised : undefined, display: 'inline-flex', minHeight: `max(${t.size.touchMin}, ${(size === 'fab' ? t.size.fab : t.size.control[size])})`, minWidth: iconOnly ? t.size.touchMin : undefined, width: fullWidth ? t.layout.full : undefined, padding: iconOnly ? t.space['2xs'] : `${t.space['2xs']} ${t.space.md}`, gap: t.space['2xs'], alignItems: 'center', justifyContent: 'center', alignSelf: fullWidth ? 'stretch' : 'flex-start', borderRadius: t.radius.pill, border: `${t.size.hairline} solid ${glass ? color.bg.glassBorder : variant === 'secondary' || variant === 'destructive' ? color.border.strong : 'transparent'}`, background: role === 'tab' ? 'transparent' : glass ? color.bg.glass : variant === 'primary' ? color.action.primary : selected ? color.action.secondaryFill : color.bg.surface, backdropFilter: glass ? `blur(${t.blur.md})` : undefined, boxShadow: (glass || size === 'fab') && scheme === 'light' ? t.elevation.floating : undefined, cursor: disabled ? 'not-allowed' : 'pointer' }}>
    {role !== 'tab' && (variant !== 'ghost' || busy || iconLeft || iconOnly) && <span aria-hidden={!busy} style={{ display: 'inline-flex', width: t.size.icon[iconOnly ? 'md' : 'sm'], flexShrink: 0, justifyContent: 'center' }}>{busy ? <Icon name="LoaderCircle" size={iconOnly ? 'md' : 'sm'} tone={tone} label={translate('common.loading')} /> : iconLeft ? <Icon name={iconLeft} size={iconOnly ? 'md' : 'sm'} tone={tone} /> : null}</span>}
    {!iconOnly && <Text variant="button" tone={tone}>{label}</Text>}
    {iconRight && <Icon name={iconRight} size="sm" tone={tone} />}{children}
  </button>;
});
export const IconButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'iconOnly'> & { name: IconName }>(function IconButton({ name, ...props }, ref) { return <Button {...props} ref={ref} iconLeft={name} iconOnly variant={props.variant ?? 'ghost'} />; });
export function GlassIconButton(props: Omit<ButtonProps, 'iconOnly'> & { name: IconName }) { return <IconButton {...props} glass />; }

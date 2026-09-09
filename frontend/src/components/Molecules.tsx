import { useEffect, useId, useRef, useState, type PropsWithChildren, type ReactNode, type RefObject } from 'react';
import { Modal, ModalBackdrop, ModalContent } from '@/design/modal';
import { useTheme, useTransition, MotionView, webStyle } from '@/design/theme';
import { useT } from '@/i18n';
import { Text } from './Text';
import { Stack } from './Stack';
import { Surface } from './Surface';
import { Button, IconButton } from './Button';
import { Input, type InputProps } from './Input';
import { Icon } from './Icon';
import { Image } from './Image';

export const FormField = (props: InputProps) => <Input {...props} />;
export function SearchField({ onSearch, ...props }: Omit<InputProps, 'type' | 'clearable'> & { onSearch: (value: string) => void }) {
  const { t } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const callback = useRef(onSearch);
  callback.current = onSearch;
  useEffect(() => { const timer = setTimeout(() => callback.current(props.value), t.timing.draftSaveDebounce); return () => clearTimeout(timer); }, [props.value, t]);
  return <Stack gap="2xs"><div data-search-trigger="" hidden={expanded || Boolean(props.value)}><IconButton name="Search" label={props.label} onPress={() => { setExpanded(true); requestAnimationFrame(() => document.getElementById(id)?.focus()); }} /></div><div data-search-field="" data-expanded={expanded || Boolean(props.value)}><Input {...props} id={id} type="search" clearable /></div></Stack>;
}
export function SectionHeader({ title, count, action }: { title: string; count?: number; action?: ReactNode }) {
  return <Stack direction="row" gap="sm" justify="space-between" align="center" wrap><Text heading variant="h2">{title}{count === undefined ? '' : ` (${count})`}</Text>{action}</Stack>;
}
export function ListItem({ title, subtitle, leading, trailing, onPress, disabled, loading }: { title: string; subtitle?: string; leading?: ReactNode; trailing?: ReactNode; onPress?: () => void; disabled?: boolean; loading?: boolean }) {
  const { t, color } = useTheme();
  const content = <Stack direction="row" align="center" gap="sm">{leading}<Stack variant="grow" gap="2xs"><Text>{title}</Text>{subtitle && <Text tone="secondary">{subtitle}</Text>}</Stack>{loading ? <Icon name="LoaderCircle" /> : trailing}</Stack>;
  return onPress ? <button data-control="button" disabled={disabled || loading} aria-busy={loading || undefined} onClick={onPress} style={{ textAlign: 'left', width: t.layout.full, minHeight: t.size.touchMin, padding: t.space.sm, border: 'none', borderRadius: t.radius.lg, background: color.bg.surface, cursor: 'pointer' }}>{content}</button> : <Surface padding="sm" elevation="none">{content}</Surface>;
}
export function EmptyState({ title, description, action, imageSrc }: { title: string; description: string; action?: ReactNode; imageSrc?: string }) {
  return <Surface elevation="none" padding="lg"><Stack gap="md">{imageSrc ? <Image src={imageSrc} alt="" decorative treatment="floating" /> : <Icon name="Leaf" size="lg" tone="secondary" />}<Text variant="h2" heading>{title}</Text><Text tone="secondary">{description}</Text>{action}</Stack></Surface>;
}
export function ErrorState({ title, description, onRetry }: { title: string; description: string; onRetry: () => void }) {
  const translate = useT();
  return <Surface><Stack><Icon name="AlertCircle" tone="danger" /><Text heading variant="h2">{title}</Text><Text>{description}</Text><Button label={translate('common.retry')} onPress={onRetry} variant="secondary" /></Stack></Surface>;
}

type TabOption = { id: string; label: string };
export function Tabs({ options, value, onChange, label, variant = 'tabs', disabled, loading }: { options: TabOption[]; value: string; onChange: (value: string) => void; label: string; variant?: 'tabs' | 'segmented'; disabled?: boolean; loading?: boolean }) {
  const groupId = useId();
  const { color, t } = useTheme();
  const transition = useTransition(t.motion.spring.subtle);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  return <div role="tablist" aria-label={label} style={{ display: 'flex', flexWrap: 'wrap', gap: t.space['2xs'], padding: variant === 'segmented' ? t.space['2xs'] : t.space.none, background: variant === 'segmented' ? color.bg.subtle : undefined, borderRadius: t.radius.pill }}>
    {options.map((option, index) => <div key={option.id} style={{ position: 'relative', flex: variant === 'segmented' ? 1 : undefined }}>{value === option.id && <MotionView aria-hidden layoutId={`${groupId}-indicator`} transition={transition} style={webStyle({ position: 'absolute', pointerEvents: 'none', inset: variant === 'segmented' ? t.space.none : undefined, bottom: t.space.none, left: t.space.none, right: t.space.none, height: variant === 'tabs' ? t.size.focusRing : undefined, background: variant === 'segmented' ? color.bg.surface : color.text.accent, borderRadius: t.radius.pill })} />}<Button ref={element => { refs.current[index] = element; }} id={`${groupId}-${option.id}`} role="tab" label={option.label} fullWidth={variant === 'segmented'} selected={value === option.id} tabIndex={value === option.id ? 0 : -1} disabled={disabled} loading={loading} variant="ghost" onPress={() => onChange(option.id)} onKeyDown={event => {
      if (disabled || loading) return;
      let next: number | undefined;
      if (event.key === 'ArrowRight') next = (index + 1) % options.length;
      if (event.key === 'ArrowLeft') next = (index - 1 + options.length) % options.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = options.length - 1;
      if (next !== undefined) { event.preventDefault(); onChange(options[next].id); refs.current[next]?.focus(); }
    }} /></div>)}
  </div>;
}
export const SegmentedControl = (props: Omit<Parameters<typeof Tabs>[0], 'variant'>) => <Tabs {...props} variant={props.options.length <= 3 ? 'segmented' : 'tabs'} />;

export function Sheet({ children, open, title, onClose, variant = 'sheet', initialFocusRef, finalFocusRef }: PropsWithChildren<{ open: boolean; title: string; onClose: () => void; variant?: 'sheet' | 'drawer' | 'dialog'; initialFocusRef?: RefObject<HTMLElement>; finalFocusRef?: RefObject<HTMLElement> }>) {
  const { color, t } = useTheme();
  const translate = useT();
  const titleId = useId();
  useEffect(() => { if (!open) finalFocusRef?.current?.focus(); }, [open, finalFocusRef]);
  // Remove the blocking overlay immediately. Gluestack's default exit timer is
  // longer than our motion budget; entry motion is token-driven in GlobalStyles.
  if (!open) return null;
  return <Modal isOpen={open} onClose={onClose} initialFocusRef={initialFocusRef} finalFocusRef={finalFocusRef} closeOnOverlayClick={variant !== 'dialog'} isKeyboardDismissable dataSet={{ 'sheet-root': variant === 'sheet' ? '' : undefined }} style={webStyle({ position: 'fixed', inset: t.space.none, width: t.layout.full, height: t.layout.full, alignItems: variant === 'drawer' ? 'flex-end' : 'center', justifyContent: variant === 'sheet' ? 'flex-end' : 'center', zIndex: variant === 'drawer' ? t.zIndex.drawer : t.zIndex.sheet })}>
    <ModalBackdrop style={webStyle({ position: 'absolute', inset: t.space.none, backgroundColor: color.bg.overlay, width: t.layout.full, height: t.layout.full })}>{null}</ModalBackdrop>
    <ModalContent aria-labelledby={titleId} dataSet={{ sheet: variant === 'sheet' ? '' : undefined, drawer: variant === 'drawer' ? '' : undefined }} style={webStyle({ width: t.layout.full, maxWidth: variant === 'drawer' ? t.layout.drawerWidth : variant === 'dialog' ? t.measure.max : undefined, height: variant === 'drawer' ? t.layout.full : undefined, maxHeight: t.layout.full, overflowY: 'auto', backgroundColor: color.bg.surface, padding: t.space.md, borderRadius: variant === 'drawer' ? t.radius.none : t.radius.xl })}>
      <Stack gap="lg"><Stack direction="row" align="center" justify="space-between" gap="sm"><Text heading variant="h2" id={titleId}>{title}</Text><IconButton name="X" label={translate('common.close')} onPress={onClose} /></Stack>{children}</Stack>
    </ModalContent>
  </Modal>;
}
export function Dialog({ open, title, description, onCancel, onConfirm, confirmLabel }: { open: boolean; title: string; description: string; onCancel: () => void; onConfirm: () => void | Promise<unknown>; confirmLabel?: string }) {
  const safeRef = useRef<HTMLButtonElement>(null);
  const translate = useT();
  return <Sheet open={open} title={title} onClose={onCancel} variant="dialog" initialFocusRef={safeRef}><Text>{description}</Text><Stack direction="row" wrap gap="md"><Button ref={safeRef} variant="secondary" label={translate('common.cancel')} onPress={onCancel} /><Button variant="destructive" label={confirmLabel || translate('common.delete')} onPress={onConfirm} /></Stack></Sheet>;
}

export function QuantityStepper({ label, value, onChange, min = 1, max = 12, disabled, loading, variant = 'default' }: { variant?: 'default' | 'inline'; label: string; value: number; onChange: (value: number) => void; min?: number; max?: number; disabled?: boolean; loading?: boolean }) {
  const translate = useT();
  const { t } = useTheme();
  const latest = useRef({ value, onChange }); latest.current = { value, onChange };
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const repeated = useRef(false);
  const stop = () => clearTimeout(timer.current);
  const cancel = () => { stop(); repeated.current = false; };
  useEffect(() => stop, []);
  useEffect(() => { if (disabled || loading || value <= min || value >= max) { stop(); repeated.current = false; } }, [disabled, loading, value, min, max]);
  function change(delta: number) { const next = Math.min(max, Math.max(min, latest.current.value + delta)); if (next === latest.current.value) return false; latest.current.value = next; latest.current.onChange(next); return true; }
  function hold(delta: number) { stop(); repeated.current = false; timer.current = setTimeout(function repeat() { repeated.current = true; if (change(delta) && latest.current.value > min && latest.current.value < max) timer.current = setTimeout(repeat, t.timing.stepperRepeatInterval); }, t.timing.stepperRepeatDelay); }
  function press(delta: number) { if (!repeated.current) change(delta); repeated.current = false; }
  return <Stack direction={variant === 'inline' ? 'row' : 'column'} align={variant === 'inline' ? 'center' : 'stretch'} justify="space-between" gap={variant === 'inline' ? 'sm' : '2xs'}><Text variant="label">{label}</Text><Surface radius="pill" padding="2xs" bg="subtle" elevation="none"><Stack direction="row" gap="sm" align="center" justify="space-between"><IconButton name="Minus" label={translate('common.decrease', { label })} disabled={disabled || value <= min} loading={loading} onPress={() => press(-1)} onPointerDown={() => hold(-1)} onPointerUp={stop} onPointerCancel={cancel} onPointerLeave={cancel} /><Text live>{value}</Text><IconButton name="Plus" label={translate('common.increase', { label })} disabled={disabled || value >= max} loading={loading} onPress={() => press(1)} onPointerDown={() => hold(1)} onPointerUp={stop} onPointerCancel={cancel} onPointerLeave={cancel} /></Stack></Surface></Stack>;
}

export function Toast({ message, tone = 'neutral', action, onClose, duration }: { message: string; tone?: 'neutral' | 'success' | 'danger'; action?: { label: string; onPress: () => void }; onClose?: () => void; duration?: number | null }) {
  const translate = useT();
  const { t } = useTheme();
  const [visible, setVisible] = useState(true);
  const close = useRef(onClose); close.current = onClose;
  useEffect(() => { if (duration === null) return; const timer = setTimeout(() => { setVisible(false); close.current?.(); }, duration ?? t.timing.toastDuration); return () => clearTimeout(timer); }, [duration, t]);
  if (!visible) return null;
  return <Surface padding="sm"><Stack direction="row" align="center" wrap><Text live tone={tone === 'neutral' ? 'primary' : tone}>{message}</Text>{action && <Button label={action.label} onPress={action.onPress} variant="secondary" />}{onClose && <IconButton name="X" label={translate('common.close')} onPress={onClose} />}</Stack></Surface>;
}
export function UndoToast({ message, onUndo, onCommit }: { message: string; onUndo: () => void; onCommit: () => void | Promise<unknown> }) {
  const { t } = useTheme();
  const translate = useT();
  const [active, setActive] = useState(true);
  const settled = useRef(false);
  const callbacks = useRef({ onUndo, onCommit }); callbacks.current = { onUndo, onCommit };
  useEffect(() => { const timer = setTimeout(() => { if (!settled.current) { settled.current = true; setActive(false); void callbacks.current.onCommit(); } }, t.timing.undoWindow); return () => clearTimeout(timer); }, [t]);
  if (!active) return null;
  return <Toast message={message} duration={null} action={{ label: translate('common.undo'), onPress() { if (!settled.current) { settled.current = true; setActive(false); callbacks.current.onUndo(); } } }} />;
}

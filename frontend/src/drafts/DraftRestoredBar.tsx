import { useT } from '@/i18n';
import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { Surface } from '@/components/Surface';

export function DraftRestoredBar({ onDiscard }: { onDiscard: () => void }) {
  const t = useT();
  return <Surface bg="subtle" padding="sm" elevation="none"><Stack gap="2xs"><Text live>{t('draft.restored')}</Text><Button variant="ghost" label={t('common.discard')} onPress={onDiscard} /></Stack></Surface>;
}

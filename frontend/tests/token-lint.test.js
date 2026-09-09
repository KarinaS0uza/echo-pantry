// @vitest-environment node
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const lint = new ESLint({ cwd: fileURLToPath(new URL('..', import.meta.url)) });

async function tokenMessages(code, filePath = 'src/components/Probe.tsx') {
  const [result] = await lint.lintText(code, { filePath });
  expect(result.fatalErrorCount).toBe(0);
  return result.messages.filter((message) => message.ruleId?.startsWith('echo/'));
}

describe('component token rules through the project ESLint configuration', () => {
  it.each([
    ['const styles = { color: "#abc" };', 'echo/token-values'],
    ['const styles = { backgroundColor: `#aabbccdd` };', 'echo/token-values'],
    ['const styles = { width: "12px" };', 'echo/token-values'],
    ['const styles = { width: `calc(100% - 12px)` };', 'echo/token-values'],
    ['const styles = { width: `${value}px` };', 'echo/token-values'],
    ['const styles = { fontSize: 16 };', 'echo/token-values'],
    ['const styles = { marginTop: -4 };', 'echo/token-values'],
    ['const styles = { paddingHorizontal: 8 };', 'echo/token-values'],
    ['const styles = { borderTopLeftRadius: 12 };', 'echo/token-values'],
    ['const transition = { duration: 0.2 };', 'echo/token-values'],
    ['const transition = { duration: reduced ? 0 : t.motion.duration.base };', 'echo/token-values'],
    ['const transition = { delay: 0.04 };', 'echo/token-values'],
    ['const styles = { "padding": 8 as const };', 'echo/token-values'],
    ['const element = <Box fontSize={16} />;', 'echo/token-values'],
    ['const element = <Button style={styles} />;', 'echo/no-style-props'],
    ['const element = <Button className="override" />;', 'echo/no-style-props'],
    ['const element = <Button {...{style: styles}} />;', 'echo/no-style-props'],
    ['const props = {className: "override"}; const element = <Button {...props} />;', 'echo/no-style-props'],
  ])('rejects %s', async (code, ruleId) => {
    expect(await tokenMessages(code)).toEqual(expect.arrayContaining([expect.objectContaining({ ruleId })]));
  });

  it.each([
    'const styles = { color: color.text.primary, fontSize: t.type.body.fontSize, padding: t.space[4], flex: 1 };',
    'const element = <Button variant="primary" size="md" tone="neutral" />;',
    'import { View as NativeView } from "react-native"; const element = <NativeView style={styles} />;',
    'import * as Native from "react-native"; const element = <Native.View style={styles} />;',
    'import { Button as BaseButton } from "@gluestack-ui/themed"; const element = <BaseButton style={styles} />;',
    'import { MotionView } from "@/design/theme"; const element = <MotionView style={styles} />;',
    'import { motion } from "motion/react"; const element = <motion.div style={styles} />;',
    'const element = <div style={styles} />;',
  ])('allows token use and primitive internals: %s', async (code) => {
    expect(await tokenMessages(code)).toEqual([]);
  });

  it('does not exempt a custom component named View', async () => {
    expect(await tokenMessages('import { View } from "@/components"; const element = <View style={styles} />;'))
      .toEqual([expect.objectContaining({ ruleId: 'echo/no-style-props' })]);
  });

  it('keeps token literals legal in the design source', async () => {
    expect(await tokenMessages('export const token = { color: "#abc", fontSize: 16 };', 'src/design/tokens.ts'))
      .toEqual([]);
  });
});

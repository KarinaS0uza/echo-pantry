import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

// Exercise the production resolver before T020 creates an application entry point.
const root = fileURLToPath(new URL('..', import.meta.url));
const temporary = await mkdtemp(join(root, '.setup-probe-'));
try {
  const entry = join(temporary, 'dependencies.ts');
  await writeFile(entry, `
    export { createElement } from 'react';
    export { createRoot } from 'react-dom/client';
    export { View, Text } from 'react-native';
    export { GluestackUIProvider, Button } from '@gluestack-ui/themed';
    export { styled } from '@gluestack-style/react';
    export { Circle } from 'lucide-react-native';
    export { motion } from 'motion/react';
    export { QueryClient } from '@tanstack/react-query';
    export { default as i18next } from 'i18next';
    export { I18nextProvider } from 'react-i18next';
    export { HashRouter } from 'react-router-dom';
  `);
  await build({
    root,
    configFile: join(root, 'vite.config.ts'),
    build: {
      outDir: join(temporary, 'output'),
      lib: { entry, formats: ['es'], fileName: 'setup-probe' },
    },
  });
  process.stdout.write('Setup dependency bundle passed. Product build and browser acceptance remain pending.\n');
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
} finally {
  await rm(temporary, { recursive: true, force: true });
}

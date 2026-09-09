import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const webExtensions = ['.web.tsx', '.tsx', '.web.ts', '.ts', '.web.jsx', '.jsx', '.web.js', '.js', '.json'];

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  define: { __DEV__: JSON.stringify(mode !== 'production') },
  resolve: {
    alias: [
      { find: /^react-native$/, replacement: 'react-native-web' },
      {
        find: '@react-native/assets-registry/registry',
        replacement: 'react-native-web/dist/modules/AssetRegistry',
      },
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
    ],
    extensions: webExtensions,
  },
  optimizeDeps: { extensions: ['.jsx'], include: ['@gluestack-ui/modal'], esbuildOptions: { resolveExtensions: webExtensions } },
  server: { host: 'localhost', port: 3000, strictPort: true },
  preview: { host: 'localhost', port: 3000, strictPort: true },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{js,ts,tsx}'],
    clearMocks: true,
    restoreMocks: true,
    deps: {
      optimizer: {
        web: {
          enabled: true,
          include: ['react-native', '@gluestack-ui/themed', '@gluestack-ui/modal', '@react-native-aria/overlays', '@gluestack-style/react', '@gluestack-style/animation-resolver', 'lucide-react-native'],
        },
      },
    },
  },
}));

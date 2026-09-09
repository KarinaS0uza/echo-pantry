import { expect, it } from 'vitest';
import { i18n, ready } from '../src/i18n';

it('bundles kitchen completion and pantry labels without test-only resource injection', async () => {
  await ready;
  for (const lng of ['en', 'pt-BR']) {
    for (const key of ['kitchen.reviewTitle', 'kitchen.reviewBody', 'kitchen.completionError', 'kitchen.retryFinish', 'kitchen.noPantryItems', 'demoPantry.title', 'demo.food.cherryTomatoes']) {
      expect(i18n.exists(key, { lng })).toBe(true);
      expect(i18n.t(key, { lng })).not.toBe(key);
    }
  }
});

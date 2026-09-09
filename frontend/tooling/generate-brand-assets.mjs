import { mkdir, readFile, writeFile } from 'node:fs/promises';
import tokens from '../../planning/design/tokens.ts';
import { brandArtwork as art } from '../src/design/brand-artwork.ts';

// Node 24 strips the types from the same sources used by the app.
const { brand: name } = JSON.parse(await readFile(new URL('../src/i18n/en.json', import.meta.url), 'utf8'));
const directory = new URL('../public/brand/', import.meta.url);
await mkdir(directory, { recursive: true });
const mark = art.arcs.map(d => `<path d="${d}" fill="none" stroke="currentColor" stroke-width="${art.strokeWidth}" stroke-linecap="${art.strokeLinecap}"/>`).join('') + `<path d="${art.leaf}" fill="currentColor"/>`;
for (const scheme of ['light', 'dark']) {
  const color = tokens.color[scheme].brand;
  const wordmark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${art.viewBox}" role="img" aria-label="${name}"><title>${name}</title><path d="${art.letters}" fill="${color.wordmark}"/><g transform="${art.symbolTransform}" color="${color.symbol}">${mark}</g></svg>\n`;
  await writeFile(new URL(`echo-pantry-${scheme}.svg`, directory), wordmark);
}
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${art.markViewBox}"><title>${name}</title><style>:root{color:${tokens.color.light.brand.symbol}}@media(prefers-color-scheme:dark){:root{color:${tokens.color.dark.brand.symbol}}}</style>${mark}</svg>\n`;
await writeFile(new URL('favicon.svg', directory), favicon);
console.log('Generated light/dark wordmarks and adaptive favicon from the shared vector master and tokens.');

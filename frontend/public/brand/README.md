# Echo Pantry identity

Approved direction: [Second Life + Echo Leaf](../../../../planning/design/logo-options/2026-09-08-second-life-echo-leaf/18-second-life-echo-leaf.png).

The echo rings and horizontal leaf replace the lowercase o within Echo. The primary
wordmark has no separate leading icon, concept number, or presentation background.

`BrandLogo` uses the shared vector master in `src/design/brand-artwork.ts`, with outlined
Roboto Bold lettering and echo-leaf paths. This keeps the wordmark sharp at any size and
independent of font-loading timing. Its accessible name comes from the existing `brand`
translation. The master is the implementation of the selected concept, not a screenshot.

- `echo-pantry-light.svg`: charcoal lettering with the deep teal symbol.
- `echo-pantry-dark.svg`: porcelain lettering and symbol.
- `favicon.svg`: standalone echo leaf, adapting to the browser color scheme.

Colors are generated from `planning/design/tokens.ts`. Regenerate with Node 24:

```sh
node frontend/tooling/generate-brand-assets.mjs
```

Use the shared `BrandLogo` component in the application so it follows the active theme.
The static SVG exports are for other brand placements. Artwork coordinates belong to the
vector master; layout dimensions belong to the design tokens. Keep the original concept
boards as design history.

import { useTheme } from './theme';

export function KitchenStyles() {
  const { t, color: c, scheme } = useTheme();
  const k = t.kitchen;
  return <style>{`
    [data-kitchen] { min-height: ${t.layout.viewport}; background: ${scheme === 'dark' ? k.darkCanvas : k.canvas}; padding: ${t.space.md} ${t.space.sm} ${t.space.xl}; }
    [data-kitchen-top] { max-width: ${t.layout.maxWidth}; margin-inline: auto; padding-block: ${t.space['2xs']} ${t.space.md}; }
    [data-kitchen-board] { display: grid; gap: ${t.space.md}; max-width: ${k.panelMaxWidth}; margin-inline: auto; }
    [data-kitchen-panel] { display: flex; flex-direction: column; min-width: ${t.space.none}; position: relative; background: ${scheme === 'dark' ? k.darkPanel : k.panel}; border: ${t.size.hairline} solid ${c.border.subtle}; border-radius: ${t.radius.xl}; box-shadow: ${k.portraitShadow}; padding: ${t.space.md}; }
    [data-kitchen-panel][data-active="false"] { display: none; }
    [data-kitchen-header] { display: flex; align-items: center; justify-content: space-between; gap: ${t.space.xs}; padding-bottom: ${t.space.md}; }
    [data-kitchen-mobile-brand] { display: none; min-width: ${t.space.none}; }
    [data-kitchen-title] { font-family: ${t.font.family.base}; font-size: ${k.displaySize}; line-height: ${k.displayLineHeight}; font-weight: ${t.font.weight.bold}; letter-spacing: ${k.displayTracking}; color: ${c.text.primary}; margin: ${t.space.none}; overflow-wrap: anywhere; white-space: pre-line; }
    [data-kitchen-food] { width: ${t.layout.full}; height: ${k.heroHeight}; display: flex; align-items: center; justify-content: center; pointer-events: none; }
    [data-kitchen-food] img { width: ${t.layout.full}; height: ${t.layout.full}; object-fit: contain; filter: drop-shadow(${k.foodShadow}); }
    [data-kitchen-food="dish"] { height: ${k.dishHeight}; }
    [data-kitchen-food="recipe"] { height: ${k.recipeHeroHeight}; }
    [data-kitchen-food="tile"] { height: ${k.tileHeight}; }
    [data-kitchen-feature] { position: relative; border-radius: ${t.radius.lg}; background: ${c.bg.glass}; border: ${t.size.hairline} solid ${c.bg.glassBorder}; box-shadow: ${t.elevation.floating}; }
    [data-kitchen-feature] > button:first-child { background: transparent; border: none; border-radius: ${t.radius.lg}; padding: ${t.space.sm}; width: ${t.layout.full}; cursor: pointer; text-align: left; }
    [data-kitchen-feature] [data-feature-copy] { padding-right: ${t.space.xl}; }
    [data-kitchen-bookmark] { position: absolute; right: ${t.space.xs}; bottom: ${t.space.sm}; }
    [data-kitchen-ideas] { display: grid; grid-template-columns: ${k.splitColumns}; gap: ${t.space['2xs']}; }
    [data-kitchen-tile] { min-width: ${t.space.none}; padding: ${t.space['2xs']}; text-align: left; border: ${t.size.hairline} solid ${c.bg.glassBorder}; border-radius: ${t.radius.md}; background: ${c.bg.glass}; box-shadow: ${t.elevation.resting}; cursor: pointer; }
    [data-kitchen-tile][aria-pressed="true"] { outline: ${t.size.focusRing} solid ${c.border.focus}; }
    [data-kitchen-tile-icon] { height: ${k.tileHeight}; display: grid; place-items: center; color: ${c.text.accent}; }
    [data-kitchen-section] { padding-top: ${t.space.md}; }
    [data-kitchen-recipe-body] { display: flex; flex-direction: column; gap: ${t.space.md}; flex: 1; background: ${c.bg.glass}; border: ${t.size.hairline} solid ${c.bg.glassBorder}; border-radius: ${t.radius.xl}; padding: ${t.space.md}; margin-inline: -${t.space.md}; margin-bottom: -${t.space.md}; }
    [data-kitchen-recipe-body] [role="tablist"] { border-radius: ${t.radius.md} !important; }
    [data-kitchen-recipe-body] [role="tab"] { border-radius: ${t.radius.md} !important; padding-inline: ${t.space['2xs']} !important; }
    [data-kitchen-recipe-panel] { flex: 1; }
    [data-kitchen-action] { padding-top: ${t.space.md}; margin-top: auto; }
    [data-kitchen-cook] { background: ${k.cookBg}; color: ${t.color.dark.text.primary}; isolation: isolate; }
    [data-kitchen-cook]::before { content: ''; position: absolute; inset: ${t.space.none}; background: ${k.cookScrim}, url('/images/kitchen/lemon-beans.png') center / cover; filter: blur(${t.blur.sm}); z-index: -1; border-radius: inherit; }
    [data-kitchen-cook] [data-kitchen-title] { color: ${t.color.dark.text.primary}; }
    [data-kitchen-cook] [data-kitchen-header] { padding-bottom: ${t.space.lg}; }
    [data-kitchen-cook] [data-control]:focus-visible { outline-color: ${t.color.dark.border.focus}; }
    [data-kitchen-cook] button[data-variant="ghost"] { background: ${t.color.dark.bg.glass} !important; }
    [data-kitchen-cook] button[data-variant="ghost"]:hover { background: ${t.color.dark.action.ghostHover} !important; }
    [data-kitchen-timer] { margin-block: ${t.space.lg}; padding: ${t.space.sm}; background: ${t.color.dark.bg.glass}; border: ${t.size.hairline} solid ${t.color.dark.bg.glassBorder}; border-radius: ${t.radius.xl}; box-shadow: ${t.elevation.contact}; backdrop-filter: blur(${t.blur.md}); }
    [data-timer-ring] { position: relative; width: min(${t.layout.full}, ${t.size.timerRing}); aspect-ratio: ${t.layout.aspect.tile}; margin: ${t.space.sm} auto; display: grid; place-items: center; }
    [data-timer-ring] svg { position: absolute; inset: ${t.space.none}; width: ${t.layout.full}; height: ${t.layout.full}; transform: rotate(${k.ring.rotation}); }
    [data-timer-digits] { font-family: ${t.font.family.numeric}; font-size: ${k.timerSize}; line-height: ${k.timerLineHeight}; font-weight: ${t.font.weight.regular}; letter-spacing: ${k.displayTracking}; font-variant-numeric: tabular-nums; }
    [data-kitchen-note] { max-width: ${t.layout.maxWidth}; margin-inline: auto; padding-top: ${t.space.lg}; }
    @media (width < ${t.breakpoint.lg}) {
      [data-kitchen] { padding: ${t.space.none}; }
      [data-kitchen-top] { display: none; }
      [data-kitchen-mobile-brand] { display: block; flex-shrink: 1; }
      [data-kitchen-desktop-title] { display: none; }
      [data-kitchen-board] { display: block; }
      [data-kitchen-panel] {
        min-height: ${k.phoneHeight}; border: none; border-radius: ${t.radius.none}; box-shadow: none;
        padding: max(${t.space.sm}, env(safe-area-inset-top)) ${k.phoneGutter} max(${t.space.md}, env(safe-area-inset-bottom));
        background: transparent;
      }
      [data-kitchen-header] { padding-bottom: ${t.space.md}; }
      [data-kitchen-title] { font-size: ${k.phoneDisplaySize}; line-height: ${k.phoneDisplayLineHeight}; overflow-wrap: normal; }
      [data-kitchen-food] { height: ${k.phoneHeroHeight}; }
      [data-kitchen-food="dish"] { height: ${k.phoneDishHeight}; }
      [data-kitchen-food="recipe"] { height: ${k.phoneRecipeHeight}; }
      [data-kitchen-food="tile"] { height: ${k.phoneTileHeight}; }
      [data-kitchen-section] { padding-top: ${t.space.sm}; }
      [data-kitchen-recipe-body] {
        margin-inline: calc(-1 * ${k.phoneGutter}); margin-bottom: -${t.space.md};
        padding: ${t.space.md} ${k.phoneGutter} max(${t.space.sm}, env(safe-area-inset-bottom));
        border-bottom: none; border-radius: ${t.radius.xl} ${t.radius.xl} ${t.radius.none} ${t.radius.none};
      }
      [data-kitchen-recipe-body] > [data-kitchen-action] {
        position: sticky; bottom: ${t.space.none}; z-index: ${t.zIndex.sticky};
        padding-block: ${t.space.sm} max(${t.space.sm}, env(safe-area-inset-bottom)); background: ${c.bg.surface};
      }
      [data-kitchen-cook] { background: ${k.cookBg}; }
      [data-kitchen][data-kitchen-view="cooking"] { background: ${k.cookBg}; }
      [data-kitchen-cook] [data-kitchen-timer] { margin-block: ${t.space.md}; }
      [data-kitchen-note] { padding: ${t.space.sm} ${k.phoneGutter} max(${t.space.md}, env(safe-area-inset-bottom)); }
      [data-kitchen]:not([data-kitchen-view="home"]) [data-kitchen-note] { display: none; }
    }
    @media (min-width: ${t.breakpoint.lg}) {
      [data-kitchen] { padding: ${t.space.md} ${t.space.lg} ${t.space.xl}; }
      [data-kitchen-top] { display: block; }
      [data-kitchen-board] { display: grid; max-width: ${t.measure.max}; align-items: stretch; }
      [data-kitchen-panel][data-active="true"] { display: flex; min-height: ${k.panelMinHeight}; }
      [data-kitchen-panel][data-active="false"], [data-kitchen-panel][hidden] { display: none; }
    }
    @media (prefers-reduced-motion: reduce) { [data-kitchen] *, [data-kitchen] *::before { animation: none !important; transition: none !important; scroll-behavior: auto !important; } }
  `}</style>;
}

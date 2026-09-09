import { useTheme } from './theme';

/** Native web interaction selectors complement React Native Web's layout primitives. */
export function GlobalStyles() {
  const { color: c, t } = useTheme();
  return <style>{`
    html, body, #root { min-height: ${t.layout.full}; }
    body { margin: ${t.space.none}; background: ${c.bg.canvas}; color: ${c.text.primary}; font-family: ${t.font.family.base}; }
    * { box-sizing: border-box; }
    button, input, select, textarea { font: inherit; color: inherit; }
    button, input, select { min-width: ${t.space.none}; }
    a { color: ${c.text.link}; }
    [data-control] { transition: transform ${t.motion.duration.fast}ms; }
    [data-control]:focus-visible, a:focus-visible { outline: ${t.size.focusRing} solid ${c.border.focus}; outline-offset: ${t.size.focusOffset}; }
    button[data-glass]:focus-visible { box-shadow: ${t.space.none} ${t.space.none} ${t.space.none} calc(${t.size.focusRing} + ${t.size.focusOffset}) ${c.bg.surface} !important; }
    [data-control]:disabled:not([aria-busy="true"]) { background: ${c.action.primaryDisabled} !important; color: ${c.text.disabled} !important; cursor: not-allowed; }
    [data-control][aria-busy="true"] { cursor: progress; }
    [data-control]:not([data-field]):active:not(:disabled):not([aria-busy="true"]) { transform: scale(${t.motion.scale.pressed}); }
    @media (hover: hover) {
      button[data-control]:hover:not(:disabled) { transform: scale(${t.motion.scale.hover}); background: ${c.action.ghostHover} !important; }
      button[data-variant="primary"]:hover:not(:disabled) { background: ${c.action.primaryHover} !important; }
      button[data-variant="destructive"]:hover:not(:disabled) { outline: ${t.size.hairline} solid ${c.feedback.danger}; }
      input[data-control]:hover:not(:disabled):not([aria-busy="true"]), select[data-control]:hover:not(:disabled):not([aria-busy="true"]) { border-color: ${c.border.focus}; }
    }
    button[data-control]:active:not(:disabled) { transform: scale(${t.motion.scale.pressed}); background: ${c.action.ghostPressed} !important; }
    button[data-variant="primary"]:active:not(:disabled) { background: ${c.action.primaryPressed} !important; }
    [data-choice-label]:has(input:focus-visible) { outline: ${t.size.focusRing} solid ${c.border.focus}; outline-offset: ${t.size.focusOffset}; }
    [data-choice-label] input:focus-visible { outline: none; }
    @media (hover: hover) { [data-choice-label]:hover:has(input:not(:disabled)) { background: ${c.action.ghostHover}; } }
    [data-choice-label]:active:has(input:not(:disabled)) { background: ${c.action.ghostPressed}; }
    [data-field] { border: ${t.size.hairline} solid ${c.border.strong}; border-radius: ${t.radius.md}; min-height: ${t.size.touchMin}; padding: ${t.space['2xs']} ${t.space.xs}; background: ${c.bg.surface}; width: ${t.layout.full}; }
    [data-field][aria-invalid="true"] { border-color: ${c.feedback.danger}; }
    [data-field]:focus { outline: ${t.size.focusRing} solid ${c.border.focus}; outline-offset: ${t.size.focusOffset}; }
    [data-field][data-filled="true"] { background: ${c.bg.surfaceRaised}; }
    [data-shell] { max-width: ${t.layout.maxWidth}; margin-inline: auto; padding-inline: ${t.layout.gutter.base}; }
    [data-grid] { display: grid !important; grid-template-columns: repeat(auto-fit, minmax(min(${t.layout.full}, ${t.layout.gridMin}), 1fr)); }
    [data-skip] { position: absolute; transform: translateY(-${t.layout.viewport}); z-index: ${t.zIndex.banner}; padding: ${t.space.sm}; background: ${c.bg.surface}; }
    [data-skip]:focus { transform: none; }
    [data-sheet] { align-self: stretch; max-height: calc(${t.layout.viewport} - ${t.space.lg}); overflow-y: auto; animation: echo-enter ${t.motion.duration.base}ms ease-out; }
    @keyframes echo-enter { from { opacity: ${t.opacity.entrance}; transform: translateY(${t.space['2xs']}); } to { opacity: ${t.opacity.full}; transform: translateY(${t.space.none}); } }
    button[data-auto-full="true"] { width: ${t.layout.full}; align-self: stretch !important; }
    [data-drawer] { animation: echo-drawer ${t.motion.duration.base}ms ease-out; }
    @keyframes echo-drawer { from { transform: translateX(${t.layout.full}); } to { transform: translateX(${t.space.none}); } }
    [data-search-field][data-expanded="false"] { display: none; }
    [data-detail-action] { position: sticky; bottom: ${t.space.none}; z-index: ${t.zIndex.sticky}; padding-block: ${t.space.sm}; background: ${c.bg.surface}; }
    @supports not (backdrop-filter: blur(${t.blur.md})) { button[data-glass] { background: ${c.bg.surface} !important; } }
    @media (min-width: ${t.breakpoint.md}) { [data-shell] { padding-inline: ${t.layout.gutter.md}; } button[data-auto-full="true"] { width: auto; align-self: flex-start !important; } [data-search-trigger] { display: none; } [data-search-field][data-expanded="false"] { display: block; } [data-detail-action] { position: static; } }
    @media (min-width: ${t.breakpoint.lg}) {
      [data-shell] { padding-inline: ${t.layout.gutter.lg}; }
      [data-sheet-root] { justify-content: center !important; }
      [data-sheet] { align-self: center; max-width: ${t.measure.max}; }
    }
    @media (prefers-reduced-motion: reduce) { [data-control], [data-sheet], [data-drawer] { transition: none; animation: none; transform: none !important; } }
  `}</style>;
}

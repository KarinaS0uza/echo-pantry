import { useTheme } from '@/design/theme';
import { brandArtwork as art } from '@/design/brand-artwork';
import { useT } from '@/i18n';
import { useGuardedNavigate } from '@/drafts/NavigationGuard';

/** One accessible image, with the echo leaf in the o position of the wordmark. */
export function BrandLogo({ size = 'header', destination = '/kitchen' }: { size?: 'header' | 'compact'; destination?: '/' | '/kitchen' }) {
  const { t, color } = useTheme();
  const translate = useT();
  const navigate = useGuardedNavigate();
  return <a
    href={`#${destination}`}
    aria-label={`${translate('brand')}: ${translate('kitchen.home')}`}
    onClick={event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      navigate(destination);
    }}
    style={{ display: 'block', width: t.brand.width[size], maxWidth: t.layout.full, minWidth: t.space.none, flexShrink: 1 }}
  ><svg
    role="img"
    aria-label={translate('brand')}
    focusable="false"
    data-brand-logo={size}
    viewBox={art.viewBox}
    style={{ display: 'block', width: t.layout.full, height: 'auto' }}
  >
    <path data-brand-wordmark="" d={art.letters} fill={color.brand.wordmark} />
    <g data-brand-symbol="" transform={art.symbolTransform} fill={color.brand.symbol}>
      {art.arcs.map(path => <path key={path} d={path} fill="none" stroke={color.brand.symbol} strokeWidth={art.strokeWidth} strokeLinecap={art.strokeLinecap} />)}
      <path d={art.leaf} />
    </g>
  </svg></a>;
}

import { Menu, X, Plus, Minus, Check, Search, AlertCircle, Leaf, Carrot, Milk, Beef, Snowflake, Package, ChefHat, BookOpen, ArrowRight, ArrowLeft, Trash2, RotateCcw, LoaderCircle, Circle, Sun, Moon, Heart, Egg, Pencil, Bookmark, Pause, Play, Lightbulb, Ellipsis, Citrus } from 'lucide-react-native';
import { useTheme } from '@/design/theme';
import type { Tone } from './Text';

const icons = { Menu, X, Plus, Minus, Check, Search, AlertCircle, Leaf, Carrot, Milk, Beef, Snowflake, Package, ChefHat, BookOpen, ArrowRight, ArrowLeft, Trash2, RotateCcw, LoaderCircle, Circle, Sun, Moon, Heart, Egg, Pencil, Bookmark, Pause, Play, Lightbulb, Ellipsis, Citrus };
export type IconName = keyof typeof icons;
export function Icon({ name, size = 'md', tone = 'primary', label }: { name: IconName; size?: 'sm' | 'md' | 'lg'; tone?: Tone; label?: string }) {
  const { color, t } = useTheme();
  const Glyph = icons[name];
  return <Glyph size={t.size.icon[size]} strokeWidth={t.size.iconStroke} color={tone === 'critical' || tone === 'urgent' || tone === 'soon' ? color.urgency[tone] : tone === 'danger' || tone === 'success' ? color.feedback[tone] : color.text[tone]} aria-hidden={!label} aria-label={label} />;
}

import {
  BookOpen,
  CalendarCheck,
  Crown,
  Flame,
  Lock,
  Moon,
  Music,
  Palette,
  Sparkles,
  Star,
  Target,
  Trophy,
  Zap,
  type IconProps,
} from "./icons";
import type { AchievementIcon as Icon } from "../achievements";

const icons = {
  trophy: Trophy,
  flame: Flame,
  book: BookOpen,
  calendar: CalendarCheck,
  sparkles: Sparkles,
  zap: Zap,
  crown: Crown,
  moon: Moon,
  palette: Palette,
  star: Star,
  target: Target,
  music: Music,
  lock: Lock,
} satisfies Record<Icon | "lock", unknown>;

export function AchievementIcon({
  name,
  ...props
}: { name: Icon | "lock" } & IconProps) {
  const Component = icons[name];
  return <Component aria-hidden="true" {...props} />;
}

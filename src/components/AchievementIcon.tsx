import {
  BookOpen,
  CalendarCheck,
  Crown,
  Flame,
  Lock,
  Moon,
  Palette,
  Sparkles,
  Star,
  Trophy,
  Zap,
  type LucideProps,
} from "lucide-react";
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
  lock: Lock,
} satisfies Record<Icon | "lock", unknown>;

export function AchievementIcon({
  name,
  ...props
}: { name: Icon | "lock" } & LucideProps) {
  const Component = icons[name];
  return <Component aria-hidden="true" {...props} />;
}

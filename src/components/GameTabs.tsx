import type { CSSProperties } from "react";
import {
  CalendarCheck,
  ChartColumn,
  Gamepad2,
  Newspaper,
  PenLine,
  type Icon,
} from "./icons";

export type Tab = "play" | "daily" | "custom" | "record" | "news";

const tabs: [Tab, string, Icon][] = [
  ["play", "플레이", Gamepad2],
  ["daily", "데일리", CalendarCheck],
  ["custom", "내 가사", PenLine],
  ["record", "기록", ChartColumn],
  ["news", "소식", Newspaper],
];

/** Tabs left to right: tab transitions and swipes move along this order. */
export const TAB_ORDER = tabs.map(([tab]) => tab);

type Props = {
  active: Tab;
  onChange: (tab: Tab) => void;
  /** Tabs waiting for the player (a dot), with what screen readers hear. */
  pending?: Partial<Record<Tab, string>>;
};

/** Panels must use the ids `${tab}-panel` and label themselves with `${tab}-tab`. */
export function GameTabs({ active, onChange, pending = {} }: Props) {
  return (
    <div className="game-tabs" role="tablist" aria-label="화면 선택">
      {/* The current tab's background: one block that slides between tabs. */}
      <span
        className="tab-indicator"
        aria-hidden="true"
        style={
          {
            "--tab-count": tabs.length,
            "--tab-index": Math.max(0, TAB_ORDER.indexOf(active)),
          } as CSSProperties
        }
      />
      {tabs.map(([tab, label, Icon]) => (
        <button
          key={tab}
          id={`${tab}-tab`}
          role="tab"
          aria-selected={active === tab}
          aria-controls={`${tab}-panel`}
          onClick={() => onChange(tab)}
        >
          <Icon className="tab-icon" size={22} aria-hidden="true" />
          {label}
          {pending[tab] && active !== tab && (
            <>
              <span className="tab-dot" aria-hidden="true" />
              <span className="sr-only"> ({pending[tab]})</span>
            </>
          )}
        </button>
      ))}
    </div>
  );
}

export type Tab = "play" | "daily" | "record" | "collection" | "news";

const tabs: [Tab, string][] = [
  ["play", "플레이"],
  ["daily", "데일리"],
  ["record", "기록"],
  ["collection", "도감"],
  ["news", "소식"],
];

type Props = {
  active: Tab;
  onChange: (tab: Tab) => void;
  /** Tabs that show an "unread" dot. */
  dots?: Partial<Record<Tab, boolean>>;
};

/** Panels must use the ids `${tab}-panel` and label themselves with `${tab}-tab`. */
export function GameTabs({ active, onChange, dots = {} }: Props) {
  return (
    <div className="game-tabs" role="tablist" aria-label="화면 선택">
      {tabs.map(([tab, label]) => (
        <button
          key={tab}
          id={`${tab}-tab`}
          role="tab"
          aria-selected={active === tab}
          aria-controls={`${tab}-panel`}
          onClick={() => onChange(tab)}
        >
          {label}
          {dots[tab] && (
            <>
              <span className="tab-dot" aria-hidden="true" />
              <span className="sr-only">(새 소식 있음)</span>
            </>
          )}
        </button>
      ))}
    </div>
  );
}

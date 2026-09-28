export type Tab = "play" | "record";

const tabs: [Tab, string][] = [
  ["play", "플레이"],
  ["record", "기록"],
];

type Props = { active: Tab; onChange: (tab: Tab) => void };

/** Panels must use the ids `${tab}-panel` and label themselves with `${tab}-tab`. */
export function GameTabs({ active, onChange }: Props) {
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
        </button>
      ))}
    </div>
  );
}

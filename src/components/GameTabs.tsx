export type Tab =
  "play" | "daily" | "custom" | "record" | "collection" | "news";

const tabs: [Tab, string][] = [
  ["play", "플레이"],
  ["daily", "데일리"],
  ["custom", "내 가사"],
  ["record", "기록"],
  ["collection", "도감"],
];

type Props = {
  active: Tab;
  onChange: (tab: Tab) => void;
};

/** Panels must use the ids `${tab}-panel` and label themselves with `${tab}-tab`. 소식(news)은 탭이 아니라 헤더 버튼으로 연다. */
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

type Props<K extends string> = {
  /** What the tabs switch between, for screen readers. */
  label: string;
  items: readonly (readonly [key: K, text: string])[];
  value: K;
  onChange: (key: K) => void;
};

/** Tabs splitting one screen or sheet into parts (기록 통계·업적, 설정 계정·화면·정보). */
export function Segmented<K extends string>({
  label,
  items,
  value,
  onChange,
}: Props<K>) {
  return (
    <div className="segmented" role="tablist" aria-label={label}>
      {items.map(([key, text]) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={value === key}
          onClick={() => onChange(key)}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

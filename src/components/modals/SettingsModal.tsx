import { Check, Headphones } from "lucide-react";
import { questions, songs, units } from "../../game";
import { useGame } from "../../store";
import type { Theme } from "../../theme";

const themes: [Theme, string][] = [
  ["system", "시스템"],
  ["light", "라이트"],
  ["dark", "다크"],
];

type Props = {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onClose: () => void;
};

export function SettingsModal({ theme, onThemeChange, onClose }: Props) {
  const selected = useGame((s) => s.selected);
  const select = useGame((s) => s.select);
  const all = selected.length === units.length;
  const toggle = (unit: string) =>
    select(
      selected.includes(unit)
        ? selected.filter((v) => v !== unit)
        : [...selected, unit],
    );
  return (
    <>
      <span className="modal-icon">
        <Headphones />
      </span>
      <h2>어떤 노래를 만나볼까요?</h2>
      <p>
        여러 유닛을 함께 선택할 수 있어요.
        <br />
        다음 문제부터 적용돼요.
      </p>
      <div className="unit-options">
        <button className={all ? "chosen" : ""} onClick={() => select(units)}>
          NCT 전체 {all && <Check size={16} />}
        </button>
        {units.map((u) => (
          <button
            key={u}
            aria-pressed={selected.includes(u)}
            className={selected.includes(u) ? "chosen" : ""}
            onClick={() => toggle(u)}
          >
            {u}
            {selected.includes(u) && <Check size={16} />}
          </button>
        ))}
      </div>
      <p className="sample-note">
        {songs.length}곡 · {questions.length}문제 중{" "}
        {questions.filter((q) => selected.includes(q.unit)).length}
        문제가 선택됐어요.
      </p>
      <fieldset className="theme-settings">
        <legend>화면 모드</legend>
        <div className="theme-options">
          {themes.map(([value, label]) => (
            <label key={value} className={theme === value ? "selected" : ""}>
              <input
                type="radio"
                name="theme"
                value={value}
                checked={theme === value}
                onChange={() => onThemeChange(value)}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <button className="primary" onClick={onClose}>
        이어서 플레이
      </button>
    </>
  );
}

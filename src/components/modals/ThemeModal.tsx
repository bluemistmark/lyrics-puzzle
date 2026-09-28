import { Palette } from "lucide-react";
import type { Theme } from "../../theme";

const themes: [Theme, string][] = [
  ["system", "시스템"],
  ["light", "라이트"],
  ["dark", "다크"],
  ["excel", "엑셀"],
  ["notebook", "노트"],
  ["console", "게임기"],
];

type Props = {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onClose: () => void;
};

export function ThemeModal({ theme, onThemeChange, onClose }: Props) {
  return (
    <>
      <span className="modal-icon">
        <Palette />
      </span>
      <h2>화면 테마 고르기</h2>
      <p>원하는 분위기로 화면을 바꿔보세요.</p>
      <fieldset className="theme-settings">
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
        완료
      </button>
    </>
  );
}

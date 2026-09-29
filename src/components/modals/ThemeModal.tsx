import { Palette } from "lucide-react";
import { THEMES, type Theme } from "../../themes";

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
          {THEMES.map(([value, label]) => (
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

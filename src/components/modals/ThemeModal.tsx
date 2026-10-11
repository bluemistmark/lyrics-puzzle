import { Palette } from "lucide-react";
import { TEXT_SIZES, type TextSize } from "../../textSize";
import { THEMES, type Theme } from "../../themes";

type Props = {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  textSize: TextSize;
  onTextSizeChange: (size: TextSize) => void;
  onClose: () => void;
};

export function ThemeModal({
  theme,
  onThemeChange,
  textSize,
  onTextSizeChange,
  onClose,
}: Props) {
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
      <fieldset className="theme-settings">
        <legend>가사 글자 크기</legend>
        <div className="theme-options size-options">
          {TEXT_SIZES.map(([value, label]) => (
            <label key={value} className={textSize === value ? "selected" : ""}>
              <input
                type="radio"
                name="text-size"
                value={value}
                checked={textSize === value}
                onChange={() => onTextSizeChange(value)}
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

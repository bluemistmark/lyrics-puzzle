import { TEXT_SIZES, type TextSize } from "../textSize";
import { THEMES, type Theme } from "../themes";

type Props = {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  textSize: TextSize;
  onTextSizeChange: (size: TextSize) => void;
};

/** 테마 and 가사 글자 크기, in the 설정 sheet's 화면 tab. */
export function ThemeSettings({
  theme,
  onThemeChange,
  textSize,
  onTextSizeChange,
}: Props) {
  return (
    <>
      <fieldset className="theme-settings">
        <legend>테마</legend>
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
    </>
  );
}

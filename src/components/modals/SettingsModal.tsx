import { Settings } from "lucide-react";
import { THEMES, type Theme } from "../../themes";
import { NicknameForm } from "../NicknameForm";

type Props = {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onClose: () => void;
};

export function SettingsModal({ theme, onThemeChange, onClose }: Props) {
  return (
    <>
      <span className="modal-icon">
        <Settings />
      </span>
      <h2>설정</h2>
      <p>화면 테마와 랭킹 닉네임을 바꿀 수 있어요.</p>
      <fieldset className="theme-settings">
        <legend>화면 테마</legend>
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
      <NicknameForm submitLabel="닉네임 저장" />
      <button className="secondary" onClick={onClose}>
        닫기
      </button>
    </>
  );
}

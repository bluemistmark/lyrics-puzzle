import { Settings } from "lucide-react";
import type { Theme } from "../../theme";
import { NicknameForm } from "../NicknameForm";

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
      <NicknameForm submitLabel="닉네임 저장" />
      <button className="secondary" onClick={onClose}>
        닫기
      </button>
    </>
  );
}

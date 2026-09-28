import { AudioLines, FileSpreadsheet, HelpCircle, Palette } from "lucide-react";

type Props = { discreet: boolean; onHelp: () => void; onTheme: () => void };

export function Header({ discreet, onHelp, onTheme }: Props) {
  return (
    <header className="topbar">
      <a className="brand" href="#">
        <span className="brand-icon">
          {discreet ? <FileSpreadsheet size={23} /> : <AudioLines size={23} />}
        </span>
        <span>
          {discreet ? "문서 정리" : "초성 가사 맞히기"}
          <span className="brand-sub">
            {discreet ? "SHEET1 · PERSONAL" : "LYRICS PUZZLE"}
          </span>
        </span>
      </a>
      <div className="top-actions">
        <button className="icon-btn" aria-label="게임 방법" onClick={onHelp}>
          <HelpCircle size={21} />
        </button>
        <button
          className="icon-btn theme-trigger"
          aria-label="테마 설정"
          onClick={onTheme}
        >
          <Palette size={19} />
          <span>테마</span>
        </button>
      </div>
    </header>
  );
}

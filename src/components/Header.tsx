import { FileSpreadsheet, HelpCircle, Settings } from "lucide-react";

type Props = { discreet: boolean; onHelp: () => void; onSettings: () => void };

export function Header({ discreet, onHelp, onSettings }: Props) {
  return (
    <header className="topbar">
      <a className="brand" href="#">
        <span className="brand-icon">
          {discreet ? (
            <FileSpreadsheet size={23} />
          ) : (
            <img src="/favicon.svg" alt="" width="42" height="42" />
          )}
        </span>
        <span>
          {discreet ? "문서 정리" : "NCT 초성 가사 맞히기"}
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
          aria-label="설정"
          onClick={onSettings}
        >
          <Settings size={19} />
          <span>설정</span>
        </button>
      </div>
    </header>
  );
}

import { FileSpreadsheet, HelpCircle, Palette, UserRound } from "lucide-react";
import { LogoMark } from "./LogoMark";

type Props = {
  discreet: boolean;
  onHelp: () => void;
  onTheme: () => void;
  onAccount: () => void;
};

export function Header({ discreet, onHelp, onTheme, onAccount }: Props) {
  return (
    <header className="topbar">
      <a className="brand" href="#">
        <span className="brand-icon">
          {discreet ? <FileSpreadsheet size={23} /> : <LogoMark />}
        </span>
        <span>
          {discreet ? "문서 정리" : "네오 노래 퀴즈"}
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
        </button>
        <button
          className="icon-btn account-trigger"
          aria-label="계정"
          onClick={onAccount}
        >
          <UserRound size={21} />
        </button>
      </div>
    </header>
  );
}

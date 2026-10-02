import {
  FileSpreadsheet,
  HelpCircle,
  Newspaper,
  Palette,
  UserRound,
} from "lucide-react";
import { LogoMark } from "./LogoMark";

type Props = {
  discreet: boolean;
  /** 소식 화면이 열려 있는지 */
  newsOpen: boolean;
  /** 아직 안 읽은 소식이 있는지 */
  newsUnread: boolean;
  onHelp: () => void;
  onNews: () => void;
  onTheme: () => void;
  onAccount: () => void;
};

export function Header({
  discreet,
  newsOpen,
  newsUnread,
  onHelp,
  onNews,
  onTheme,
  onAccount,
}: Props) {
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
          className="icon-btn news-trigger"
          aria-label={newsUnread ? "소식 (새 소식 있음)" : "소식"}
          aria-pressed={newsOpen}
          onClick={onNews}
        >
          <Newspaper size={20} />
          {newsUnread && <span className="tab-dot" aria-hidden="true" />}
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

import { Share2, UserRound } from "./icons";
import { LogoMark } from "./LogoMark";

type Props = {
  /** The current screen's name; themes that show it (라이트) put it in place of the brand. */
  title?: string;
  /** 설정: account, nickname, 게임 방법, 화면 테마. */
  onAccount: () => void;
  /** The screen's share (기록 공유), shown before 설정 when given. */
  onShare?: () => void;
};

export function Header({ title, onAccount, onShare }: Props) {
  return (
    <header className="topbar">
      <a className="brand" href="#">
        <span className="brand-icon">
          <LogoMark />
        </span>
        <span>
          네오 노래 퀴즈
          <span className="brand-sub">LYRICS PUZZLE</span>
        </span>
      </a>
      {title && <h1 className="screen-title">{title}</h1>}
      <div className="top-actions">
        {onShare && (
          <button className="icon-btn" aria-label="공유" onClick={onShare}>
            <Share2 size={20} />
          </button>
        )}
        <button
          className="icon-btn account-trigger"
          aria-label="설정"
          onClick={onAccount}
        >
          <UserRound size={21} />
        </button>
      </div>
    </header>
  );
}

import { AudioLines, HelpCircle, Settings2 } from "lucide-react";

type Props = { onHelp: () => void; onSettings: () => void };

export function Header({ onHelp, onSettings }: Props) {
  return (
    <header className="topbar">
      <a className="brand" href="#">
        <span className="brand-icon">
          <AudioLines size={23} />
        </span>
        <span>
          초성 가사 맞히기<span className="brand-sub">LYRICS PUZZLE</span>
        </span>
      </a>
      <div className="top-actions">
        <button className="icon-btn" aria-label="게임 방법" onClick={onHelp}>
          <HelpCircle size={21} />
        </button>
        <button className="icon-btn" aria-label="설정" onClick={onSettings}>
          <Settings2 size={21} />
        </button>
      </div>
    </header>
  );
}

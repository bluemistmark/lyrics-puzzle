import { useState } from "react";
import { Flag, HelpCircle } from "../icons";
import { AccountSection } from "../AccountSection";
import { Footer } from "../Footer";
import { NicknameForm } from "../NicknameForm";
import { Segmented } from "../Segmented";
import { ThemeSettings } from "../ThemeSettings";
import type { TextSize } from "../../textSize";
import type { Theme } from "../../themes";

type Tab = "account" | "screen" | "about";
const TABS = [
  ["account", "계정"],
  ["screen", "화면"],
  ["about", "정보"],
] as const;

/** Closed with the sheet's X, Esc or a backdrop click (no extra button to keep it short). */
type Props = {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  textSize: TextSize;
  onTextSizeChange: (size: TextSize) => void;
  onHelp: () => void;
  onReport: () => void;
};

/** 설정, in three tabs: 계정 (로그인·닉네임), 화면 (테마·글자 크기), 정보 (게임 방법·제보·안내). */
export function AccountModal({ onHelp, onReport, ...themeProps }: Props) {
  const [tab, setTab] = useState<Tab>("account");
  return (
    <>
      <h2>설정</h2>
      <Segmented label="설정" items={TABS} value={tab} onChange={setTab} />
      {tab === "account" && (
        <>
          <AccountSection />
          <div className="account-nickname">
            <NicknameForm submitLabel="닉네임 저장" />
          </div>
        </>
      )}
      {tab === "screen" && <ThemeSettings {...themeProps} />}
      {tab === "about" && (
        <>
          <div className="menu-list">
            <button type="button" onClick={onHelp}>
              <HelpCircle size={18} aria-hidden="true" /> 게임 방법
            </button>
            <button type="button" onClick={onReport}>
              <Flag size={18} aria-hidden="true" /> 오류·의견 보내기
            </button>
          </div>
          <Footer />
        </>
      )}
    </>
  );
}

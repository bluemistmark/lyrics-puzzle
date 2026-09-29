import { Flag, UserRound } from "lucide-react";
import { AccountSection } from "../AccountSection";
import { NicknameForm } from "../NicknameForm";

/** Closed with the modal's X, Esc or a backdrop click (no extra button to keep it short). */
type Props = { onReport: () => void };

/** 로그인·탈퇴, 랭킹 닉네임, 오류·의견 보내기. */
export function AccountModal({ onReport }: Props) {
  return (
    <>
      <span className="modal-icon">
        <UserRound />
      </span>
      <h2>계정</h2>
      <AccountSection />
      <div className="account-nickname">
        <NicknameForm submitLabel="닉네임 저장" />
      </div>
      <button type="button" className="report-general" onClick={onReport}>
        <Flag size={15} aria-hidden="true" /> 오류·의견 보내기
      </button>
    </>
  );
}

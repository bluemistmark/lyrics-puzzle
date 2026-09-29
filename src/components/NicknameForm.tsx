import { useState } from "react";
import { NICKNAME_MAX } from "../nickname";
import { useRanking } from "../ranking";
import { blockComposingEnter } from "../utils/ime";

type Props = { submitLabel: string; onSaved?: () => void };

/** Nickname input shared by the first-solve prompt and the settings modal. */
export function NicknameForm({ submitLabel, onSaved }: Props) {
  const saved = useRanking((s) => s.nickname);
  const saveNickname = useRanking((s) => s.saveNickname);
  const [name, setName] = useState(saved);
  const [status, setStatus] = useState({ text: "", ok: false });
  const [pending, setPending] = useState(false);
  return (
    <form
      className="nickname-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setStatus({ text: "", ok: false });
        try {
          await saveNickname(name);
          setStatus({ text: "닉네임을 저장했어요.", ok: true });
          onSaved?.();
        } catch (error) {
          setStatus({ text: (error as Error).message, ok: false });
        } finally {
          setPending(false);
        }
      }}
    >
      <label htmlFor="nickname">랭킹 닉네임</label>
      <input
        id="nickname"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={blockComposingEnter}
        placeholder="2~12자, 랭킹에 공개돼요"
        maxLength={NICKNAME_MAX + 8}
        autoComplete="nickname"
      />
      <p className={status.ok ? "error saved" : "error"} role="status">
        {status.text}
      </p>
      <button className="primary" disabled={pending || !name.trim()}>
        {pending ? "저장 중…" : submitLabel}
      </button>
    </form>
  );
}

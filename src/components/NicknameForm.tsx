import { useState } from "react";
import { NICKNAME_MAX } from "../nickname";
import { useRanking } from "../ranking";
import { toast } from "../toast";
import { blockComposingEnter } from "../utils/ime";

type Props = { submitLabel: string; onSaved?: () => void };

/** Nickname input shared by the first-solve prompt and the settings modal. */
export function NicknameForm({ submitLabel, onSaved }: Props) {
  const saved = useRanking((s) => s.nickname);
  const saveNickname = useRanking((s) => s.saveNickname);
  const [name, setName] = useState(saved);
  // Only mistakes stay under the field; a saved name shows as a toast.
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <form
      className="nickname-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError("");
        try {
          await saveNickname(name);
          toast("닉네임을 저장했어요.");
          onSaved?.();
        } catch (e) {
          setError((e as Error).message);
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
      <p className="error" role="status">
        {error}
      </p>
      <button className="primary" disabled={pending || !name.trim()}>
        {pending ? "저장 중…" : submitLabel}
      </button>
    </form>
  );
}

import { Link2 } from "lucide-react";
import { playModeName, type PlayMode } from "../../modes";

type Props = { mode: PlayMode; onOpen: () => void; onKeep: () => void };

/** Asked when a shared question link would replace a round still in progress. */
export function SharedModal({ mode, onOpen, onKeep }: Props) {
  return (
    <>
      <span className="modal-icon">
        <Link2 />
      </span>
      <h2>공유받은 문제</h2>
      <p>
        {playModeName(mode)} 모드에서 풀던 문제가 있어요.
        <br />
        공유받은 문제를 열면 풀던 문제는 사라져요.
      </p>
      <button className="primary" onClick={onOpen}>
        공유받은 문제 풀기
      </button>
      <button className="secondary" onClick={onKeep}>
        풀던 문제 계속하기
      </button>
    </>
  );
}

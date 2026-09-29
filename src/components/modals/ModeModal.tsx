import { Check, Gamepad2 } from "lucide-react";
import { PLAY_MODES } from "../../modes";
import { useGame } from "../../store";

type Props = { onClose: () => void };

export function ModeModal({ onClose }: Props) {
  const playMode = useGame((s) => s.playMode);
  const setPlayMode = useGame((s) => s.setPlayMode);
  return (
    <>
      <span className="modal-icon">
        <Gamepad2 />
      </span>
      <h2>모드 선택</h2>
      <p>
        모드마다 진행 중인 문제가 따로 저장돼요.
        <br />
        기록·도감·업적은 클래식 모드에서만 쌓여요.
      </p>
      <div className="unit-options mode-options">
        {PLAY_MODES.map((m) => (
          <button
            key={m.id}
            aria-pressed={playMode === m.id}
            className={playMode === m.id ? "chosen" : ""}
            onClick={() => {
              setPlayMode(m.id);
              onClose();
            }}
          >
            <span>
              <b>{m.name}</b>
              <small>{m.description}</small>
            </span>
            {playMode === m.id && <Check size={16} />}
          </button>
        ))}
      </div>
    </>
  );
}

import { useMemo, useState } from "react";
import { Check } from "../icons";
import { Segmented } from "../Segmented";
import {
  knownSettings,
  mainUnits,
  otherUnits,
  questions,
  songs,
} from "../../game";
import { signalCount } from "../../known";
import { PLAY_MODES } from "../../modes";
import { useGame } from "../../store";

type Props = { onClose: () => void };
type Tab = "mode" | "artists" | "order";

/** 플레이 설정 sheet (the play toolbar's one chip), in tabs: 모드, 가수 (NCT units, then other
 *  artists when there are any, each section with its own 전체) and 출제 방식. */
export function PlayOptionsModal({ onClose }: Props) {
  const [tab, setTab] = useState<Tab>("mode");
  const playMode = useGame((s) => s.playMode);
  const setPlayMode = useGame((s) => s.setPlayMode);
  const selected = useGame((s) => s.selected);
  const select = useGame((s) => s.select);
  const preferKnown = useGame((s) => s.preferKnown);
  const setPreferKnown = useGame((s) => s.setPreferKnown);
  const collected = useGame((s) => s.collected);
  const songPrefs = useGame((s) => s.songPrefs);
  const signals = useMemo(
    () => signalCount(questions, collected, songPrefs),
    [collected, songPrefs],
  );
  const has = (list: string[]) => list.every((u) => selected.includes(u));
  const toggle = (unit: string) =>
    select(
      selected.includes(unit)
        ? selected.filter((v) => v !== unit)
        : [...selected, unit],
    );
  const unitButton = (u: string) => (
    <button
      key={u}
      aria-pressed={selected.includes(u)}
      className={selected.includes(u) ? "chosen" : ""}
      onClick={() => toggle(u)}
    >
      {u}
      {selected.includes(u) && <Check size={16} />}
    </button>
  );
  // A whole group on or off at once (the store keeps at least one unit selected).
  const groupButton = (label: string, list: string[]) => {
    const chosen = has(list);
    return (
      <button
        aria-pressed={chosen}
        className={chosen ? "chosen" : ""}
        onClick={() =>
          select(
            chosen
              ? selected.filter((u) => !list.includes(u))
              : [...new Set([...selected, ...list])],
          )
        }
      >
        {label} {chosen && <Check size={16} />}
      </button>
    );
  };
  const tabs = [
    ["mode", "모드"],
    ["artists", "가수"],
    ["order", "출제 방식"],
  ] as const;
  return (
    <>
      <h2>플레이 설정</h2>
      <Segmented
        label="플레이 설정"
        items={tabs}
        value={tab}
        onChange={setTab}
      />
      {tab === "mode" && (
        <>
          <div className="unit-options mode-options">
            {PLAY_MODES.map((m) => (
              <button
                key={m.id}
                aria-pressed={playMode === m.id}
                className={playMode === m.id ? "chosen" : ""}
                onClick={() => setPlayMode(m.id)}
              >
                {m.name}
              </button>
            ))}
          </div>
          <p className="sample-note mode-description">
            {PLAY_MODES.find((m) => m.id === playMode)!.description}
          </p>
        </>
      )}
      {tab === "artists" && (
        <>
          <h3 className="unit-group">NCT</h3>
          <div className="unit-options">
            {groupButton("전체", mainUnits)}
            {mainUnits.map(unitButton)}
          </div>
          {otherUnits.length > 0 && (
            <>
              <h3 className="unit-group">다른 가수</h3>
              <div className="unit-options">
                {groupButton("전체", otherUnits)}
                {otherUnits.map(unitButton)}
              </div>
            </>
          )}
        </>
      )}
      {tab === "order" && (
        <>
          <div className="unit-options single">
            <button
              aria-pressed={preferKnown}
              className={preferKnown ? "chosen" : ""}
              onClick={() => setPreferKnown(!preferKnown)}
            >
              아는 곡 우선 {preferKnown && <Check size={16} />}
            </button>
          </div>
          <p className="sample-note">
            클래식에서 제목을 맞혔거나 아는 곡으로 표시한 곡은 더 자주, 모르는
            곡은 덜 자주 나와요.
            <br />
            {signals < knownSettings.minSignalSongs
              ? `아는 곡·모르는 곡이 ${knownSettings.minSignalSongs}곡 이상 쌓이면 적용돼요. (지금 ${signals}곡)`
              : `지금 ${signals}곡의 기록으로 적용하고 있어요.`}
          </p>
        </>
      )}
      {/* The selection count stays under every tab, next to 완료. */}
      <p className="sample-note play-options-count">
        {songs.length}곡 · {questions.length}문제 중{" "}
        {questions.filter((q) => selected.includes(q.unit)).length}
        문제가 선택됐어요.
      </p>
      <button className="primary" onClick={onClose}>
        완료
      </button>
    </>
  );
}

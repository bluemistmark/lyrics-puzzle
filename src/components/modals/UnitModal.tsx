import { Check, Headphones } from "lucide-react";
import { mainUnits, otherUnits, questions, songs, units } from "../../game";
import { useGame } from "../../store";

type Props = { onClose: () => void };

export function UnitModal({ onClose }: Props) {
  const selected = useGame((s) => s.selected);
  const select = useGame((s) => s.select);
  const has = (list: string[]) => list.every((u) => selected.includes(u));
  const allMain = selected.length === mainUnits.length && has(mainUnits);
  const all = selected.length === units.length;
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
  const presetButton = (label: string, list: string[], chosen: boolean) => (
    <button
      aria-pressed={chosen}
      className={chosen ? "chosen" : ""}
      onClick={() => select(list)}
    >
      {label} {chosen && <Check size={16} />}
    </button>
  );
  return (
    <>
      <span className="modal-icon">
        <Headphones />
      </span>
      <h2>유닛 선택</h2>
      <p>
        여러 유닛을 선택할 수 있어요.
        <br />
        변경 사항은 다음 문제부터 적용돼요.
      </p>
      <div className="unit-options">
        {presetButton("NCT 전체", mainUnits, allMain)}
        {otherUnits.length > 0 && presetButton("전체", units, all)}
        {mainUnits.map(unitButton)}
      </div>
      {otherUnits.length > 0 && (
        <>
          <h3 className="unit-group">다른 가수</h3>
          <div className="unit-options">{otherUnits.map(unitButton)}</div>
        </>
      )}
      <p className="sample-note">
        {songs.length}곡 · {questions.length}문제 중{" "}
        {questions.filter((q) => selected.includes(q.unit)).length}
        문제가 선택됐어요.
      </p>
      <button className="primary" onClick={onClose}>
        선택 완료
      </button>
    </>
  );
}

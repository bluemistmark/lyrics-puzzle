import { useState, type FormEvent } from "react";
import { knownSettingsOf } from "../data/build-catalog.ts";
import {
  DEFAULT_KNOWN_SETTINGS,
  KNOWN_LIMITS,
  knownSettingsIssues,
} from "../known.ts";
import { useAdmin } from "./store";
import { useRoute } from "./useRoute";

type Draft = { known: string; unknown: string; min: string };

const draftOf = (s = DEFAULT_KNOWN_SETTINGS): Draft => ({
  known: String(s.knownWeight),
  unknown: String(Math.round(s.unknownWeight * 1000) / 1000),
  min: String(s.minSignalSongs),
});
const parse = (d: Draft) => ({
  knownWeight: Number(d.known),
  unknownWeight: Number(d.unknown),
  minSignalSongs: Number(d.min),
});

/** 출제 설정 (game_settings): 클래식 "아는 곡 우선" weights, applied to the game on the next publish. */
export function SettingsTab() {
  const settings = useAdmin((s) => s.settings);
  const settingsError = useAdmin((s) => s.settingsError);
  const saveSettings = useAdmin((s) => s.saveSettings);
  const go = useRoute((s) => s.go);
  const [draft, setDraft] = useState(() => draftOf(knownSettingsOf(settings)));
  const [state, setState] = useState<{
    kind: "idle" | "saving" | "saved" | "error";
    message: string;
  }>({ kind: "idle", message: "" });
  const value = parse(draft);
  const issues = knownSettingsIssues(value);
  const change = (key: keyof Draft) => (e: { target: { value: string } }) => {
    setDraft({ ...draft, [key]: e.target.value });
    setState({ kind: "idle", message: "" });
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (issues.length) return;
    setState({ kind: "saving", message: "" });
    try {
      await saveSettings({
        id: "default",
        known_weight: value.knownWeight,
        unknown_weight: value.unknownWeight,
        min_signal_songs: value.minSignalSongs,
      });
      setState({ kind: "saved", message: "저장했어요." });
    } catch (error) {
      setState({ kind: "error", message: (error as Error).message });
    }
  };

  if (settingsError)
    return (
      <section className="settings">
        <p className="form-error">
          출제 설정을 불러오지 못했어요. {settingsError}
        </p>
        <p className="muted">
          <code>supabase/migrations/20261009000000_game_settings.sql</code>을
          아직 실행하지 않았다면 SQL Editor에서 실행한 뒤 새로고침하세요.
        </p>
      </section>
    );
  return (
    <section className="settings">
      <h2 className="section-title">아는 곡 우선 (클래식)</h2>
      <p className="muted">
        도감에 있거나 플레이어가 아는 곡으로 표시한 곡은 아는 곡 가중치로,
        모르는 곡으로 표시한 곡은 모르는 곡 가중치로, 나머지 곡은 1로 뽑혀요.
        아는 곡·모르는 곡이 기준 곡 수보다 적은 플레이어는 가중치 없이 균등하게
        뽑아요. 플레이어가 유닛 선택에서 "아는 곡 우선"을 끄면 적용되지 않아요.
      </p>
      {!settings && (
        <p className="muted">
          저장된 설정이 없어 기본값을 보여 주고 있어요. 저장하면 이 값으로
          게시돼요.
        </p>
      )}
      <form onSubmit={submit}>
        <label className="stack">
          아는 곡 가중치{" "}
          <span className="muted">
            ({KNOWN_LIMITS.knownWeight.join("~")}, 기본{" "}
            {DEFAULT_KNOWN_SETTINGS.knownWeight})
          </span>
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            min={KNOWN_LIMITS.knownWeight[0]}
            max={KNOWN_LIMITS.knownWeight[1]}
            value={draft.known}
            onChange={change("known")}
          />
        </label>
        <label className="stack">
          모르는 곡 가중치{" "}
          <span className="muted">
            ({KNOWN_LIMITS.unknownWeight.join("~")}, 기본 0.333)
          </span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min={KNOWN_LIMITS.unknownWeight[0]}
            max={KNOWN_LIMITS.unknownWeight[1]}
            value={draft.unknown}
            onChange={change("unknown")}
          />
        </label>
        <label className="stack">
          적용 기준 곡 수{" "}
          <span className="muted">
            ({KNOWN_LIMITS.minSignalSongs.join("~")}, 기본{" "}
            {DEFAULT_KNOWN_SETTINGS.minSignalSongs})
          </span>
          <input
            type="number"
            inputMode="numeric"
            step="1"
            min={KNOWN_LIMITS.minSignalSongs[0]}
            max={KNOWN_LIMITS.minSignalSongs[1]}
            value={draft.min}
            onChange={change("min")}
          />
        </label>
        {issues.length > 0 ? (
          <ul className="form-error">
            {issues.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        ) : (
          <p className="muted">
            아는 곡은 보통 곡보다 {value.knownWeight}배, 모르는 곡은{" "}
            {Math.round(value.unknownWeight * 1000) / 1000}배로 뽑혀요. 아는
            곡·모르는 곡이 {value.minSignalSongs}곡 이상인 플레이어부터
            적용돼요.
          </p>
        )}
        <div className="form-actions">
          <button
            type="button"
            onClick={() => {
              setDraft(draftOf());
              setState({ kind: "idle", message: "" });
            }}
          >
            기본값으로
          </button>
          <button
            className="primary"
            disabled={issues.length > 0 || state.kind === "saving"}
          >
            {state.kind === "saving" ? "저장 중…" : "저장"}
          </button>
        </div>
      </form>
      {state.kind === "error" && (
        <p className="form-error" role="status">
          {state.message}
        </p>
      )}
      {state.kind === "saved" && (
        <p className="ok-text" role="status">
          {state.message} 게임에는{" "}
          <button className="link" onClick={() => go("publish")}>
            게시
          </button>
          해야 반영돼요.
        </p>
      )}
    </section>
  );
}

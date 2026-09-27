import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight,
  AudioLines,
  Check,
  ChevronDown,
  Headphones,
  HelpCircle,
  Lightbulb,
  RotateCcw,
  Settings2,
  Sparkles,
  X,
} from "lucide-react";
import { questions, songs, initial, progress, units } from "./game";
import { useGame } from "./store";
import "./style.css";
import { useTheme, type Theme } from "./theme";
function App() {
  const { theme, setTheme } = useTheme();
  const g = useGame();
  const q = questions.find((q) => q.id === g.round.id)!;
  const r = g.round;
  const p = progress(q, r.revealed);
  const percent = Math.round((p.count / p.total) * 100);
  const full = p.count === p.total;
  const [word, setWord] = useState("");
  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState("");
  const [activeTab, setActiveTab] = useState<"play" | "record">("play");
  const [modal, setModal] = useState<
    "title" | "settings" | "help" | "giveup" | "reset" | null
  >(null);
  const input = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (modal) {
      dialog.current?.showModal();
    } else dialog.current?.close();
  }, [modal]);
  useEffect(() => {
    setWord("");
    setTitle("");
    setTitleError("");
  }, [r.id]);
  useEffect(() => {
    const ctx = (
      document as unknown as {
        modelContext?: {
          registerTool: (tool: unknown, options: unknown) => Promise<void>;
        };
      }
    ).modelContext;
    if (!ctx) return;
    const lifecycle = new AbortController();
    const register = (tool: unknown) => {
      try {
        Promise.resolve(
          ctx.registerTool(tool, { signal: lifecycle.signal }),
        ).catch(() => {});
      } catch {}
    };
    register({
      name: "guess_lyric_word",
      description: "입력한 단어와 일치하는 현재 문제의 가사를 공개합니다.",
      inputSchema: {
        type: "object",
        properties: { word: { type: "string", minLength: 1, maxLength: 60 } },
        required: ["word"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute: async (data: unknown) => {
        const w = (data as { word?: unknown })?.word;
        if (typeof w !== "string" || !w.trim() || w.length > 60)
          throw Error("단어를 입력하세요.");
        useGame.getState().guess(w);
        await new Promise(requestAnimationFrame);
        return { message: useGame.getState().notice };
      },
    });
    return () => lifecycle.abort();
  }, []);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    g.guess(word);
    setWord("");
    input.current?.focus();
  };
  return (
    <>
      <div className="app-shell">
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
            <button
              className="icon-btn"
              aria-label="게임 방법"
              onClick={() => setModal("help")}
            >
              <HelpCircle size={21} />
            </button>
            <button
              className="icon-btn"
              aria-label="설정"
              onClick={() => setModal("settings")}
            >
              <Settings2 size={21} />
            </button>
          </div>
        </header>
        <main>
          <div className="game-tabs" role="tablist" aria-label="화면 선택">
            <button id="play-tab" role="tab" aria-selected={activeTab === "play"} aria-controls="play-panel" onClick={() => setActiveTab("play")}>플레이</button>
            <button id="record-tab" role="tab" aria-selected={activeTab === "record"} aria-controls="record-panel" onClick={() => setActiveTab("record")}>기록</button>
          </div>
          <div id="play-panel" role="tabpanel" aria-labelledby="play-tab" hidden={activeTab !== "play"}>
          <div className="game-toolbar">
            <h1>지금 도전 중</h1>
            <button className="filter" onClick={() => setModal("settings")}>
              {g.selected.length === units.length
                ? "NCT 전체"
                : g.selected.length === 1
                  ? g.selected[0]
                  : `${g.selected.length}개 유닛`}
              <ChevronDown size={15} />
            </button>
          </div>
          <section className="puzzle-card" aria-label="초성 가사 문제">
            <div className="card-top">
              <span className="question-label">
                초성 가사 <span>{q.lines.length}줄 문제</span>
              </span>
            </div>
            <div className="lyrics" aria-label="문제 가사">
              {q.lines.map((line, l) => (
                <p key={l}>
                  {line.map((token, w) => (
                    <React.Fragment key={w}>
                      <span
                        className={`word ${token.pronunciation && r.english ? "english" : ""}`}
                        aria-label={
                          token.pronunciation && r.english
                            ? "영어 구간"
                            : undefined
                        }
                      >
                        {token.pronunciation ? (
                          <span
                            className={
                              r.revealed.includes(`${l}:${w}:en`)
                                ? "revealed"
                                : ""
                            }
                          >
                            {r.givenUp || r.revealed.includes(`${l}:${w}:en`)
                              ? token.text
                              : [...token.pronunciation].map(initial).join("")}
                          </span>
                        ) : (
                          [...token.text].map((c, i) => (
                            <span
                              key={i}
                              className={
                                r.revealed.includes(`${l}:${w}:${i}`)
                                  ? "revealed"
                                  : ""
                              }
                            >
                              {r.givenUp ||
                              r.revealed.includes(`${l}:${w}:${i}`)
                                ? c
                                : initial(c)}
                            </span>
                          ))
                        )}
                      </span>
                    </React.Fragment>
                  ))}
                </p>
              ))}
            </div>
            <div
              className="progress-track"
              role="progressbar"
              aria-label="가사 복원율"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div style={{ width: `${percent}%` }} />
            </div>
            <div className="progress-label">
              <span>{r.givenUp ? "정답 공개" : full ? "가사 완성!" : "가사 복원"}</span>
              <b>{r.givenUp ? "—" : `${percent}%`}</b>
            </div>
            <div className="card-bottom">
              <span className="small-status">
                {r.solved ? (
                  <>
                    <Check size={15} /> 제목 정답
                  </>
                ) : (
                  <>
                    <span className="status-dot" /> 떠오르는 단어부터 천천히
                  </>
                )}
              </span>
              <span>힌트 {r.hints}회</span>
            </div>
          </section>
          {(r.solved || r.givenUp || full) && (
            <div className="success-box">
              <span className="success-icon">
                {r.givenUp ? <Headphones size={22} /> : <Check size={22} />}
              </span>
              <div>
                <strong>
                  {r.solved || r.givenUp ? q.title : "가사를 모두 채웠어요!"}
                </strong>
                {(r.solved || r.givenUp) && <p>{q.unit}</p>}
                <p>
                  {r.givenUp
                    ? "정답을 확인했어요. 다음 문제에 도전해 보세요."
                    : r.solved
                      ? full
                        ? "제목도 가사도 모두 맞혔어요!"
                        : "제목 정답! 남은 가사도 계속 풀 수 있어요."
                      : "이제 노래 제목에도 도전해 보세요."}
                </p>
              </div>
            </div>
          )}
          <form className="word-form" onSubmit={submit}>
            <label htmlFor="word">떠오르는 단어</label>
            <div className="input-wrap">
              <input
                ref={input}
                id="word"
                value={word}
                onChange={(e) => setWord(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.nativeEvent.isComposing)
                    e.preventDefault();
                }}
                placeholder="가사에 있을 것 같은 단어"
                autoComplete="off"
                maxLength={60}
                disabled={r.givenUp || full}
              />
              <button
                type="submit"
                aria-label="단어 확인"
                disabled={!word.trim() || r.givenUp || full}
              >
                <ArrowRight size={23} />
              </button>
            </div>
          </form>
          <div className="feedback" role="status">{g.notice}</div>
          <div className="word-history">
            {r.words.length ? (
              r.words
                .slice(-8)
                .reverse()
                .map((w, i) => (
                  <span className={w.hit ? "hit" : "miss"} key={i}>
                    {w.word}
                    {w.hit ? <Check size={13} /> : <X size={12} />}
                  </span>
                ))
            ) : (
              <span className="empty-history">
                첫 단어가 노래의 시작이 될지도 몰라요.
              </span>
            )}
          </div>
          <div className="hints">
            <div>
              <button
                disabled={
                  r.english ||
                  r.givenUp ||
                  full ||
                  !q.lines.some((line) => line.some((t) => t.pronunciation))
                }
                onClick={() => g.hint("english")}
              >
                {r.english ? (
                  <Check size={14} />
                ) : (
                  <span className="english-a">A</span>
                )}{" "}
                영어 표시
              </button>
              <button
                disabled={r.givenUp || full}
                onClick={() => g.hint("word")}
              >
                <Sparkles size={14} /> 단어 공개
              </button>
            </div>
          </div>
          <div className="bottom-actions">
            {r.solved || r.givenUp ? (
              <button className="primary" onClick={g.next}>
                다음 문제 <ArrowRight size={18} />
              </button>
            ) : (
              <>
                <button
                  className="primary"
                  onClick={() => {
                    setTitleError("");
                    setModal("title");
                  }}
                >
                  <AudioLines size={19} /> 제목 맞히기
                </button>
                <button className="skip" onClick={() => setModal("giveup")}>
                  포기하기
                </button>
              </>
            )}
          </div>
          </div>
          <section id="record-panel" role="tabpanel" aria-labelledby="record-tab" hidden={activeTab !== "record"} className="record-panel">
            <h1>나의 기록</h1>
            <div className="record-grid">
              <div className="record-item"><span>제목 정답</span><strong>{g.stats.solved}문제</strong></div>
              <div className="record-item"><span>가사 완성</span><strong>{g.stats.completed}문제</strong></div>
              <div className="record-item"><span>현재 연속 정답</span><strong>{g.stats.streak}문제</strong></div>
              <div className="record-item"><span>최고 연속 정답</span><strong>{g.stats.best}문제</strong></div>
              <div className="record-item"><span>직접 완성</span><strong>{g.stats.direct}문제</strong></div>
            </div>
            <p className="record-note">기록은 현재 브라우저에 저장돼요. 브라우저 데이터를 지우면 기록도 삭제됩니다.</p>
            <button className="reset-btn" onClick={() => setModal("reset")}><RotateCcw size={14} /> 기록 초기화</button>
          </section>
        </main>
      </div>
      <dialog
        ref={dialog}
        onCancel={() => setModal(null)}
        onClick={(e) => {
          if (e.target === dialog.current) setModal(null);
        }}
      >
        <div className="modal-inner">
          <button
            className="close icon-btn"
            aria-label="닫기"
            onClick={() => setModal(null)}
          >
            <X size={21} />
          </button>
          {modal === "title" && (
            <>
              <span className="modal-icon">
                <AudioLines />
              </span>
              <h2>어떤 노래일까요?</h2>
              <p>제목을 맞혀도 남은 가사는 계속 풀 수 있어요.</p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (g.solve(title)) {
                    setModal(null);
                  } else
                    setTitleError("아직 정답이 아니에요. 다시 생각해 볼까요?");
                }}
              >
                <label htmlFor="title">노래 제목</label>
                <input
                  id="title"
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.nativeEvent.isComposing)
                      e.preventDefault();
                  }}
                  placeholder="제목을 입력하세요"
                  maxLength={80}
                />
                <p className="error" role="status">
                  {titleError}
                </p>
                <button className="primary" disabled={!title.trim()}>
                  정답 확인 <ArrowRight size={18} />
                </button>
              </form>
            </>
          )}
          {modal === "settings" && (
            <>
              <span className="modal-icon">
                <Headphones />
              </span>
              <h2>어떤 노래를 만나볼까요?</h2>
              <p>
                여러 유닛을 함께 선택할 수 있어요.
                <br />
                다음 문제부터 적용돼요.
              </p>
              <div className="unit-options">
                <button
                  className={g.selected.length === units.length ? "chosen" : ""}
                  onClick={() => g.select(units)}
                >
                  NCT 전체{" "}
                  {g.selected.length === units.length && <Check size={16} />}
                </button>
                {units.map((u) => (
                  <button
                    key={u}
                    aria-pressed={g.selected.includes(u)}
                    className={g.selected.includes(u) ? "chosen" : ""}
                    onClick={() =>
                      g.select(
                        g.selected.includes(u)
                          ? g.selected.filter((v) => v !== u)
                          : [...g.selected, u],
                      )
                    }
                  >
                    {u}
                    {g.selected.includes(u) && <Check size={16} />}
                  </button>
                ))}
              </div>
              <p className="sample-note">
                {songs.length}곡 · {questions.length}문제 중{" "}
                {questions.filter((q) => g.selected.includes(q.unit)).length}
                문제가 선택됐어요.
              </p>
              <fieldset className="theme-settings">
                <legend>화면 모드</legend>
                <div className="theme-options">
                  {([["system", "시스템"], ["light", "라이트"], ["dark", "다크"]] as [Theme, string][]).map(([value, label]) => (
                    <label key={value} className={theme === value ? "selected" : ""}>
                      <input type="radio" name="theme" value={value} checked={theme === value} onChange={() => setTheme(value)} />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <button className="primary" onClick={() => setModal(null)}>
                이어서 플레이
              </button>
            </>
          )}
          {modal === "help" && (
            <>
              <span className="modal-icon">
                <Lightbulb />
              </span>
              <h2>기억나는 단어부터, 하나씩.</h2>
              <ol className="instructions">
                <li>
                  <b>초성 가사를 살펴보세요</b>
                  <p>영어도 한글 발음의 초성으로 표시돼요.</p>
                </li>
                <li>
                  <b>단어를 입력해 가사를 열어요</b>
                  <p>
                    입력한 말에서 연속 두 글자 이상 맞는 부분만 열려요. 한 글자는 독립된 단어이거나, 일부가 이미 공개된 단어에서 인정해요.
                    영어는 원래 철자나 한글 발음으로 입력해요.
                  </p>
                </li>
                <li>
                  <b>제목을 맞히고 계속 즐겨요</b>
                  <p>
                    바로 다음 문제로 가거나, 남은 초성을 끝까지 채울 수 있어요.
                  </p>
                </li>
              </ol>
              <div className="help-example">
                영어는 <b>원문</b>과 <b>등록된 한글 발음</b> 모두 인정해요.
                제목은 괄호 안의 영문 제목으로도 맞힐 수 있어요.
              </div>
              <button className="primary" onClick={() => setModal(null)}>
                알겠어요
              </button>
            </>
          )}
          {modal === "giveup" && (
            <>
              <span className="modal-icon">
                <Headphones />
              </span>
              <h2>정답을 확인할까요?</h2>
              <p>
                제목과 가사 전체가 공개되고,
                <br />
                연속 정답 기록이 초기화돼요.
              </p>
              <button
                className="primary"
                onClick={() => {
                  g.giveUp();
                  setModal(null);
                }}
              >
                정답 확인하기
              </button>
              <button className="secondary" onClick={() => setModal(null)}>
                조금 더 풀어볼게요
              </button>
            </>
          )}
          {modal === "reset" && (
            <>
              <h2>플레이 기록을 지울까요?</h2>
              <p>진행 중인 문제와 누적 기록이 초기화돼요.</p>
              <button
                className="primary"
                onClick={() => {
                  g.reset();
                  setModal(null);
                }}
              >
                기록 초기화
              </button>
              <button
                className="secondary"
                onClick={() => setModal("settings")}
              >
                취소
              </button>
            </>
          )}
        </div>
      </dialog>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<App />);

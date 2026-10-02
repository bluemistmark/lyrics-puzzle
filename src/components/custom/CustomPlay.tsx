import { useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  Check,
  ChevronRight,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { customQuestion, pageDone, pageRanges } from "../../custom";
import { useCustom, type CustomPuzzle } from "../../customStore";
import { progress } from "../../game";
import { blockComposingEnter } from "../../utils/ime";
import { Lyrics } from "../play/Lyrics";

type Props = { puzzle: CustomPuzzle; onBack: () => void };

export function CustomPlay({ puzzle, onBack }: Props) {
  const guess = useCustom((s) => s.guess);
  const hint = useCustom((s) => s.hint);
  const resetProgress = useCustom((s) => s.resetProgress);
  const [word, setWord] = useState("");
  const [notice, setNotice] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [page, setPage] = useState(0);
  const question = customQuestion(puzzle.id, puzzle.title, puzzle.lines);
  const { count, total } = progress(question, puzzle.revealed);
  const percent = Math.floor((count / total) * 100);
  const complete = count >= total;
  const ranges = pageRanges(puzzle.lines.length);
  const lastPage = ranges.length - 1;
  const done = pageDone(question, puzzle.revealed, ranges);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const { matched, gained } = guess(puzzle.id, word);
    setNotice(
      matched === 0
        ? "가사에 없는 단어예요."
        : gained === 0
          ? "이미 열린 글자예요."
          : `${gained}글자가 열렸어요!`,
    );
    setWord("");
  };
  const useHint = () => {
    // 지금 보는 쪽에서 아직 안 열린 단어 중 하나가 무작위로 열린다.
    setNotice(
      hint(puzzle.id, ranges[page])
        ? "이 쪽의 단어 하나를 열었어요."
        : "이 쪽에는 열 단어가 없어요.",
    );
  };

  return (
    <>
      <div className="custom-head">
        <button className="filter" onClick={onBack}>
          <ArrowLeft size={15} /> 목록
        </button>
        <h1>{puzzle.title}</h1>
      </div>
      <section className="puzzle-card" aria-label="초성 가사 퍼즐">
        <Lyrics
          question={question}
          revealed={puzzle.revealed}
          showAll={false}
          markEnglish={false}
          range={ranges[page]}
        />
        {lastPage > 0 && (
          <nav className="custom-pager" aria-label="가사 쪽 이동">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 0}
              aria-label="이전 쪽"
            >
              <ChevronLeft size={16} /> 이전
            </button>
            <span aria-live="polite">
              {page + 1} / {lastPage + 1}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === lastPage}
              aria-label="다음 쪽"
            >
              다음 <ChevronRight size={16} />
            </button>
            <ol className="custom-pages">
              {ranges.map((_, i) => (
                <li key={i}>
                  <button
                    className={done[i] ? "done" : ""}
                    aria-current={i === page ? "page" : undefined}
                    aria-label={`${i + 1}쪽${done[i] ? " (완성)" : ""}`}
                    onClick={() => setPage(i)}
                  >
                    {done[i] ? <Check size={13} /> : i + 1}
                  </button>
                </li>
              ))}
            </ol>
          </nav>
        )}
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
          <b>{percent}%</b>
        </div>
      </section>
      {complete && (
        <p className="custom-done" role="status">
          전부 맞혔어요! 힌트 {puzzle.hints}회
        </p>
      )}
      <form className="word-form" onSubmit={submit}>
        <div className="input-wrap">
          <input
            value={word}
            onChange={(e) => setWord(e.target.value)}
            onKeyDown={blockComposingEnter}
            placeholder="가사에 나올 단어"
            autoComplete="off"
            maxLength={60}
            disabled={complete}
          />
          <button
            type="submit"
            aria-label="단어 확인"
            disabled={!word.trim() || complete}
          >
            <ArrowRight size={23} />
          </button>
        </div>
      </form>
      <div className="feedback" role="status">
        {notice}
      </div>
      <div className="hints">
        <button disabled={complete || done[page]} onClick={useHint}>
          <Sparkles size={14} /> 단어 공개 · 사용 {puzzle.hints}회
        </button>
        {confirming ? (
          <button
            onClick={() => {
              resetProgress(puzzle.id);
              setConfirming(false);
              setNotice("");
            }}
          >
            진행이 지워져요. 초기화
          </button>
        ) : (
          <button
            disabled={!puzzle.revealed.length}
            onClick={() => setConfirming(true)}
          >
            <RotateCcw size={14} /> 처음부터
          </button>
        )}
      </div>
    </>
  );
}

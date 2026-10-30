import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowRight,
  AudioLines,
  CalendarDays,
  Mic2,
  Palette,
  Sparkles,
} from "../icons";
import { matches, progress } from "../../game";
import {
  markTutorialDone,
  TUTORIAL_WORD,
  tutorialQuestion,
} from "../../tutorial";
import { blockComposingEnter } from "../../utils/ime";
import { Lyrics } from "../play/Lyrics";

type Props = {
  /** Closes without starting (건너뛰기, Esc). */
  onClose: () => void;
  /** Last step's button: go to the 플레이 tab. */
  onStart: () => void;
};

const question = tutorialQuestion();

/** First-visit walkthrough: try the real matching rules on a made-up lyric, then the basics. */
export function TutorialModal({ onClose, onStart }: Props) {
  const [step, setStep] = useState(0);
  const [revealed, setRevealed] = useState<string[]>([]);
  const [word, setWord] = useState("");
  const [feedback, setFeedback] = useState("");
  // Opening it once is enough; it stays available from 게임 방법.
  useEffect(markTutorialDone, []);

  const { count, total } = progress(question, revealed);
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const found = matches(question, word, revealed);
    const gained = found.filter((k) => !revealed.includes(k)).length;
    setRevealed([...new Set([...revealed, ...found])]);
    setFeedback(
      !found.length
        ? revealed.length
          ? "가사에 없는 단어예요. 다른 단어도 넣어 보세요."
          : `가사에 없는 단어예요. '${TUTORIAL_WORD}'를 넣어 보세요.`
        : gained
          ? `${gained}글자가 열렸어요!`
          : "이미 열린 글자예요.",
    );
    setWord("");
  };

  return (
    <>
      {/* Where in the three steps: the current dot is long. */}
      <div className="step-dots" role="status" aria-label={`${step + 1} / 3`}>
        {[0, 1, 2].map((i) => (
          <i key={i} className={i === step ? "current" : undefined} />
        ))}
      </div>
      {step === 0 && (
        <>
          <h2>가사 초성을 풀어 보세요</h2>
          <p>
            노래 가사가 초성으로 숨겨져 있어요. 떠오르는 단어를 넣으면 맞는
            글자가 열려요. <b>&lsquo;{TUTORIAL_WORD}&rsquo;</b>를 넣어 보세요.
          </p>
          <div className="tutorial-card">
            <Lyrics
              question={question}
              revealed={revealed}
              showAll={false}
              markEnglish={false}
            />
          </div>
          <form className="word-form" onSubmit={submit}>
            <div className="input-wrap">
              <input
                value={word}
                onChange={(e) => setWord(e.target.value)}
                onKeyDown={blockComposingEnter}
                placeholder={`예: ${TUTORIAL_WORD}`}
                aria-label="연습 단어 입력"
                autoComplete="off"
                maxLength={60}
              />
              <button
                type="submit"
                aria-label="단어 확인"
                disabled={!word.trim()}
              >
                <ArrowRight size={23} />
              </button>
            </div>
          </form>
          <p className="feedback" role="status">
            {count >= total
              ? "전부 맞혔어요! 이제 실제 문제를 풀어 볼까요?"
              : feedback}
          </p>
          {revealed.length > 0 && (
            <p className="feedback">
              두 글자 이상 이어서 맞아야 열려요. 한 글자는 그 글자만으로 된
              단어이거나, 이미 일부가 열린 단어일 때만 인정돼요. 가사 속 영어는
              원문과 한글 발음 모두 인정돼요.
            </p>
          )}
        </>
      )}
      {step === 1 && (
        <>
          <h2>제목을 맞히면 정답</h2>
          <ul className="tutorial-list">
            <li>
              <AudioLines size={18} aria-hidden="true" />
              <span>
                <b>제목 맞히기</b> 노래가 떠오르면 언제든 제목을 입력하세요.
                맞힌 뒤에도 가사는 계속 풀 수 있어요.
              </span>
            </li>
            <li>
              <Sparkles size={18} aria-hidden="true" />
              <span>
                <b>힌트</b> 막히면 단어 하나를 열거나, 영어 구간을 표시할 수
                있어요.
              </span>
            </li>
            <li>
              <Mic2 size={18} aria-hidden="true" />
              <span>
                <b>가수 힌트</b> 어느 유닛의 노래인지 볼 수 있어요.
              </span>
            </li>
          </ul>
        </>
      )}
      {step === 2 && (
        <>
          <h2>이것도 해 보세요</h2>
          <ul className="tutorial-list">
            <li>
              <CalendarDays size={18} aria-hidden="true" />
              <span>
                <b>데일리 퀴즈</b> 매일 자정에 모두에게 같은 문제가 열려요.
                랭킹에서 다른 팬과 기록을 겨뤄 보세요.
              </span>
            </li>
            <li>
              <Palette size={18} aria-hidden="true" />
              <span>
                <b>테마와 글자 크기</b> 오른쪽 위 설정의 화면 탭에서 바꿀 수
                있어요.
              </span>
            </li>
          </ul>
          <p className="feedback">
            이 안내는 설정 › 정보 › 게임 방법에서 다시 볼 수 있어요.
          </p>
        </>
      )}
      <div className="bottom-actions tutorial-actions">
        {step < 2 ? (
          <>
            <button className="skip" onClick={onClose}>
              건너뛰기
            </button>
            <button className="primary" onClick={() => setStep(step + 1)}>
              다음 <ArrowRight size={18} />
            </button>
          </>
        ) : (
          <button className="primary" onClick={onStart}>
            첫 문제 풀러 가기 <ArrowRight size={18} />
          </button>
        )}
      </div>
    </>
  );
}

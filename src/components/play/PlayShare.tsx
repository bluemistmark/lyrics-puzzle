import type { Question } from "../../game";
import type { PlayMode } from "../../modes";
import { playResultText, questionLink, shareGrid } from "../../share";
import type { Round } from "../../store";
import { ShareActions } from "./ShareActions";

type Props = {
  question: Question;
  round: Round;
  percent: number;
  playMode: PlayMode;
};

/** Share a finished play-tab question: text + spoiler-free card image + a link to the same question. */
export function PlayShare({ question, round, percent, playMode }: Props) {
  const text = playResultText({
    mode: playMode,
    solved: round.solved,
    givenUp: round.givenUp,
    percent,
    guesses: round.words.length,
    hints: round.hints,
  });
  return (
    <div className="share-results play-share">
      <h2>결과 공유</h2>
      <p>
        제목과 가사는 공유되지 않아요. 링크를 받은 사람은 같은 문제를 풀어요.
      </p>
      <ShareActions
        text={text}
        link={questionLink(window.location.href, question.id, playMode)}
        grid={
          playMode === "simple" ? null : shareGrid(question, round.revealed)
        }
      />
    </div>
  );
}

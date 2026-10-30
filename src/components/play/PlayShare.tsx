import { guessCount, type Question } from "../../game";
import type { PlayMode } from "../../modes";
import { playResultText, questionLink, shareGrid } from "../../share";
import { drawShareCard } from "../../share-image";
import type { Round } from "../../store";
import { ShareActions } from "./ShareActions";

type Props = {
  question: Question;
  round: Round;
  percent: number;
  playMode: PlayMode;
};

/** Share buttons for a finished play-tab question (in ShareModal): text + spoiler-free card image + a link to the same question. */
export function PlayShare({ question, round, percent, playMode }: Props) {
  const text = playResultText({
    mode: playMode,
    solved: round.solved,
    givenUp: round.givenUp,
    percent,
    guesses: guessCount(round.words),
    hints: round.hints,
  });
  return (
    <ShareActions
      text={text}
      link={questionLink(window.location.href, question.id, playMode)}
      draw={() =>
        drawShareCard(
          playMode === "simple" ? null : shareGrid(question, round.revealed),
          text.split("\n"),
        )
      }
    />
  );
}

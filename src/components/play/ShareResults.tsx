import { dailyResultText } from "../../daily";
import type { Question } from "../../game";
import { shareGrid } from "../../share";
import { drawShareCard } from "../../share-image";
import type { Round } from "../../store";
import { ShareActions } from "./ShareActions";

type Props = {
  date: string;
  question: Question;
  round: Round;
  percent: number;
  streak: number;
};

export function ShareResults({
  date,
  question,
  round,
  percent,
  streak,
}: Props) {
  const result = dailyResultText({
    date,
    solved: round.solved,
    givenUp: round.givenUp,
    percent,
    guesses: round.words.length,
    hints: round.hints,
    streak,
  });
  const link = new URL(window.location.href);
  link.search = "";
  link.searchParams.set("today", "1");
  link.hash = "";
  // The card's last line: the streak when there is one, otherwise an invitation.
  const [heading, outcome, stats, extra] = result.split("\n");
  const cardText = [
    heading,
    outcome,
    stats,
    extra ?? "데일리 퀴즈에 도전해 보세요!",
  ].join("\n");

  return (
    <div className="share-results">
      <h2>데일리 결과</h2>
      <pre>{`${cardText}\n${link.href}`}</pre>
      <ShareActions
        text={cardText}
        link={link.href}
        draw={() =>
          drawShareCard(
            shareGrid(question, round.revealed),
            cardText.split("\n"),
          )
        }
      />
    </div>
  );
}

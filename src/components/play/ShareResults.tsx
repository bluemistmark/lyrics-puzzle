import { dailyResultText } from "../../daily";
import type { Question } from "../../game";
import { shareGrid } from "../../share";
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
    extra ?? "오늘의 문제에 도전해 보세요!",
  ].join("\n");

  return (
    <div className="share-results">
      <h2>오늘의 결과</h2>
      <pre>{`${cardText}\n${link.href}`}</pre>
      <ShareActions
        text={cardText}
        link={link.href}
        grid={shareGrid(question, round.revealed)}
      />
    </div>
  );
}

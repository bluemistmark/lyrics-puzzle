import { Check, Headphones } from "../icons";
import type { Question } from "../../game";
import type { PlayMode } from "../../modes";
import type { Round } from "../../store";
import { DifficultyVote } from "./DifficultyVote";
import { SongPrefVote } from "./SongPrefVote";

type Props = {
  question: Question;
  round: Round;
  daily?: boolean;
  playMode?: PlayMode;
};

export function ResultBox({
  question,
  round,
  daily = false,
  playMode = "classic",
}: Props) {
  const answered = round.solved || round.givenUp;
  return (
    <div className="success-box">
      <span className="success-icon">
        {round.givenUp ? <Headphones size={22} /> : <Check size={22} />}
      </span>
      <div>
        <strong>{answered ? question.title : "가사 완성"}</strong>
        {answered && <p>{question.unit}</p>}
        {/* Only classic answers count, so the other modes don't skew 체감 난이도. */}
        {answered && playMode === "classic" && (
          <>
            <DifficultyVote
              questionId={question.id}
              solved={round.solved}
              daily={daily}
            />
            <SongPrefVote songId={question.songId} />
          </>
        )}
      </div>
    </div>
  );
}

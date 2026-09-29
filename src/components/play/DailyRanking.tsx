import { useEffect, useState } from "react";
import { RotateCw, Trophy } from "lucide-react";
import type { DailyResult } from "../../daily";
import { useRanking, type RankingBoard } from "../../ranking";
import type { ModalName } from "../Modal";

type Props = {
  date: string;
  /** Today's finished result; submitted once, then the board is shown. */
  result: DailyResult | undefined;
  onOpenModal: (name: ModalName) => void;
};

type View = { board?: RankingBoard; error?: string };

export function DailyRanking({ date, result, onOpenModal }: Props) {
  const submit = useRanking((s) => s.submit);
  const load = useRanking((s) => s.load);
  const nickname = useRanking((s) => s.nickname);
  const version = useRanking((s) => s.version);
  const [view, setView] = useState<View>({});
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true;
    (async () => {
      let error: string | undefined;
      if (result)
        await submit({ date, ...result }).catch((e: Error) => {
          error = `결과를 랭킹에 등록하지 못했어요. ${e.message}`;
        });
      try {
        const board = await load(date);
        if (live) setView({ board, error });
      } catch (e) {
        if (live) setView((v) => ({ ...v, error: (e as Error).message }));
      }
    })();
    return () => {
      live = false;
    };
  }, [date, result, submit, load, version, retry]);

  const { board, error } = view;
  return (
    <section className="share-results daily-ranking" aria-live="polite">
      <h2>
        <Trophy size={17} aria-hidden="true" /> 오늘의 랭킹
      </h2>
      {board && (
        <p>
          참여 {board.participants}명 · 정답 {board.solved}명
        </p>
      )}
      {error && (
        <div className="ranking-error">
          <p role="status">{error}</p>
          <button type="button" onClick={() => setRetry((n) => n + 1)}>
            <RotateCw size={14} /> 다시 시도
          </button>
        </div>
      )}
      {!board && !error && <p>랭킹을 불러오는 중…</p>}
      {board && (
        <>
          <p className="ranking-me">
            {board.me ? (
              <>
                내 순위 <b>{board.me.rank}위</b>
              </>
            ) : result?.solved && !nickname ? (
              <button type="button" onClick={() => onOpenModal("nickname")}>
                닉네임을 등록하고 순위 보기
              </button>
            ) : result && !result.solved ? (
              "포기한 날은 순위에 오르지 않아요."
            ) : null}
          </p>
          {board.entries.length ? (
            <ol className="ranking-list">
              {board.entries.map((entry) => (
                <li key={entry.rank} className={entry.me ? "me" : undefined}>
                  <span className="ranking-rank">{entry.rank}</span>
                  <span className="ranking-name">{entry.nickname}</span>
                  <span className="ranking-score">
                    힌트 {entry.hints} · 단어 {entry.guesses}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p>아직 순위에 오른 사람이 없어요.</p>
          )}
          <p className="ranking-rule">
            힌트를 적게 쓴 순, 같으면 입력한 단어가 적은 순, 그래도 같으면 먼저
            맞힌 순이에요.
          </p>
        </>
      )}
    </section>
  );
}

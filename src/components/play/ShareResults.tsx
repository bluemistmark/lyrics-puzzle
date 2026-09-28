import { useState } from "react";
import { Copy, Share2 } from "lucide-react";
import { dailyResultText } from "../../daily";
import type { Round } from "../../store";

type Props = { date: string; round: Round; percent: number };

export function ShareResults({ date, round, percent }: Props) {
  const [status, setStatus] = useState("");
  const result = dailyResultText({
    date,
    solved: round.solved,
    givenUp: round.givenUp,
    percent,
    guesses: round.words.length,
    hints: round.hints,
  });
  const link = new URL(window.location.href);
  link.searchParams.set("today", "1");
  link.hash = "";
  const shareText = `${result}\n${link.href}`;
  const xLink = new URL("https://x.com/intent/tweet");
  xLink.searchParams.set("text", result);
  xLink.searchParams.set("url", link.href);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setStatus("결과를 복사했어요!");
    } catch {
      setStatus("자동 복사가 안 돼요. 아래 결과를 직접 복사해 주세요.");
    }
  };
  const share = async () => {
    try {
      await navigator.share({ text: result, url: link.href });
      setStatus("공유 창을 열었어요.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setStatus("공유 창을 열 수 없어요. 결과 복사를 이용해 주세요.");
    }
  };

  return (
    <div className="share-results">
      <h2>오늘의 결과</h2>
      <p>정답은 가리고 기록만 공유해요.</p>
      <pre>{shareText}</pre>
      <div className="share-actions">
        <button type="button" onClick={copy}>
          <Copy size={16} /> 결과 복사
        </button>
        <a href={xLink.href} target="_blank" rel="noopener noreferrer">
          X에 공유
        </a>
        {typeof navigator.share === "function" && (
          <button type="button" onClick={share}>
            <Share2 size={16} /> 앱으로 공유
          </button>
        )}
      </div>
      <p className="share-status" role="status">
        {status ||
          "기기에 카카오톡이 공유 대상으로 표시되면 공유 창에서 선택할 수 있어요."}
      </p>
    </div>
  );
}

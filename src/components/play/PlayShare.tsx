import { useState } from "react";
import { Copy, Image as ImageIcon, Share2 } from "lucide-react";
import type { Question } from "../../game";
import type { PlayMode } from "../../modes";
import { playResultText, questionLink, shareGrid } from "../../share";
import { drawShareCard } from "../../share-image";
import type { Round } from "../../store";

type Props = {
  question: Question;
  round: Round;
  percent: number;
  playMode: PlayMode;
};

/** Share a finished play-tab question: text + spoiler-free card image + a link to the same question. */
export function PlayShare({ question, round, percent, playMode }: Props) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const text = playResultText({
    mode: playMode,
    solved: round.solved,
    givenUp: round.givenUp,
    percent,
    guesses: round.words.length,
    hints: round.hints,
  });
  const link = questionLink(window.location.href, question.id, playMode);
  const xLink = new URL("https://x.com/intent/tweet");
  xLink.searchParams.set("text", text);
  xLink.searchParams.set("url", link);

  const image = async () => {
    const blob = await drawShareCard(
      playMode === "simple" ? null : shareGrid(question, round.revealed),
      text.split("\n"),
    );
    return new File([blob], "neo-song-quiz.png", { type: "image/png" });
  };

  // Phones: the share sheet takes the image, so posting to X attaches it as a photo.
  // Elsewhere: save the image and open X so the player can attach it themselves.
  const shareImage = async () => {
    setBusy(true);
    setStatus("");
    try {
      const file = await image();
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: `${text}\n${link}` });
        setStatus("공유 창을 열었어요.");
        return;
      }
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      window.open(xLink.href, "_blank", "noopener,noreferrer");
      setStatus("결과 이미지를 저장했어요. X 글쓰기 창에 첨부해 주세요.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setStatus("이미지를 공유할 수 없어요. 결과 복사를 이용해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${text}\n${link}`);
      setStatus("결과와 링크를 복사했어요.");
    } catch {
      setStatus("복사할 수 없어요.");
    }
  };

  return (
    <div className="share-results play-share">
      <h2>결과 공유</h2>
      <p>
        제목과 가사는 공유되지 않아요. 링크를 받은 사람은 같은 문제를 풀어요.
      </p>
      <div className="share-actions">
        <button type="button" onClick={shareImage} disabled={busy}>
          {typeof navigator.share === "function" ? (
            <Share2 size={16} />
          ) : (
            <ImageIcon size={16} />
          )}
          이미지로 공유
        </button>
        <a href={xLink.href} target="_blank" rel="noopener noreferrer">
          X에 공유
        </a>
        <button type="button" onClick={copy}>
          <Copy size={16} /> 결과 복사
        </button>
      </div>
      {status && (
        <p className="share-status" role="status">
          {status}
        </p>
      )}
    </div>
  );
}

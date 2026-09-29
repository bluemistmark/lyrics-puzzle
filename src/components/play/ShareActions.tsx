import { useState } from "react";
import { Copy, Image as ImageIcon, Share2 } from "lucide-react";
type Props = {
  /** Spoiler-free text for X and the clipboard. */
  text: string;
  link: string;
  /** Draws the card image (share-image.ts) when the player asks for it. */
  draw: () => Promise<Blob>;
};

/** 이미지로 공유 · X에 공유 · 결과 복사, shared by the play, daily and record tabs. */
export function ShareActions({ text, link, draw }: Props) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const xLink = new URL("https://x.com/intent/tweet");
  xLink.searchParams.set("text", text);
  xLink.searchParams.set("url", link);

  // Phones: the share sheet takes the image, so posting to X attaches it as a photo.
  // Elsewhere (X's web intent can't take images): save the image and open X to attach it.
  const shareImage = async () => {
    setBusy(true);
    setStatus("");
    try {
      const blob = await draw();
      const file = new File([blob], "neo-song-quiz.png", { type: "image/png" });
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
      setStatus("복사할 수 없어요. 위 내용을 직접 선택해 주세요.");
    }
  };

  return (
    <>
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
    </>
  );
}

import { Ellipsis, Share2 } from "../icons";

type Props = { onShare: () => void; onMenu: () => void };

/** 결과 공유 and the ⋯ menu (포기 · 오류 제보) at the top of the play and daily screens. */
export function QuestionActions({ onShare, onMenu }: Props) {
  return (
    <div className="question-actions">
      <button
        type="button"
        className="filter"
        aria-label="결과 공유"
        title="결과 공유"
        onClick={onShare}
      >
        <Share2 size={16} aria-hidden="true" />
      </button>
      <button
        type="button"
        className="filter"
        aria-label="포기·오류 제보 메뉴"
        title="더 보기"
        onClick={onMenu}
      >
        <Ellipsis size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

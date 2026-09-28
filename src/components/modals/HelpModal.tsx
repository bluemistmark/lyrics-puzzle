import { Lightbulb } from "lucide-react";

export function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <>
      <span className="modal-icon">
        <Lightbulb />
      </span>
      <h2>기억나는 단어부터, 하나씩.</h2>
      <ol className="instructions">
        <li>
          <b>초성 가사를 살펴보세요</b>
          <p>영어도 한글 발음의 초성으로 표시돼요.</p>
        </li>
        <li>
          <b>단어를 입력해 가사를 열어요</b>
          <p>
            입력한 말에서 연속 두 글자 이상 맞는 부분만 열려요. 한 글자는 독립된
            단어이거나, 일부가 이미 공개된 단어에서 인정해요. 영어는 원래 철자나
            한글 발음으로 입력해요.
          </p>
        </li>
        <li>
          <b>제목을 맞히고 계속 즐겨요</b>
          <p>바로 다음 문제로 가거나, 남은 초성을 끝까지 채울 수 있어요.</p>
        </li>
        <li>
          <b>오늘의 문제에 도전해요</b>
          <p>
            한국 시간으로 매일 새 문제가 열리고, 결과는 정답을 가려 공유해요.
          </p>
        </li>
      </ol>
      <div className="help-example">
        영어는 <b>원문</b>과 <b>등록된 한글 발음</b> 모두 인정해요. 제목은 괄호
        안의 영문 제목으로도 맞힐 수 있어요.
      </div>
      <button className="primary" onClick={onClose}>
        알겠어요
      </button>
    </>
  );
}

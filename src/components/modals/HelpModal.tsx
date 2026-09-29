import { Lightbulb } from "lucide-react";

export function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <>
      <span className="modal-icon">
        <Lightbulb />
      </span>
      <h2>게임 방법</h2>
      <ol className="instructions">
        <li>
          <b>초성 확인</b>
          <p>가사가 초성으로 표시됩니다. 영어는 한글 발음 기준입니다.</p>
        </li>
        <li>
          <b>단어 입력</b>
          <p>
            연속 두 글자 이상 일치하면 해당 가사가 공개됩니다. 한 글자는 독립된
            단어이거나 일부가 이미 공개된 단어에서만 인정됩니다.
          </p>
        </li>
        <li>
          <b>제목 맞히기</b>
          <p>
            언제든 제목을 입력할 수 있습니다. 정답을 맞힌 뒤에도 가사를 계속 풀
            수 있습니다.
          </p>
        </li>
        <li>
          <b>플레이 모드</b>
          <p>
            심플 모드는 가사를 모두 보고 제목을, 이지 모드는 제목과 가수를 보고
            가사를 맞힙니다. 기록·도감·업적은 클래식 모드에서만 쌓입니다.
          </p>
        </li>
        <li>
          <b>오늘의 문제</b>
          <p>
            한국 시간 자정에 새 문제가 열립니다. 공유 결과에는 정답이 포함되지
            않습니다.
          </p>
        </li>
      </ol>
      <div className="help-example">
        영어는 <b>원문</b>과 <b>등록된 한글 발음</b> 모두 인정됩니다. 제목은
        괄호 안의 영문 제목도 사용할 수 있습니다.
      </div>
      <button className="primary" onClick={onClose}>
        확인
      </button>
    </>
  );
}

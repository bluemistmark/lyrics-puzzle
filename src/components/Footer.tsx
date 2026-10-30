// Rights and data-collection notices, shown in the account modal. The wording is a
// draft and should be reviewed (legal/privacy) before relying on it.
export function Footer() {
  return (
    <footer className="site-footer">
      <p>
        가사와 앨범아트의 저작권은 각 곡의 작사가와 권리자에게 있습니다.
        앨범아트는 Deezer·iTunes 검색으로 찾았어요.
      </p>
      <p>
        쿠키 없는 익명 방문 통계와, 랭킹·업적 달성률·난이도 응답·오류 제보용
        익명 ID·닉네임·풀이 결과·달성한 업적·제보 내용을, 로그인하면 계정 정보와
        기록을 저장해요. <a href="/privacy.html">개인정보 처리방침</a>
      </p>
    </footer>
  );
}

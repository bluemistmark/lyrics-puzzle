# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 개요

네오 노래 퀴즈(가사 초성 퍼즐, React 19 · TypeScript · Vite · Zustand, 모바일 대상). 게임은 번들된 데이터로만 동작(네트워크 없음. 예외는 오늘의 랭킹, 체감 난이도 응답, 오류 제보, 선택 로그인, 방문 통계(Vercel Web Analytics)뿐이며 실패해도 게임은 동작해야 함)하고, 데이터는 Supabase에 두고 어드민(`/admin`)에서 관리한다. Vercel에 `dist/`로 배포된다.

## 명령어

- `npm run dev` — Vite 개발 서버 (127.0.0.1). 게임 `/`, 어드민 `/admin.html` (`/admin` 리라이트는 Vercel에서만). `/api/publish`는 로컬에서 동작하지 않음
- `npm test` — Node 내장 test runner + `--experimental-strip-types`로 `package.json`에 나열된 테스트 파일을 직접 실행 (빌드/번들러 없음). 새 테스트 파일은 이 목록에 추가해야 실행된다
- 단일 테스트: `node --experimental-strip-types --test --test-isolation=none --test-name-pattern="제목 정답" src/store.test.ts`
- `npm run build` — `tsc --noEmit` 타입 체크 후 `vite build`
- `npm run lint` / `npm run lint:fix` — ESLint (flat config `eslint.config.js`: typescript-eslint recommended + react-hooks recommended + eslint-config-prettier)
- `npm run format` / `npm run format:check` — Prettier (기본 설정). `src/catalog.ts`, `data/`, `package-lock.json`은 포맷·린트 대상에서 제외
- `npm run data:pull` — Supabase → 검증 → `src/catalog.ts` 생성. 검증 실패 시 파일을 쓰지 않고 exit 1. `.env.local`의 `SUPABASE_SERVICE_ROLE_KEY` 필요
- `npm run data:seed [-- --dry-run | --overwrite]` — 일회성 마이그레이션: `data/*.csv`(구 구글 시트 스냅샷) → Supabase. `--dry-run`은 네트워크 없이 CSV 검증만 한다

코드 변경 후에는 `npm run format`, `npm run lint`, `npm test`, `npm run build`를 실행한다.

## 아키텍처

데이터 흐름: Supabase(`songs`, `questions`, `dictionary`) → `scripts/pull-catalog.ts` → `src/data/build-catalog.ts`(검증 + 변환) → `src/catalog.ts`(생성 파일) → `src/game.ts` → `src/store.ts` → `src/App.tsx`.

게시 흐름: 어드민 게시 버튼 → `api/publish.ts`(Supabase 세션이 `admins`에 있는지 확인) → Vercel Deploy Hook → `vercel.json`의 `buildCommand`(`data:pull && npm test && npm run build`). 검증·테스트 실패 시 배포되지 않아 이전 버전이 유지된다. 즉 **테스트는 실제 DB 데이터에 대한 게시 게이트**이기도 하다.

- **`src/catalog.ts`는 생성 파일**이다. 직접 수정하지 않는다. 저장소 사본은 로컬 개발·테스트용 스냅샷이고, 배포 빌드는 매번 DB에서 새로 만든다.
- **`src/data/english.ts`** — 영어 사전 매칭의 유일한 구현(`englishKey`, `entryAt`, `scanLine`). 게임 `tokenize`, 빌드 검증, 어드민 미리보기가 모두 이것을 쓰므로 "게시 검증 통과 = 게임에서 throw하지 않음"이 보장된다. 긴 항목 우선, 앞뒤가 라틴 문자면 불일치. `entryAt`은 길이별 인덱스(WeakMap 캐시)를 쓰므로 `sortDictionary` 결과 배열을 변경하지 말 것.
- **`src/data/build-catalog.ts`** — `buildCatalog(rows)` → `{ catalog, issues }`. 필수값, ID 중복, 없는 곡, 가수 목록에 없는 가수, 잘못된·중복 접두어, 같은 가수/곡명의 다른 ID, 발음 충돌, 사용 중 문제의 사전 미등록 영어를 `issues`로 모은다. 사용 중인 문제만, 그리고 그런 문제가 있는 곡만 게시하고, 곡 순서는 `compareSongs`(가수 `sort_order` → 곡 `sort_order` → id)로 정한다. 게임의 `units`는 곡 순서에서 나오므로 **가수 순서 = 유닛 표시 순서**다. 어드민 목록도 같은 비교 함수를 쓴다. 같은 발음의 중복 사전 항목은 대체발음을 합친다.
- **`src/data/rows.ts`** — 데이터 테이블(artists, songs, questions, dictionary) 전체와 최근 releases를 1000행 단위로 읽는다. 스크립트(service role)와 어드민(anon + 로그인 세션)이 공유한다.
- **DB 스키마·권한**: `supabase/migrations/*.sql`(이름 순서대로 적용). `artists.name`이 PK이고 `songs.artist`가 이를 참조한다(`on update cascade`, `on delete restrict`). 그래서 가수 이름 변경은 PK update이고, 어드민 store의 `saveArtist`가 로컬 songs도 같이 바꾼다. RLS로 `admins` 테이블에 이메일이 있는 로그인 사용자만 읽고 쓴다. anon은 접근 불가. 빌드·게시 API는 service role 키로 RLS를 우회한다. 스키마를 바꾸면 새 마이그레이션 파일을 추가하고 `build-catalog.ts`의 Row 타입과 `rows.ts`의 컬럼 목록을 함께 고친다.
- **`game.ts`** — 순수 게임 로직. 모듈 로드 시점에 모든 문제를 `tokenize`한다. `tokenize(line, sorted?)`의 두 번째 인자는 사전이므로 `lines.map(tokenize)`처럼 넘기면 안 된다.
- **공개 키 형식**: `"${줄}:${토큰}:${글자인덱스}"` (한글), `"${줄}:${토큰}:en"` (영어 토큰 전체). `matches`, `allKeys`, `progress`, 스토어의 `revealed`, 힌트 로직이 모두 이 형식에 의존한다. 공백·문장부호 토큰은 키가 없어 완성률에서 제외된다.
- `matches` 규칙: 영어는 원문/표시발음/대체발음과 전체 일치해야 공개. 한글은 입력과 토큰 사이 연속 2글자 이상 공통 부분을 공개하고, 1글자 입력은 토큰 전체가 그 글자이거나 해당 토큰이 이미 일부 공개된 경우에만 인정.
- `pickQuestion`: 선택 유닛 안에서 `seen`에 없는 문제 우선, 가능하면 직전과 다른 곡. 풀을 한 바퀴 돌면 `store.next`가 `seen`을 리셋.
- **`store.ts`** — Zustand + `persist`. localStorage 키 `chosung-lyrics-live-v1` (`notice`는 저장 제외). `merge`는 저장된 `round.id`가 현재 catalog에 없으면 저장값을 버리고, 없어진 유닛은 `selected`에서 걸러낸다. 모듈 하단에서 첫 문제를 즉시 저장해 새로고침해도 같은 문제가 유지되게 한다. 예전 키 `chosung-lyrics-v1`은 삭제하지 말고 보존한다. 플레이 탭은 `playMode`(`src/modes.ts`: `classic`·`simple`(가사 공개, 제목만 맞힘)·`easy`(제목·가수 공개, 가사를 다 채우면 `solved`))를 고를 수 있다. 클래식은 기존 최상위 `round`/`seen`을, 나머지는 `modes[모드]`를 쓰고 `playRound(s)`가 현재 모드의 문제를 준다. 통계·잔디·도감·업적 카운터·체감 난이도는 클래식(과 오늘의 문제)에서만 쌓이고, 오늘의 문제는 항상 클래식 규칙이다(`GameMode` "play"/"daily"는 탭 구분이라 `PlayMode`와 다름). `collected`(곡 도감)는 클래식과 오늘의 문제에서 제목을 맞힌 문제 ID 목록이고, 화면용 집계는 순수 함수 `src/collection.ts`의 `buildCollection`이 한다. `dailyHistory`는 날짜별 오늘의 문제 첫 종료 결과(정답·포기)이고, 연속 정답·평균 입력 수는 `daily.ts`의 `dailySummary`가 계산한다. 오늘의 문제는 다시 풀 수 없으므로 `reset`해도 오늘 결과는 남긴다. `playLog`는 일반 모드에서 끝낸(제목 정답·포기) 문제 수를 한국 날짜별로 센 것으로, 기록 탭 잔디(`src/calendar.ts`의 `calendarWeeks`·`playLevel`)에 쓴다. 업적은 `src/achievements.ts`(`achievementList`가 이 기록들과 업적 전용 카운터 `feats`(정답 순간의 입력 수·영어 힌트·풀이 시간(`Round.startedAt`)·새벽·같은 유닛 연속, `recordSolve`/`recordGiveUp`), 사용한 테마 `themes`, 그리고 랭킹 닉네임·난이도 응답 수로 진행도를 계산. 분류(`group`)와 숨은 업적(`hidden`)이 있고 유닛마다 도감 완성 업적 생성)이고, 스토어는 달성 날짜만 `achievements`에 남긴다(ID는 저장값이 참조하므로 바꾸지 말 것). 모든 액션의 `set`을 감싸 새로 달성한 업적을 `justUnlocked`(저장 제외)에 넣고 `AchievementToast`가 한 번에 묶어 보여 준다. 랭킹·난이도 스토어가 바뀌면 `store.ts` 하단의 구독이 `checkAchievements`로 다시 판정한다. 테마 목록은 React 없는 `src/themes.ts`에 있다. 저장값 복원(`merge`)과 `reset`은 알림 없이 조용히 다시 계산한다.
- **UI** — `main.tsx`는 마운트만 한다. `App.tsx`가 탭(`activeTab`)과 열린 모달(`ModalName`) 상태를 갖고 `components/` 아래를 조립한다.
  - `components/play/*`: 플레이 화면. `PlayPanel`이 `hooks/useRound`(현재 문제·진행률)를 한 번 호출해 하위에 props로 넘기고, 하위 컴포넌트는 스토어 액션만 `useGame((s) => s.xxx)` 셀렉터로 직접 가져온다. 데이터 표시 쪽은 props, 액션은 셀렉터라는 구분을 유지한다.
  - `components/modals/*`: 모달 내용만 담당하고, 공용 `components/Modal.tsx`가 네이티브 `<dialog>` 하나를 열고 닫는다. 모달은 열릴 때마다 새로 마운트되므로 입력 초안 같은 로컬 state는 닫으면 사라진다.
  - 문제별 로컬 state 초기화는 `key={round.id}`로 리마운트해서 처리한다(`WordForm` 참고).
  - `hooks/useModelContextTools`: `document.modelContext`가 있으면 WebMCP 도구(`guess_lyric_word`)를 등록한다.
  - 테마는 `theme.ts`(`lyrics-theme` 키, `data-theme` 속성)에서 관리하며, `useTheme`은 `App`에서만 호출하고 테마 모달(`ThemeModal`)에는 props로 넘긴다(여러 곳에서 호출하면 상태가 따로 논다).
  - 한글 IME 조합 중 Enter 제출 방지는 `utils/ime.ts`의 `blockComposingEnter`를 쓴다.
- **어드민** (`admin.html` → `src/admin/`) — 별도 Vite 엔트리(`vite.config.ts`)라 supabase-js는 어드민 번들에만 들어간다. 게임 코드(`src/components`, `game.ts` 등)에서 `src/admin/`을 import하지 말 것. supabase-js는 게임에서 `src/account/session.ts`에서만 쓰고, 그 파일은 `src/account/index.ts`가 동적 import로만 불러온다(정적으로 import하면 게임 번들에 들어감).
  - `admin/store.ts`(zustand)가 데이터 테이블 전체를 메모리에 들고, 각 액션은 Supabase에 먼저 쓰고 성공하면 로컬 상태를 갱신한다. 에러는 `describeError`로 한국어 메시지로 바꿔 throw한다.
  - `AdminApp`이 `buildCatalog`를 `useMemo`로 돌려 `issues`를 문제 탭·게시 탭에 넘긴다(빌드와 같은 검증).
  - 편집 폼은 `FormDialog`(마운트 시 열림, `onSubmit`에서 throw하면 에러 표시). 곡ID·문제ID·사전 영어(PK)는 생성 후 수정 불가로 두었다. 문제ID는 플레이어 localStorage 진행 기록이 참조한다.
  - 문제 대량 등록: `admin/bulk.ts`의 `parseBulkQuestions`(탭이 있으면 엑셀 행 모드, 아니면 빈 줄 구분)로 나누고 `BulkQuestionForm`이 미리보기(연속 ID, 줄 수 오류, 기존·입력 내 중복, 사전 누락)를 보여 준다. `addQuestions`는 한 번의 insert라 전부 저장되거나 전부 실패한다.
  - 게시·소식: `PublishTab`이 `draftRelease`(`src/data/releases.ts`)로 직전 release의 `song_ids`/`question_ids` 스냅샷과 현재 catalog를 비교해 새 곡·문제를 계산하고, 새 기능·메모와 함께 `/api/publish`에 보낸다. API는 release를 insert한 뒤 Deploy Hook을 호출하고, 훅이 실패하면 그 release를 지운다. 빌드(`pull-catalog`)는 `toNews`로 최근 소식을 `catalog.news`에 넣고, 게임은 `NewsPanel`로 보여 준다. 소식 확인 여부는 `hooks/useNewsSeen`(localStorage `lyrics-news-seen`). 어드민의 releases 로딩 실패는 치명적이지 않게(`releasesError`) 처리한다.
  - 환경 변수가 없으면 `supabase`가 `null`이고 설정 안내 화면만 보인다.
- **오늘의 랭킹** — `api/ranking.ts`(GET 조회·POST 결과 제출·PUT 닉네임, service role로 `players`/`daily_scores`와 `daily_ranking()` RPC 사용) ↔ `src/ranking.ts`(zustand persist `lyrics-ranking-v1`: 토큰·닉네임·제출한 날짜·닉네임 질문 여부). 플레이어 ID는 브라우저 토큰의 SHA-256이고 서버는 토큰을 저장하지 않는다. 제출값은 `dailyHistory[오늘]`(처음 끝낸 순간의 값)이고, `DailyRanking`이 오늘 탭에서 제출 후 조회한다. 첫 정답 뒤 닉네임 질문은 `App`의 `afterDailySolve`가 띄운다(effect 아님). 닉네임 규칙은 `src/nickname.ts`이고 `api/ranking.ts`가 복사해 쓰며 `api/ranking.test.ts`가 둘이 같은지 검사한다. 어드민 `RankingTab`은 supabase-js로 직접 읽고 `players.hidden`만 바꾼다(컬럼 권한으로 제한).
- **체감 난이도** — 문제를 끝내면 `ResultBox` 안의 `DifficultyVote`가 쉬워요/보통이에요/어려워요를 받는다. `src/difficulty.ts`(persist `lyrics-difficulty-v1`, 문제ID별 내 응답)가 로컬에 먼저 반영하고 `/api/difficulty`(`api/difficulty.ts`)에 보내며, 실패하면 되돌린다. 토큰은 `useRanking.getState().ensureToken()`을 공유하고 요청은 `ranking.ts`의 `requestJson`을 쓴다. DB는 `difficulty_votes`(PK 문제ID+플레이어, 다시 고르면 병합)와 집계 뷰 `question_difficulty`(security_invoker)이고, 어드민 `DifficultyTab`이 뷰를 읽는다. 응답 값 목록은 `src/difficulty.test.ts`가 API와 같은지 검사한다.
- **플레이 결과 공유** — 문제를 끝내면 `PlayShare`가 보인다. `src/share.ts`(순수: `playResultText`, 공개 키별 칸 `shareGrid`, 같은 문제 링크 `questionLink` `?q=문제ID&mode=모드`)와 `src/share-image.ts`(캔버스로 테마 색 결과 카드 PNG). 제목·가사 원문은 텍스트와 이미지 어디에도 넣지 않는다. 휴대폰은 Web Share로 이미지 파일을 보내고(X 앱에서 사진 첨부), 아니면 이미지를 저장하고 X 글쓰기 창을 연다(웹 intent는 이미지를 못 받음). `App`이 시작할 때 `?q=`가 있으면 스토어 `openQuestion`으로 그 문제를 해당 모드의 현재 문제로 열고 쿼리를 지운다.
- **방문 통계** — `App`의 `<Analytics beforeSend={beforeSend} />`(`@vercel/analytics/react`, 게임에만, 어드민 제외). `src/analytics.ts`의 `redactUrl`이 쿼리(`today` 외)와 해시를 지워 OAuth `?code=`가 전송되지 않게 한다. Hobby 요금제라 사용자 지정 이벤트(`track`)는 쓰지 않는다. 대시보드에서 Analytics를 켜야 수집된다.
- **오류 제보** — `ReportLink`(플레이·오늘 패널)와 계정 모달의 버튼이 `ReportModal`을 연다(모달 이름 `report`/`daily-report`/`general-report`, 문제 화면이면 스토어에서 현재 문제 ID를 붙임). `src/report.ts`(종류 `REPORT_KINDS`, `sendReport`) → `api/report.ts`(검증·내용 정리, 토큰 해시 기준 10분 5건 제한) → `reports` 테이블 → 어드민 `ReportsTab`(상태 new/done, 삭제). 종류 목록은 `src/report.test.ts`가 API와 같은지 검사한다. 탈퇴 시 `api/account.ts`가 그 토큰의 제보도 지운다.
- **로그인(선택)** — `src/account/index.ts`(게임 번들: 상태 `useAccount`, `startAccount`는 `main.tsx`에서 호출, 저장된 세션(`lyrics-auth` 키)이나 OAuth 복귀(`?code=`)가 있을 때만 `session.ts`를 불러옴) → `session.ts`(supabase-js PKCE, 카카오·구글, `player_saves` 읽기→합치기→적용→쓰기, 스토어 변경 4초 뒤·탭 숨김 시 재동기화) → `save.ts`(순수: `SaveData`, `mergeSaves`는 max·합집합·먼저 달성한 날짜로 멱등, `resetAt`이 더 나중인 쪽의 기록이 이김, 랭킹 토큰은 계정 것을 따름) / `snapshot.ts`(세 스토어 ↔ `SaveData`, 적용 시 업적 알림 없음). 게임 스토어의 `reset`은 `resetAt`을 갱신한다. 탈퇴는 `api/account.ts`(JWT 확인 → 랭킹 플레이어 삭제 → auth 사용자 삭제, `player_saves`는 cascade). UI는 헤더의 계정 버튼이 여는 `AccountModal`(로그인 `AccountSection`, 랭킹 닉네임 `NicknameForm`, 오류·의견 보내기)이다. 헤더는 도움말·테마·계정 버튼 세 개이고, 360px 미만에서는 테마 버튼이 아이콘만 보인다. 개인정보 처리방침은 `public/privacy.html`(Vercel `/privacy` 리라이트)이고, 서버로 보내거나 저장하는 항목을 바꾸면 이 문서와 `Footer`의 수집 안내도 함께 고친다.
- **테스트의 가짜 저장소** — 스토어를 불러오는 테스트는 `src/testing/fake-storage.ts`를 먼저 import한다. 모든 테스트 파일이 한 프로세스에서 돌고 스토어는 생성 시점의 저장소에 묶이므로, 파일마다 따로 만들면 서로 간섭한다. 공유 스토어(랭킹·난이도 등)에 의존하는 테스트는 시작할 때 필요한 상태를 직접 초기화한다.

## 주의 사항

- 테스트 데이터 원칙: 규칙 테스트는 fixture 사전·곡을 쓰고 실제 데이터 내용(특정 곡명, 개수)에 의존하지 않는다. 어드민에서 데이터를 고쳤다고 게시가 테스트에서 막히면 안 되기 때문이다. 실제 catalog 대상 테스트는 "모든 문제를 완성할 수 있다" 같은 데이터 품질 조건만 검사한다.
- 비밀 값: `SUPABASE_SERVICE_ROLE_KEY`, `VERCEL_DEPLOY_HOOK_URL`에는 절대 `VITE_` 접두사를 붙이지 않는다(브라우저 번들에 노출). `api/publish.ts`는 Vercel이 그대로 번들하도록 로컬 import 없이 fetch만 쓴다.
- `game.ts`/`store.ts`/`src/data/*`/`scripts/*`/테스트는 Node가 직접 실행하므로 서로 `.ts` 확장자를 붙여 import한다(`allowImportingTsExtensions`). Node strip-types가 지원하지 않는 TS 문법(enum, namespace, parameter property 등)은 쓰지 않는다. `engines.node`는 `24.x`(Vercel 빌드 Node 버전 고정). 테스트 파일은 `tsconfig`에서 제외되어 `tsc` 검사를 받지 않는다.
- react-hooks v7 규칙(`set-state-in-effect` 등)이 켜져 있다. 값 변화에 따라 로컬 state를 초기화할 때는 effect 대신 `key` 리마운트를 쓴다.
- zustand v5 셀렉터에서 새 객체·배열을 만들어 반환하면 무한 렌더가 난다. 스토어 필드를 그대로 고르거나 `useShallow`를 쓴다.
- UI 문구, 에러 메시지, 테스트 이름은 한국어로 작성한다.

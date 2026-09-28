# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 개요

NCT 가사 초성 퍼즐 (React 19 · TypeScript · Vite · Zustand, 모바일 대상). 게임은 번들된 데이터로만 동작(네트워크 없음)하고, 데이터는 Supabase에 두고 어드민(`/admin`)에서 관리한다. Vercel에 `dist/`로 배포된다.

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
- **`src/data/rows.ts`** — 데이터 테이블(artists, songs, questions, dictionary) 전체를 1000행 단위로 읽는다. 스크립트(service role)와 어드민(anon + 로그인 세션)이 공유한다.
- **DB 스키마·권한**: `supabase/migrations/*.sql`(이름 순서대로 적용). `artists.name`이 PK이고 `songs.artist`가 이를 참조한다(`on update cascade`, `on delete restrict`). 그래서 가수 이름 변경은 PK update이고, 어드민 store의 `saveArtist`가 로컬 songs도 같이 바꾼다. RLS로 `admins` 테이블에 이메일이 있는 로그인 사용자만 읽고 쓴다. anon은 접근 불가. 빌드·게시 API는 service role 키로 RLS를 우회한다. 스키마를 바꾸면 새 마이그레이션 파일을 추가하고 `build-catalog.ts`의 Row 타입과 `rows.ts`의 컬럼 목록을 함께 고친다.
- **`game.ts`** — 순수 게임 로직. 모듈 로드 시점에 모든 문제를 `tokenize`한다. `tokenize(line, sorted?)`의 두 번째 인자는 사전이므로 `lines.map(tokenize)`처럼 넘기면 안 된다.
- **공개 키 형식**: `"${줄}:${토큰}:${글자인덱스}"` (한글), `"${줄}:${토큰}:en"` (영어 토큰 전체). `matches`, `allKeys`, `progress`, 스토어의 `revealed`, 힌트 로직이 모두 이 형식에 의존한다. 공백·문장부호 토큰은 키가 없어 완성률에서 제외된다.
- `matches` 규칙: 영어는 원문/표시발음/대체발음과 전체 일치해야 공개. 한글은 입력과 토큰 사이 연속 2글자 이상 공통 부분을 공개하고, 1글자 입력은 토큰 전체가 그 글자이거나 해당 토큰이 이미 일부 공개된 경우에만 인정.
- `pickQuestion`: 선택 유닛 안에서 `seen`에 없는 문제 우선, 가능하면 직전과 다른 곡. 풀을 한 바퀴 돌면 `store.next`가 `seen`을 리셋.
- **`store.ts`** — Zustand + `persist`. localStorage 키 `chosung-lyrics-live-v1` (`notice`는 저장 제외). `merge`는 저장된 `round.id`가 현재 catalog에 없으면 저장값을 버리고, 없어진 유닛은 `selected`에서 걸러낸다. 모듈 하단에서 첫 문제를 즉시 저장해 새로고침해도 같은 문제가 유지되게 한다. 예전 키 `chosung-lyrics-v1`은 삭제하지 말고 보존한다.
- **UI** — `main.tsx`는 마운트만 한다. `App.tsx`가 탭(`activeTab`)과 열린 모달(`ModalName`) 상태를 갖고 `components/` 아래를 조립한다.
  - `components/play/*`: 플레이 화면. `PlayPanel`이 `hooks/useRound`(현재 문제·진행률)를 한 번 호출해 하위에 props로 넘기고, 하위 컴포넌트는 스토어 액션만 `useGame((s) => s.xxx)` 셀렉터로 직접 가져온다. 데이터 표시 쪽은 props, 액션은 셀렉터라는 구분을 유지한다.
  - `components/modals/*`: 모달 내용만 담당하고, 공용 `components/Modal.tsx`가 네이티브 `<dialog>` 하나를 열고 닫는다. 모달은 열릴 때마다 새로 마운트되므로 입력 초안 같은 로컬 state는 닫으면 사라진다.
  - 문제별 로컬 state 초기화는 `key={round.id}`로 리마운트해서 처리한다(`WordForm` 참고).
  - `hooks/useModelContextTools`: `document.modelContext`가 있으면 WebMCP 도구(`guess_lyric_word`)를 등록한다.
  - 테마는 `theme.ts`(`lyrics-theme` 키, `data-theme` 속성)에서 관리하며, `useTheme`은 `App`에서만 호출하고 설정 모달에는 props로 넘긴다(여러 곳에서 호출하면 상태가 따로 논다).
  - 한글 IME 조합 중 Enter 제출 방지는 `utils/ime.ts`의 `blockComposingEnter`를 쓴다.
- **어드민** (`admin.html` → `src/admin/`) — 별도 Vite 엔트리(`vite.config.ts`)라 supabase-js는 어드민 번들에만 들어간다. 게임 코드(`src/components`, `game.ts` 등)에서 `src/admin/`이나 supabase-js를 import하지 말 것.
  - `admin/store.ts`(zustand)가 데이터 테이블 전체를 메모리에 들고, 각 액션은 Supabase에 먼저 쓰고 성공하면 로컬 상태를 갱신한다. 에러는 `describeError`로 한국어 메시지로 바꿔 throw한다.
  - `AdminApp`이 `buildCatalog`를 `useMemo`로 돌려 `issues`를 문제 탭·게시 탭에 넘긴다(빌드와 같은 검증).
  - 편집 폼은 `FormDialog`(마운트 시 열림, `onSubmit`에서 throw하면 에러 표시). 곡ID·문제ID·사전 영어(PK)는 생성 후 수정 불가로 두었다. 문제ID는 플레이어 localStorage 진행 기록이 참조한다.
  - 환경 변수가 없으면 `supabase`가 `null`이고 설정 안내 화면만 보인다.

## 주의 사항

- 테스트 데이터 원칙: 규칙 테스트는 fixture 사전·곡을 쓰고 실제 데이터 내용(특정 곡명, 개수)에 의존하지 않는다. 어드민에서 데이터를 고쳤다고 게시가 테스트에서 막히면 안 되기 때문이다. 실제 catalog 대상 테스트는 "모든 문제를 완성할 수 있다" 같은 데이터 품질 조건만 검사한다.
- 비밀 값: `SUPABASE_SERVICE_ROLE_KEY`, `VERCEL_DEPLOY_HOOK_URL`에는 절대 `VITE_` 접두사를 붙이지 않는다(브라우저 번들에 노출). `api/publish.ts`는 Vercel이 그대로 번들하도록 로컬 import 없이 fetch만 쓴다.
- `game.ts`/`store.ts`/`src/data/*`/`scripts/*`/테스트는 Node가 직접 실행하므로 서로 `.ts` 확장자를 붙여 import한다(`allowImportingTsExtensions`). Node strip-types가 지원하지 않는 TS 문법(enum, namespace, parameter property 등)은 쓰지 않는다. `engines.node`는 `24.x`(Vercel 빌드 Node 버전 고정). 테스트 파일은 `tsconfig`에서 제외되어 `tsc` 검사를 받지 않는다.
- react-hooks v7 규칙(`set-state-in-effect` 등)이 켜져 있다. 값 변화에 따라 로컬 state를 초기화할 때는 effect 대신 `key` 리마운트를 쓴다.
- zustand v5 셀렉터에서 새 객체·배열을 만들어 반환하면 무한 렌더가 난다. 스토어 필드를 그대로 고르거나 `useShallow`를 쓴다.
- UI 문구, 에러 메시지, 테스트 이름은 한국어로 작성한다.

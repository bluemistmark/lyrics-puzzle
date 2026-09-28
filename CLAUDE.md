# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 개요

NCT 가사 초성 퍼즐 (React 19 · TypeScript · Vite · Zustand, 모바일 대상). 백엔드 없이 번들된 데이터로만 동작하며 Vercel에 `dist/`로 배포된다.

## 명령어

- `npm run dev` — Vite 개발 서버 (127.0.0.1)
- `npm test` — Node 내장 test runner + `--experimental-strip-types`로 `src/game.test.ts`, `src/store.test.ts`를 직접 실행 (빌드/번들러 없음)
- 단일 테스트: `node --experimental-strip-types --test --test-isolation=none --test-name-pattern="제목 정답" src/store.test.ts`
- `npm run build` — `tsc --noEmit` 타입 체크 후 `vite build`
- `npm run lint` / `npm run lint:fix` — ESLint (flat config `eslint.config.js`: typescript-eslint recommended + react-hooks recommended + eslint-config-prettier)
- `npm run format` / `npm run format:check` — Prettier (기본 설정). `src/catalog.ts`, `data/`, `package-lock.json`은 포맷·린트 대상에서 제외
- `npm run data:refresh` — 구글 시트(가사 gid=0, 영어 사전 gid=230201622)를 CSV로 받아 `data/*.csv` 갱신 → `import-data.mjs` 실행 → `game.ts` 로드 확인. 실패 시 CSV와 `catalog.ts`를 원래대로 복원
- `npm run data:import` — 이미 저장된 `data/*.csv`만으로 `src/catalog.ts` 재생성

코드 변경 후에는 `npm run format`, `npm run lint`, `npm test`, `npm run build`를 실행한다.

## 아키텍처

데이터 흐름: 구글 시트 → `data/lyrics.csv`, `data/dictionary.csv` (스냅샷) → `scripts/import-data.mjs` (검증 + 변환) → `src/catalog.ts` (생성 파일) → `src/game.ts` → `src/store.ts` → `src/main.tsx`.

- **`src/catalog.ts`는 생성 파일**이므로 직접 수정하지 말고 CSV를 고친 뒤 `data:import`를 실행한다. 원본 시트는 수정하지 않는다.
- `import-data.mjs`는 필수 컬럼, 문제ID 중복, 곡ID 충돌, `사용여부`(Y/N), 표시발음 누락, 가사 속 사전 미등록 영어 단어를 검사하고 하나라도 걸리면 예외를 던진다. `사용여부=Y`인 행만 문제가 되고, 문제가 하나라도 있는 곡만 `songs`에 들어간다.
- **`game.ts`** — 순수 게임 로직. 모듈 로드 시점에 모든 문제를 `tokenize`한다. 사전 항목은 긴 것부터 매칭하고 앞뒤가 라틴 문자가 아닐 때만 인정한다. 사전에 없는 영어가 있으면 `tokenize`가 throw하므로 import 스크립트와 동일한 매칭 규칙(`englishKey`, `latin`)을 두 곳에서 맞춰 유지해야 한다.
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

## 주의 사항

- `game.test.ts`는 전체 데이터 개수(문제 642, 곡 165, 사전 525)와 유닛 목록을 하드코딩해 검사한다. 시트 데이터가 바뀌면 이 값과 README의 수치를 함께 갱신한다.
- `game.ts`/`store.ts`/테스트는 Node가 직접 실행하므로 `.ts` 확장자를 붙여 import한다(`allowImportingTsExtensions`). Node strip-types가 지원하지 않는 TS 문법(enum, namespace, parameter property 등)은 쓰지 않는다. 테스트 파일은 `tsconfig`에서 제외되어 `tsc` 검사를 받지 않는다.
- react-hooks v7 규칙(`set-state-in-effect` 등)이 켜져 있다. 값 변화에 따라 로컬 state를 초기화할 때는 effect 대신 `key` 리마운트를 쓴다.
- zustand v5 셀렉터에서 새 객체·배열을 만들어 반환하면 무한 렌더가 난다. 스토어 필드를 그대로 고르거나 `useShallow`를 쓴다.
- UI 문구, 에러 메시지, 테스트 이름은 한국어로 작성한다.

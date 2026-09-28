# 초성 가사 맞히기

React · TypeScript · Vite · Zustand 기반 모바일 가사 퍼즐.

## 실행 및 검증

- `npm install`
- `npm run dev` — 게임: `/`, 어드민: `/admin.html`
- `npm test`
- `npm run lint`, `npm run format`
- `npm run build`

## 데이터 관리

곡·문제·영어 사전은 Supabase(Postgres)에 저장하고 어드민(`/admin`)에서 추가·수정·삭제합니다. 게임은 DB를 직접 읽지 않습니다. 빌드할 때 DB 내용을 `src/catalog.ts`로 받아 번들에 넣으므로, 플레이 중에는 로그인이나 네트워크 요청이 없습니다.

```
어드민에서 저장 → Supabase에 즉시 저장 (게임에는 아직 반영 안 됨)
어드민 "게시" → /api/publish (관리자 확인) → Vercel Deploy Hook
  → Vercel 빌드: data:pull(DB → catalog.ts, 검증) → npm test → npm run build → 배포
```

빌드 중 검증이나 테스트가 실패하면 배포되지 않고 기존 버전이 그대로 유지됩니다. 어드민의 게시 탭은 빌드와 같은 검증을 미리 보여 주며, 오류가 있으면 게시 버튼이 비활성화됩니다. `main`에 코드를 push해도 같은 방식으로 DB에서 최신 데이터를 받아 빌드합니다.

저장소의 `src/catalog.ts`는 로컬 개발·테스트용 스냅샷입니다. 로컬에서 최신 DB로 갱신하려면 `npm run data:pull`을 실행하세요(서비스 키 필요).

### 최초 설정

1. **Supabase 프로젝트 생성** 후 SQL Editor에서 [supabase/migrations/20260928000000_init.sql](supabase/migrations/20260928000000_init.sql)을 실행합니다.
2. **관리자 계정**: Authentication > Users > Add user로 이메일·비밀번호 계정을 만들고, SQL Editor에서 `insert into public.admins (email) values ('이메일');`을 실행합니다. Authentication 설정에서 새 가입(Allow new users to sign up)은 꺼 두는 것을 권장합니다. 가입하더라도 `admins`에 없으면 데이터에 접근할 수 없습니다.
3. **환경 변수**: [.env.example](.env.example)을 `.env.local`로 복사해 값을 채우고, Vercel > Project Settings > Environment Variables에도 같은 이름으로 등록합니다(Production, Preview).
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`: 어드민 화면용. 공개돼도 되는 값이며, Vite가 `VITE_`로 시작하는 변수만 브라우저에 넘겨주므로 **이 두 개는 접두사가 반드시 있어야** 합니다.
   - `SUPABASE_SERVICE_ROLE_KEY`: 빌드와 게시 API 전용 비밀 키입니다. **`VITE_` 접두사를 붙이면 브라우저 번들에 노출되니 절대 붙이지 마세요.** 노출된 적이 있으면 Supabase에서 즉시 재발급하세요.
   - `VERCEL_DEPLOY_HOOK_URL`: Vercel > Project Settings > Git > Deploy Hooks에서 `main` 브랜치용으로 만든 URL. 이것도 비밀 값입니다.
4. **기존 시트 데이터 옮기기**(한 번만): `npm run data:seed -- --dry-run`으로 검증한 뒤 `npm run data:seed`를 실행합니다. `data/*.csv`(시트 스냅샷)를 읽어 사용 여부가 N인 문제까지 모두 옮깁니다. 테이블에 데이터가 있으면 멈추며, 덮어쓰려면 `--overwrite`를 붙입니다(같은 ID는 덮어쓰고, 지우지는 않음).
5. 옮긴 뒤에는 구글 시트를 더 이상 쓰지 않습니다. `data/`, `scripts/seed-supabase.ts`, `scripts/sheet-rows.ts`는 삭제해도 됩니다.

게시 API는 Vercel 함수(`api/publish.ts`)라 로컬 `npm run dev`에서는 동작하지 않습니다. 배포된 사이트나 `vercel dev`에서 사용하세요.

### 데이터 규칙

- **곡**: 곡ID, 가수명, 곡명, 정답 별칭(선택), 정렬 순서. 곡과 가수(유닛) 표시 순서는 정렬 순서를 따릅니다. 사용 중인 문제가 하나라도 있는 곡만 게임에 나옵니다. 곡을 삭제하면 그 곡의 문제도 함께 삭제됩니다.
- **문제**: 문제ID, 곡, 가사1·가사2(필수), 가사3(선택), 출제 사용 여부. 사용 중인 문제만 출제합니다. ID는 저장 후 바꿀 수 없습니다(플레이어의 진행 기록이 ID를 참조합니다).
- **영어 사전**: 영어(단어 또는 구절), 표시발음, 추가 허용 발음. 가사에 사전에 없는 영어가 있으면 게시할 수 없습니다. 문제 편집 창에서 누락된 단어를 바로 사전에 추가할 수 있습니다.
- 영어는 앞뒤 공백을 제거하고, 대소문자와 곧은/둥근 아포스트로피를 정규화하며, 긴 구절을 먼저 매칭합니다. 구절 항목은 전체 영어 구절 또는 등록 발음으로 맞힙니다. 문장부호와 공백은 그대로 표시하며 완성률 계산에서 제외합니다.
- 곡ID는 곡 단위, 문제ID는 출제 구간 단위입니다. 가능한 경우 같은 곡 연속 출제를 피하며, 한 바퀴를 돌기 전에는 같은 문제를 다시 출제하지 않습니다.
- 제목은 공식 전체 제목, 괄호를 제외한 제목, 괄호 안 제목 및 등록 별칭을 인정합니다. 제목을 맞힌 뒤에도 가사를 끝까지 복원할 수 있습니다.

## 브라우저 기록

플레이·기록 탭에서 문제와 누적 기록을 확인합니다. 가수 선택과 화면 모드는 설정에서 바꿀 수 있습니다. 기록과 진행 중인 문제는 `chosung-lyrics-live-v1`에 저장합니다. 예제 기록 `chosung-lyrics-v1`은 삭제하지 않고 별도로 보존합니다. 제목 정답, 가사 완성, 연속 정답을 기록하며 로그인은 필요하지 않습니다.

한글 단어 추측은 입력과 가사 사이의 연속 두 글자 이상 공통 부분을 공개합니다. 예: `마음이` 입력 → 가사 `마음을`의 `마음` 공개. 한 글자 입력은 독립된 단어와 일치하거나 해당 단어가 이미 일부 공개됐을 때 인정합니다. 따라서 이후 `을`을 입력해 `마음을` 완성할 수 있습니다. 영어는 원문/발음 사전 항목 전체가 일치해야 공개합니다.

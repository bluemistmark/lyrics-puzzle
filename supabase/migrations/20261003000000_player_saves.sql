-- 로그인한 플레이어의 기록 저장소 (기기 간 동기화).
-- Supabase 대시보드 > SQL Editor에서 한 번 실행합니다. (20261002000000_difficulty.sql 다음)
-- 게임이 로그인 세션(anon 키 + 사용자 JWT)으로 자기 행만 읽고 씁니다. 형식은 src/account/save.ts의 SaveData.
-- 구글·카카오 로그인 설정은 README의 "로그인" 절을 참고하세요.

create table public.player_saves (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- 기록·도감·업적·오늘의 문제 기록·난이도 응답과 랭킹 토큰·닉네임. 토큰이 들어 있으므로 본인만 읽습니다.
  data jsonb not null check (pg_column_size(data) < 512000),
  updated_at timestamptz not null default now()
);
create trigger player_saves_touch before update on public.player_saves
  for each row execute function public.touch_updated_at();

alter table public.player_saves enable row level security;
create policy "own save: read" on public.player_saves
  for select to authenticated using (user_id = auth.uid());
create policy "own save: insert" on public.player_saves
  for insert to authenticated with check (user_id = auth.uid());
create policy "own save: update" on public.player_saves
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Supabase 기본 권한(새 테이블에 anon·authenticated 전체 허용)을 먼저 걷어 냅니다. 삭제는 탈퇴 API(service role)만.
revoke all on public.player_saves from anon, authenticated;
grant select, insert, update on public.player_saves to authenticated;
grant all on public.player_saves to service_role;

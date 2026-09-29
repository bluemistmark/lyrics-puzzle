-- 오류 제보: 게임에서 보낸 가사 오타·정답 인정·버그 제보. 어드민 "제보" 탭에서 확인합니다.
-- Supabase 대시보드 > SQL Editor에서 한 번 실행합니다. (20261003000000_player_saves.sql 다음)
-- 게임은 직접 쓰지 않습니다. /api/report가 service role 키로만 씁니다. 연락처는 받지 않습니다.

create table public.reports (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  -- 종류 값은 src/report.ts의 REPORT_KINDS와 같습니다.
  kind text not null check (kind in ('lyrics', 'answer', 'bug', 'other')),
  message text not null check (char_length(message) between 1 and 1000),
  -- 문제 화면에서 보낸 경우의 문제 ID와 모드. 문제가 지워져도 제보는 남도록 외래 키를 두지 않습니다.
  question_id text,
  mode text check (mode in ('play', 'daily')),
  -- 반복 제보 제한용 무작위 식별값의 해시(players.id와 같은 방식). 탈퇴하면 /api/account가 함께 지웁니다.
  player_id text not null check (player_id ~ '^[0-9a-f]{64}$'),
  status text not null default 'new' check (status in ('new', 'done'))
);
create index reports_created_at_idx on public.reports (created_at desc);
create index reports_player_idx on public.reports (player_id, created_at desc);

alter table public.reports enable row level security;
create policy "admins manage reports" on public.reports
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Supabase 기본 권한(새 테이블에 anon·authenticated 전체 허용)을 먼저 걷어 냅니다.
revoke all on public.reports from anon, authenticated;
grant select, update, delete on public.reports to authenticated;
grant all on public.reports to service_role;

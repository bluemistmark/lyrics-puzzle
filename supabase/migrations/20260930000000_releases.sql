-- 게시 기록: 게임의 "소식" 탭에 보여 줄 업데이트 내역입니다.
-- Supabase 대시보드 > SQL Editor에서 한 번 실행합니다. (20260929000000_artists.sql 다음)
-- 게시 API(api/publish.ts)가 service role 키로 한 행씩 추가하고, 빌드가 최근 행을 번들에 넣습니다.

create table public.releases (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  -- 새 기능 소개 (한 줄에 하나)
  features text[] not null default '{}',
  -- 자유 메모 (공지, 이벤트 등)
  note text not null default '',
  -- 지난 게시 이후 새로 게임에 나온 곡: [{"id", "title", "artist"}]
  added_songs jsonb not null default '[]'::jsonb,
  added_questions integer not null default 0 check (added_questions >= 0),
  removed_questions integer not null default 0 check (removed_questions >= 0),
  -- 이번에 게시한 곡·문제 ID. 다음 게시 때 무엇이 새로 들어왔는지 비교하는 기준입니다.
  song_ids text[] not null default '{}',
  question_ids text[] not null default '{}'
);

alter table public.releases enable row level security;
create policy "admins manage releases" on public.releases
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on public.releases from anon;
grant select, insert, update, delete on public.releases to authenticated;
grant all on public.releases to service_role;

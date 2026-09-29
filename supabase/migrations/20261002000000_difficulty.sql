-- 체감 난이도 응답: 문제를 끝낸 뒤 쉬워요/보통이에요/어려워요.
-- Supabase 대시보드 > SQL Editor에서 한 번 실행합니다. (20261001000000_ranking.sql 다음 — players 테이블 필요)
-- 게임은 직접 쓰지 않습니다. /api/difficulty가 service role 키로만 씁니다.

create table public.difficulty_votes (
  question_id text not null references public.questions (id) on update cascade on delete cascade,
  player_id text not null references public.players (id) on delete cascade,
  rating text not null check (rating in ('easy', 'normal', 'hard')),
  -- 응답한 사람이 제목을 맞혔는지(false면 포기), 어느 모드에서 풀었는지
  solved boolean not null,
  mode text not null check (mode in ('play', 'daily')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- 한 사람이 한 문제에 한 표. 다시 고르면 바뀝니다.
  primary key (question_id, player_id)
);
create trigger difficulty_votes_touch before update on public.difficulty_votes
  for each row execute function public.touch_updated_at();

-- 어드민 "난이도" 탭용 문제별 집계. security_invoker라 읽는 사람의 RLS가 그대로 적용됩니다.
create view public.question_difficulty with (security_invoker = true) as
select
  question_id,
  count(*) filter (where rating = 'easy') as easy,
  count(*) filter (where rating = 'normal') as normal,
  count(*) filter (where rating = 'hard') as hard,
  count(*) filter (where not solved) as gave_up,
  count(*) as total
from public.difficulty_votes
group by question_id;

alter table public.difficulty_votes enable row level security;
create policy "admins read difficulty votes" on public.difficulty_votes
  for select to authenticated using (public.is_admin());

-- Supabase 기본 권한(새 테이블에 anon·authenticated 전체 허용)을 먼저 걷어 냅니다.
revoke all on public.difficulty_votes, public.question_difficulty from anon, authenticated;
grant select on public.difficulty_votes, public.question_difficulty to authenticated;
grant all on public.difficulty_votes to service_role;
grant select on public.question_difficulty to service_role;

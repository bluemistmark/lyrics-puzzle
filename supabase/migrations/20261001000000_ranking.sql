-- 오늘의 문제 일간 랭킹.
-- Supabase 대시보드 > SQL Editor에서 한 번 실행합니다. (20260930000000_releases.sql 다음)
-- 게임은 이 테이블을 직접 읽거나 쓰지 않습니다. /api/ranking이 service role 키로만 접근합니다.

-- 로그인 없는 플레이어. id는 브라우저가 가진 무작위 토큰의 SHA-256(hex)이라 토큰 없이는 대신 쓸 수 없습니다.
create table public.players (
  id text primary key check (id ~ '^[0-9a-f]{64}$'),
  -- 비어 있으면 순위 목록에 나오지 않고 참여자 수에만 들어갑니다. (전체 규칙은 src/nickname.ts)
  nickname text check (nickname is null or char_length(nickname) between 2 and 12),
  -- 어드민이 부적절한 닉네임을 숨깁니다. 숨겨도 참여자 수에는 남습니다.
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);

-- 하루 한 번, 처음 끝낸(정답 또는 포기) 결과만 저장합니다.
create table public.daily_scores (
  date date not null,
  player_id text not null references public.players (id) on delete cascade,
  solved boolean not null,
  guesses integer not null check (guesses between 0 and 1000),
  hints integer not null check (hints between 0 and 100),
  created_at timestamptz not null default now(),
  primary key (date, player_id)
);

-- 순위: 제목 정답자 중 닉네임이 있고 숨겨지지 않은 사람을 힌트 → 입력 수 → 제출 시각 순으로.
create function public.daily_ranking(p_date date, p_player text, p_limit integer default 50)
returns jsonb
language sql stable security definer set search_path = '' as $$
  with scores as (
    select s.player_id, s.solved, s.hints, s.guesses, s.created_at, p.nickname, p.hidden
    from public.daily_scores s
    join public.players p on p.id = s.player_id
    where s.date = p_date
  ),
  ranked as (
    select player_id, nickname, hints, guesses,
      row_number() over (order by hints, guesses, created_at) as rank
    from scores
    where solved and nickname is not null and not hidden
  )
  select jsonb_build_object(
    'participants', (select count(*) from scores),
    'solved', (select count(*) from scores where solved),
    'entries', coalesce((
      select jsonb_agg(jsonb_build_object(
        'rank', rank, 'nickname', nickname, 'hints', hints, 'guesses', guesses,
        'me', player_id = p_player
      ) order by rank)
      from (select * from ranked order by rank limit p_limit) top
    ), '[]'::jsonb),
    'me', (
      select jsonb_build_object('rank', rank, 'hints', hints, 'guesses', guesses)
      from ranked where player_id = p_player
    )
  );
$$;

alter table public.players enable row level security;
alter table public.daily_scores enable row level security;
create policy "admins read players" on public.players
  for select to authenticated using (public.is_admin());
create policy "admins hide players" on public.players
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins read daily scores" on public.daily_scores
  for select to authenticated using (public.is_admin());

-- Supabase 기본 권한(새 테이블에 anon·authenticated 전체 허용)을 먼저 걷어 냅니다.
revoke all on public.players, public.daily_scores from anon, authenticated;
grant select on public.players, public.daily_scores to authenticated;
-- 어드민은 숨김 여부만 바꿀 수 있습니다.
grant update (hidden) on public.players to authenticated;
grant all on public.players, public.daily_scores to service_role;
revoke all on function public.daily_ranking(date, text, integer) from public, anon, authenticated;
grant execute on function public.daily_ranking(date, text, integer) to service_role;

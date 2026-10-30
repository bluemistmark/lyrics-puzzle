-- 업적 달성률: 플레이어마다 달성한 업적 ID만 남깁니다(언제 달성했는지는 남기지 않음). 업적 시트가 "플레이어의 n%가 달성"을 보여 줍니다.
-- 플레이어는 랭킹과 같은 익명 토큰의 해시(players)이고, 게임이 /api/achievements로 보냅니다. 탈퇴로 players 행이 지워지면 함께 지워집니다.
-- 분모는 업적을 하나 이상 보낸 플레이어 수입니다.
-- Supabase 대시보드 > SQL Editor에서 한 번 실행합니다. (20261101000000_album_artist.sql 다음)
create table public.achievement_unlocks (
  player_id text not null references public.players (id) on delete cascade,
  achievement_id text not null check (char_length(achievement_id) between 1 and 80),
  created_at timestamptz not null default now(),
  primary key (player_id, achievement_id)
);
create index achievement_unlocks_achievement_idx on public.achievement_unlocks (achievement_id);

-- { total: 플레이어 수, counts: { 업적ID: 달성한 플레이어 수 } }
create function public.achievement_rates() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'total', (select count(distinct player_id) from public.achievement_unlocks),
    'counts', coalesce(
      (select jsonb_object_agg(achievement_id, n)
       from (select achievement_id, count(*) as n
             from public.achievement_unlocks group by achievement_id) t),
      '{}'::jsonb
    )
  )
$$;

alter table public.achievement_unlocks enable row level security;
revoke all on public.achievement_unlocks from anon, authenticated;
grant all on public.achievement_unlocks to service_role;
revoke all on function public.achievement_rates() from public, anon, authenticated;
grant execute on function public.achievement_rates() to service_role;

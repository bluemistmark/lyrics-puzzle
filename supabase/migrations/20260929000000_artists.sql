-- 가수(유닛) 테이블: 곡ID 접두어와 유닛 표시 순서를 관리합니다.
-- Supabase 대시보드 > SQL Editor에서 한 번 실행합니다. (20260928000000_init.sql 다음)

create table public.artists (
  name text primary key check (name <> ''),
  -- 새 곡ID 제안에 쓰는 접두어 (예: D → D_073). 바꿔도 기존 곡ID는 그대로입니다.
  prefix text not null unique check (prefix ~ '^[A-Za-z0-9]+$'),
  -- 게임의 유닛 표시 순서와 곡 정렬의 1차 기준
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);
create trigger artists_touch before update on public.artists
  for each row execute function public.touch_updated_at();

-- 기존 곡에서 가수를 채웁니다. 접두어는 그 가수 곡ID에서 가장 많이 쓰인 '_' 앞부분,
-- 순서는 지금까지의 유닛 표시 순서(곡 sort_order가 가장 앞선 순)와 같습니다.
insert into public.artists (name, prefix, sort_order)
select
  artist,
  mode() within group (order by split_part(id, '_', 1)),
  row_number() over (order by min(sort_order)) - 1
from public.songs
group by artist;

-- 가수 이름을 바꾸면 곡에도 반영되고, 곡이 남아 있는 가수는 삭제할 수 없습니다.
alter table public.songs
  add constraint songs_artist_fkey foreign key (artist)
  references public.artists (name) on update cascade on delete restrict;

alter table public.artists enable row level security;
create policy "admins manage artists" on public.artists
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on public.artists from anon;
grant select, insert, update, delete on public.artists to authenticated;
grant all on public.artists to service_role;

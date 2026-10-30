-- 앨범: 곡을 앨범으로 묶습니다. 앨범명·종류·발매일·커버는 앨범에 두고, 곡은 album_id로 가리킵니다(타이틀곡 여부는 곡에 남음).
-- 어드민 곡 탭의 "자동 채우기"가 Deezer·iTunes에서 찾아 채우고, 앨범 탭에서 고칩니다. 게임 번들(catalog)에는 넣지 않습니다
-- (커버만 앨범아트 수집이 씀).
-- Supabase 대시보드 > SQL Editor에서 한 번 실행합니다. (20261030000000_song_artwork.sql 다음)
-- 기존 곡의 앨범명·발매일은 (가수, 앨범명)마다 앨범 하나로 옮기고, songs의 album·released_on 컬럼은 지웁니다.
create table public.albums (
  id bigint generated always as identity primary key,
  title text not null check (title <> ''),
  -- 표기된 가수(예: NCT 2020 앨범은 "NCT"). 곡의 가수와 다를 수 있어 artists를 참조하지 않습니다.
  artist text not null default '',
  kind text not null default '' check (kind in ('', 'album', 'ep', 'single', 'compile')),
  released_on date,
  cover_url text not null default '',
  -- 자동으로 찾은 앨범의 출처(예: deezer:305127287). 같은 앨범을 두 번 만들지 않게 씁니다.
  external_id text not null default '',
  updated_at timestamptz not null default now()
);
create unique index albums_external_id_idx on public.albums (external_id) where external_id <> '';

create trigger albums_updated_at before update on public.albums
  for each row execute function public.touch_updated_at();
create trigger albums_audit after insert or update or delete on public.albums
  for each row execute function public.audit_row('id');

alter table public.songs
  add column album_id bigint references public.albums(id) on delete set null;
create index songs_album_id_idx on public.songs (album_id);

-- 기존 데이터 옮기기: (가수, 앨범명)마다 앨범 하나, 발매일은 그중 가장 이른 날.
insert into public.albums (title, artist, released_on)
select album, artist, min(released_on)
from public.songs
where album <> ''
group by artist, album;

update public.songs s
set album_id = a.id
from public.albums a
where s.album <> '' and a.title = s.album and a.artist = s.artist;

alter table public.songs drop column album, drop column released_on;

alter table public.albums enable row level security;
create policy "admins manage albums" on public.albums
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

revoke all on public.albums from anon;
grant select, insert, update, delete on public.albums to authenticated;
grant all on public.albums to service_role;

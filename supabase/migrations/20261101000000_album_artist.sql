-- 앨범 가수: albums.artist를 표기 이름(글자)에서 가수 탭의 가수(artists.name)를 가리키는 칸으로 바꿉니다.
-- 한 가수의 앨범은 그 가수, NCT 2020·SMTOWN처럼 여러 가수의 곡이 섞인 앨범은 비워 둡니다(null).
-- 가수 이름을 바꾸면 따라 바뀌고, 가수를 지우면 비워집니다.
-- Supabase 대시보드 > SQL Editor에서 한 번 실행합니다. (20261031000000_albums.sql 다음)
alter table public.albums
  add column artist_name text references public.artists(name) on update cascade on delete set null;

-- 표기 이름이 가수 탭의 가수와 같은 앨범만 그 가수로 잇고, 나머지("NCT" 등)는 비워 둡니다.
update public.albums a
set artist_name = r.name
from public.artists r
where lower(a.artist) = lower(r.name);

alter table public.albums drop column artist;
alter table public.albums rename column artist_name to artist;
create index albums_artist_idx on public.albums (artist);

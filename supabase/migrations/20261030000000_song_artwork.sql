-- 앨범아트: 곡마다 Deezer 검색으로 찾은 커버 주소. 게시 빌드(scripts/artwork.ts)가 행이 없는 곡을 찾아 채우고,
-- 이미지를 내려받아 빌드에 함께 배포합니다(게임은 다른 서버에 이미지를 요청하지 않음).
-- Supabase 대시보드 > SQL Editor에서 한 번 실행합니다. (20261010000000_song_details.sql 다음)
-- url이 빈 문자열이면 찾지 못한 곡이고, 14일 뒤 빌드에서 다시 찾습니다.
-- 어드민 곡 편집에서 주소를 넣으면 manual이 되어 자동 수집이 덮어쓰지 않고, 비우면 행을 지워 다음 빌드에서 다시 찾습니다.
-- 빌드가 매번 쓰는 캐시라서 변경 이력(audit_row) 트리거는 붙이지 않습니다.
create table public.song_artwork (
  song_id text primary key references public.songs(id) on update cascade on delete cascade,
  url text not null default '',
  manual boolean not null default false,
  checked_at timestamptz not null default now()
);

alter table public.song_artwork enable row level security;
create policy "admins manage song artwork" on public.song_artwork
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

revoke all on public.song_artwork from anon;
grant select, insert, update, delete on public.song_artwork to authenticated;
grant all on public.song_artwork to service_role;

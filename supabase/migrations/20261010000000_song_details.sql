-- 곡 상세 정보: 앨범명, 타이틀곡 여부, 발매일(모두 선택). 지금은 어드민에서만 쓰며 게임 번들(catalog)에는 넣지 않습니다.
-- Supabase 대시보드 > SQL Editor에서 한 번 실행합니다. (20261009000000_game_settings.sql 다음)

alter table public.songs
  add column album text not null default '',
  add column title_track boolean not null default false,
  add column released_on date;
